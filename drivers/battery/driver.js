'use strict';

const { Driver } = require('homey');
const discovery = require('../../lib/devices/deviceDiscovery.js');
const Battery = require('../../lib/devices/battery.js');
const decodeData = require('../../lib/modbus/decodeData.js');

class BatteryDriver extends Driver {

    async onInit() {
        this.log('Battery driver has been initialized');

        //First time app starts, set default port to 502.
        if (!this.homey.settings.get('port')) {
            this.homey.settings.set('port', 502);
        }

    }

    isDeviceNew(deviceId) {
        let foundNewDevice = true;
        for (const device of this.getDevices()) {
            this.log(`Comparing device ID found '${deviceId}' with existing device ID '${device.getData().id}'`);
            if (deviceId == device.getData().id) {
                foundNewDevice = false;
                break;
            }
        }
        return foundNewDevice;
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
                const discoveryQuery = new discovery({
                    port: this.homey.settings.get('port'),
                    device: this
                });

                try {
                    const devicesFound = await discoveryQuery.discover();

                    // Process each discovered device
                    for (const device of devicesFound) {
                        // 8007: Battery Inverter (DevClss7)
                        // 8009: Hybrid Inverter (DevClss9)
                        if (device.deviceClass == 8007 || device.deviceClass == 8009) {
                            if (this.isDeviceNew(device.serialNo)) {
                                this.log(`Adding to devices: ${device.deviceType}`);
                                devices.push({
                                    name: device.deviceType,
                                    data: {
                                        id: device.serialNo
                                    },
                                    settings: {
                                        address: device.address,
                                        port: Number(device.port),
                                        deviceClass: decodeData.decodeDeviceClass(device.deviceClass)
                                    }
                                });
                            } else {
                                this.log(`Found device '${device.serialNo}' that is already added to Homey, ignoring it ...`);
                            }
                        } else {
                            this.log('Found a SMA device that is not a battery', device);
                        }
                    }

                    if (devices.length === 0) {
                        this.log('No (new) devices found using auto-discovery, show manual entry');
                        await session.showView('settings');
                    } else {
                        this.log(`Found '${devices.length}' device(s)`);
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

            const smaSession = new Battery({
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
                        this.log('Failed to read device properties', error);
                        reject(error);
                    });
                });

                await session.showView('list_devices');
            } catch (error) {
                throw new Error('Wrong IP number or port, no SMA device found');
            }
        });

        session.setHandler('list_devices', async (data) => {
            if (mode === 'manual' && devices.length === 0) {
                //Manual entry and no device found
                throw new Error('Wrong IP number or port, no SMA device found');
            }
            return devices;
        });
    }
}
module.exports = BatteryDriver;
