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

        this.flowCards = {};
        this._registerFlows();
    }

    _registerFlows() {
        this.log('Registering flows');

        // Register device triggers
        this.flowCards['inverter_status_changed'] = this.homey.flow.getDeviceTriggerCard('inverter_status_changed');
        this.flowCards['inverter_condition_changed'] = this.homey.flow.getDeviceTriggerCard('inverter_condition_changed');

        //Register conditions
        this.flowCards['isInverterDailyYield'] =
            this.homey.flow.getConditionCard('isInverterDailyYield')
                .registerRunListener(async (args, state) => {
                    this.log(`[${args.device.getName()}] Condition 'isInverterDailyYield' triggered`);
                    this.log(`[${args.device.getName()}] - inverter.dailyYield: ${args.device.getCapabilityValue('meter_power')}`);
                    this.log(`[${args.device.getName()}] - parameter yield: '${args.daily_yield}'`);

                    if (args.device.getCapabilityValue('meter_power') > args.daily_yield) {
                        return true;
                    } else {
                        return false;
                    }
                });

        this.flowCards['isInverterStatus'] =
            this.homey.flow.getConditionCard('isInverterStatus')
                .registerRunListener(async (args, state) => {
                    this.log(`[${args.device.getName()}] Condition 'isInverterStatus' triggered`);
                    this.log(`[${args.device.getName()}] - inverter.status: ${args.device.getCapabilityValue('operational_status')}`);
                    this.log(`[${args.device.getName()}] - parameter status: '${args.inverter_status}'`);

                    if (args.device.getCapabilityValue('operational_status').indexOf(args.inverter_status) > -1) {
                        return true;
                    } else {
                        return false;
                    }
                });


        this.flowCards['power_condition'] =
            this.homey.flow.getConditionCard('power_condition')
                .registerRunListener(async (args, state) => {
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
    }

    triggerDeviceFlow(flow, tokens, device) {
        this.log(`[${device.getName()}] Triggering device flow '${flow}' with tokens`, tokens);
        this.flowCards[flow].trigger(device, tokens)
            .catch(error => {
                this.log(`Failed to trigger flow '${flow}' for device '${device.getName()}'`);
                this.log(error);
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
            this.log(`Showing view '${view}'`);

            if (view === 'loading') {
                mode = 'discovery';
                //Make sure devices array is empty
                devices.splice(0, devices.length);

                //Discover devices using multicast query
                let discoveryQuery = new discovery({
                    port: this.homey.settings.get('port')
                });
                discoveryQuery.discover();

                //We can find multiple inverters, this method is called once per inverter found
                discoveryQuery.on('deviceInfo', inverterInfo => {
                    //8001: Solar Inverters (DevClss1)
                    //Filter out storage devices, etc
                    if (inverterInfo.deviceClass == 8001) {
                        if (this.isNewInverter(inverterInfo.serialNo)) {
                            this.log(`Adding to devices: ${inverterInfo.deviceType}`);
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
                            this.log(`Found inverter '${inverterInfo.serialNo}' that is already added to Homey, ignoring it ...`);
                        }
                    } else {
                        this.log('Found a SMA device that is not an inverter', inverterInfo);
                    }
                });

                discoveryQuery.on('error', error => {
                    //Ignore the error, if no inverter found we'll do manual entry
                });

                sleep(6000).then(() => {
                    if (devices.length === 0) {
                        this.log('No (new) inverters found using auto-discovery, show manual entry');
                        session.showView('settings');
                    } else {
                        this.log(`Found '${devices.length}' inverter(s)`);
                        session.showView('list_devices');
                    }
                }).catch(reason => {
                    console.log('Timeout error', reason);
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
                port: this.homey.settings.get('port'),
                autoClose: true
            });

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
            });

            smaSession.on('error', error => {
                self.log('Failed to read inverter properties', error);
            });

            //Wait 3 seconds to allow properties to be read
            sleep(3000).then(() => {
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
}

// sleep time expects milliseconds
function sleep(time) {
    return new Promise((resolve) => this.homey.setTimeout(resolve, time));
}

module.exports = InverterDriver;
