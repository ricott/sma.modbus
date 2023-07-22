'use strict';

const { Driver } = require('homey');
const discovery = require('../../lib/deviceDiscovery.js');
const SMA = require('../../lib/sma.js');

class InverterDriver extends Driver {

    async onInit() {
        this.log('SMA Inverter driver has been initialized');

        //First time app starts, set default port to 502.
        if (!this.homey.settings.get('port')) {
            this.homey.settings.set('port', 502);
        }

        this._registerFlows();
    }

    _registerFlows() {
        this.log('Registering flows');

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
        let self = this;
        let devices = [];
        let mode;
        let settings;

        session.setHandler('showView', async (view) => {
            self.log(`Showing view '${view}'`);

            if (view === 'loading') {
                mode = 'discovery';
                //Make sure devices array is empty
                devices.splice(0, devices.length);

                //Discover devices using multicast query
                let discoveryQuery = new discovery({
                    port: self.homey.settings.get('port'),
                    device: this
                });
                discoveryQuery.discover();

                //We can find multiple inverters, this method is called once per inverter found
                discoveryQuery.on('deviceInfo', inverterInfo => {
                    // 8001: Solar Inverters (DevClss1)
                    // 8007: Battery Inverter (DevClss7)
                    // 8009: Hybrid inverter (DevClss9)
                    if (inverterInfo.deviceClass == 8001 || 
                        inverterInfo.deviceClass == 8007 ||
                        inverterInfo.deviceClass == 8009) {
                        if (self.isNewInverter(inverterInfo.serialNo)) {
                            self.log(`Adding to devices: ${inverterInfo.deviceType}`);
                            devices.push({
                                name: inverterInfo.deviceType,
                                data: {
                                    id: inverterInfo.serialNo
                                },
                                settings: {
                                    address: inverterInfo.address,
                                    port: Number(inverterInfo.port)
                                }
                            });
                        } else {
                            self.log(`Found inverter '${inverterInfo.serialNo}' that is already added to Homey, ignoring it ...`);
                        }
                    } else {
                        self.log('Found a SMA device that is not an inverter', inverterInfo);
                    }
                });

                discoveryQuery.on('error', error => {
                    //Ignore the error, if no inverter found we'll do manual entry
                });

                self.#sleep(6000).then(() => {
                    if (devices.length === 0) {
                        self.log('No (new) inverters found using auto-discovery, show manual entry');
                        session.showView('settings');
                    } else {
                        self.log(`Found '${devices.length}' inverter(s)`);
                        session.showView('list_devices');
                    }
                }).catch(reason => {
                    self.log('Timeout error', reason);
                });
            }
        });

        session.setHandler('settings', async (data) => {
            mode = 'manual';
            settings = data;
            //Make sure devices array is empty
            devices.splice(0, devices.length);

            let smaSession = new SMA({
                host: settings.address,
                port: self.homey.settings.get('port'),
                autoClose: true,
                device: this
            });

            smaSession.on('properties', inverterProperties => {
                self.log(`Adding to devices: ${inverterProperties.deviceType}`);
                devices.push({
                    name: inverterProperties.deviceType,
                    data: {
                        id: inverterProperties.serialNo
                    },
                    settings: {
                        address: settings.address,
                        port: Number(self.homey.settings.get('port'))
                    }
                });
            });

            smaSession.on('error', error => {
                self.log('Failed to read inverter properties', error);
            });

            //Wait 3 seconds to allow properties to be read
            self.#sleep(3000).then(() => {
                session.showView('list_devices');
            });
        });

        session.setHandler('list_devices', async (data) => {
            if (mode === 'manual' && devices.length === 0) {
                //Manual entry and no device found
                throw new Error('Wrong IP number or port, no SMA inverter found');
            }
            return devices;
        });
    }

    #sleep(time) {
        return new Promise((resolve) => this.homey.setTimeout(resolve, time));
    }
}

module.exports = InverterDriver;
