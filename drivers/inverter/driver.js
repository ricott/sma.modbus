'use strict';

const { Driver } = require('homey');
const InverterDiscovery = require('../../lib/devices/inverterDiscovery.js');
const Inverter = require('../../lib/devices/inverter.js');
const decodeData = require('../../lib/modbus/decodeData.js');

class InverterDriver extends Driver {

    async onInit() {
        this.log('Inverter driver has been initialized');

        //First time app starts, set default port to 502.
        if (!this.homey.settings.get('port')) {
            this.homey.settings.set('port', 502);
        }

        this._registerFlows();
    }

    async triggerInverterStatusChanged(device, tokens) {
        await this._inverter_status_changed.trigger(device, {}, tokens).catch(error => { this.error(error) });
    }

    async triggerInverterConditionChanged(device, tokens) {
        await this._inverter_condition_changed.trigger(device, {}, tokens).catch(error => { this.error(error) });
    }

    _registerFlows() {
        this.log('Registering flows');

        // Register device triggers
        this._inverter_status_changed = this.homey.flow.getDeviceTriggerCard('inverter_status_changed');
        this._inverter_condition_changed = this.homey.flow.getDeviceTriggerCard('inverter_condition_changed');

        const isInverterDailyYield = this.homey.flow.getConditionCard('isInverterDailyYield');
        isInverterDailyYield.registerRunListener(async (args, state) => {
            this.log(`[${args.device.getName()}] Condition 'isInverterDailyYield' triggered`);
            this.log(`[${args.device.getName()}] - inverter.dailyYield: ${args.device.getCapabilityValue('meter_power')}`);
            this.log(`[${args.device.getName()}] - parameter yield: '${args.daily_yield}'`);

            if (args.device.getCapabilityValue('meter_power') > args.daily_yield) {
                return true;
            } else {
                return false;
            }
        });

        const isInverterStatus = this.homey.flow.getConditionCard('isInverterStatus');
        isInverterStatus.registerRunListener(async (args, state) => {
            this.log(`[${args.device.getName()}] Condition 'isInverterStatus' triggered`);
            this.log(`[${args.device.getName()}] - inverter.status: ${args.device.getCapabilityValue('operational_status')}`);
            this.log(`[${args.device.getName()}] - parameter status: '${args.inverter_status}'`);

            if (args.device.getCapabilityValue('operational_status').indexOf(args.inverter_status) > -1) {
                return true;
            } else {
                return false;
            }
        });

        const power_condition = this.homey.flow.getConditionCard('power_condition');
        power_condition.registerRunListener(async (args, state) => {
            this.log(`[${args.device.getName()}] Condition 'power_condition' triggered`);
            let power = args.device.getCapabilityValue('measure_power');
            this.log(`- inverter.power: ${power}`);
            this.log(`- parameter power: '${args.power}'`);

            if (power < args.power) {
                return true;
            } else {
                return false;
            }
        });

        const set_target_power = this.homey.flow.getActionCard('set_target_power');
        set_target_power.registerRunListener(async (args) => {
            this.log(`[${args.device.getName()}] Action 'set_target_power' triggered`);
            this.log(`[${args.device.getName()}] - power: '${args.power}'`);

            // Adjust active power to be <= max power
            const activePower = Math.min(Number(args.device.getSetting('maxPower')), args.power);
            return args.device.smaApi.setMaxActivePowerOutput(activePower)
                .then(function (result) {
                    return Promise.resolve(true);
                }).catch(reason => {
                    return Promise.reject(`Failed to set the active power output. Reason: ${reason.message}`);
                });
        });
    }

    isNewInverter(inverterId) {
        let foundNewInverter = true;
        for (const inverter of this.getDevices()) {
            this.log(`Comparing Inverter ID found '${inverterId}' with existing Inverter ID '${inverter.getData().id}'`);
            if (inverterId == inverter.getData().id) {
                foundNewInverter = false;
                break;
            }
        }
        return foundNewInverter;
    }

    async onPair(session) {
        let devices = [];
        let mode;
        let settings;

        session.setHandler('showView', async (view) => {
            this.log(`Showing view '${view}'`);

            if (view === 'loading') {
                mode = 'discovery';
                //Make sure devices array is empty
                devices.splice(0, devices.length);

                //Discover devices using multicast query
                const discoveryQuery = new InverterDiscovery({
                    port: this.homey.settings.get('port'),
                    device: this
                });

                try {
                    const inverterInfos = await discoveryQuery.discover();

                    // Process each discovered inverter
                    for (const inverterInfo of inverterInfos) {
                        // 8001: Solar Inverters (DevClss1)
                        // 8009: Hybrid inverter (DevClss9)
                        if (inverterInfo.deviceClass == 8001 ||
                            inverterInfo.deviceClass == 8009) {
                            if (this.isNewInverter(inverterInfo.serialNo)) {
                                this.log(`Adding to devices: ${inverterInfo.deviceType}`);
                                devices.push({
                                    name: inverterInfo.deviceType,
                                    data: {
                                        id: inverterInfo.serialNo
                                    },
                                    settings: {
                                        address: inverterInfo.address,
                                        port: Number(inverterInfo.port),
                                        deviceClass: decodeData.decodeDeviceClass(inverterInfo.deviceClass)
                                    }
                                });
                            } else {
                                this.log(`Found inverter '${inverterInfo.serialNo}' that is already added to Homey, ignoring it ...`);
                            }
                        } else {
                            this.log('Found a SMA device that is not an inverter', inverterInfo);
                        }
                    }

                    if (devices.length === 0) {
                        this.log('No (new) inverters found using auto-discovery, show manual entry');
                        await session.showView('settings');
                    } else {
                        this.log(`Found '${devices.length}' inverter(s)`);
                        await session.showView('list_devices');
                    }
                } catch (error) {
                    this.log('Auto-discovery failed, showing manual entry', error);
                    await session.showView('settings');
                }
            }
        });

        session.setHandler('settings', async (data) => {
            mode = 'manual';
            settings = data;
            //Make sure devices array is empty
            devices.splice(0, devices.length);

            const smaSession = new Inverter({
                host: settings.address,
                port: this.homey.settings.get('port'),
                autoClose: true,
                device: this
            });

            try {
                await new Promise((resolve, reject) => {
                    smaSession.on('properties', inverterProperties => {
                        this.log(`Adding to devices: ${inverterProperties.deviceType}`);
                        devices.push({
                            name: inverterProperties.deviceType,
                            data: {
                                id: inverterProperties.serialNo
                            },
                            settings: {
                                address: settings.address,
                                port: Number(this.homey.settings.get('port'))
                            }
                        });
                        resolve();
                    });

                    smaSession.on('error', error => {
                        this.log('Failed to read inverter properties', error);
                        reject(error);
                    });
                });

                await session.showView('list_devices');
            } catch (error) {
                throw new Error('Wrong IP number or port, no SMA inverter found');
            }
        });

        session.setHandler('list_devices', async (data) => {
            if (mode === 'manual' && devices.length === 0) {
                //Manual entry and no device found
                throw new Error('Wrong IP number or port, no SMA inverter found');
            }
            return devices;
        });
    }
}
module.exports = InverterDriver;
