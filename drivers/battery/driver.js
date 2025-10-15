'use strict';

const { Driver } = require('homey');
const BatteryDiscovery = require('../../lib/devices/batteryDiscovery.js');
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
                const discoveryQuery = new BatteryDiscovery({
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

    async onRepair(session, device) {
        this.log(`[${device.getName()}] Starting repair process`);
        
        let repairDevices = [];
        let mode = 'discovery';
        const deviceData = device.getData();
        const currentSerial = deviceData.id;

        session.setHandler('showView', async (view) => {
            this.log(`Repair: Showing view '${view}'`);

            if (view === 'loading') {
                mode = 'discovery';
                repairDevices.splice(0, repairDevices.length);

                // Use the same discovery mechanism as pairing
                const discoveryQuery = new BatteryDiscovery({
                    port: this.homey.settings.get('port'),
                    device: this
                });

                try {
                    const devicesFound = await discoveryQuery.discover();

                    // Look for the specific device we're trying to repair
                    for (const deviceInfo of devicesFound) {
                        // Check if this is the same device (matching serial number)
                        if (deviceInfo.serialNo === currentSerial) {
                            this.log(`Found matching device: ${deviceInfo.deviceType} at ${deviceInfo.address}`);
                            repairDevices.push({
                                name: deviceInfo.deviceType,
                                data: deviceData, // Keep the same device data
                                settings: {
                                    address: deviceInfo.address,
                                    port: Number(deviceInfo.port),
                                    deviceClass: decodeData.decodeDeviceClass(deviceInfo.deviceClass)
                                }
                            });
                            break;
                        }
                    }

                    if (repairDevices.length === 0) {
                        this.log('Device not found using auto-discovery, show manual entry');
                        await session.showView('settings');
                    } else {
                        this.log('Found device for repair, updating settings');
                        // Complete repair with the new settings
                        const deviceSettings = repairDevices[0].settings;
                        this.log('Repair completed with settings:', deviceSettings);
                        await session.done(deviceSettings);
                    }
                } catch (error) {
                    this.log('Auto-discovery failed during repair, showing manual entry', error);
                    await session.showView('settings');
                }
            }
        });

        session.setHandler('settings', async (data) => {
            mode = 'manual';
            repairDevices.splice(0, repairDevices.length);

            const smaSession = new Battery({
                host: data.address,
                port: this.homey.settings.get('port'),
                autoClose: true,
                device: this
            });

            try {
                await new Promise((resolve, reject) => {
                    smaSession.on('properties', deviceProperties => {
                        // Verify this is the same device
                        if (deviceProperties.serialNo === currentSerial) {
                            this.log(`Manual entry verified: ${deviceProperties.deviceType}`);
                            repairDevices.push({
                                name: deviceProperties.deviceType,
                                data: deviceData, // Keep the same device data
                                settings: {
                                    address: data.address,
                                    port: Number(this.homey.settings.get('port'))
                                }
                            });
                            resolve();
                        } else {
                            reject(new Error(`Device serial number mismatch. Expected: ${currentSerial}, Found: ${deviceProperties.serialNo}`));
                        }
                    });

                    smaSession.on('error', error => {
                        this.log('Failed to read device properties during repair', error);
                        reject(error);
                    });
                });

                // Complete repair with the updated settings
                const deviceSettings = repairDevices[0].settings;
                this.log('Manual repair completed with settings:', deviceSettings);
                await session.done(deviceSettings);
            } catch (error) {
                throw new Error(`Unable to verify device identity. ${error.message}`);
            }
        });
    }
}
module.exports = BatteryDriver;
