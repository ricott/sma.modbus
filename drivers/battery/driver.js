'use strict';

const { Driver } = require('homey');
const BatteryDiscovery = require('../../lib/devices/batteryDiscovery.js');
const Battery = require('../../lib/devices/battery.js');
const decodeData = require('../../lib/modbus/decodeData.js');
const utilFunctions = require('../../lib/util.js');

class BatteryDriver extends Driver {

    async onInit() {
        this.log('Battery driver has been initialized');

        //First time app starts, set default port to 502.
        if (!this.homey.settings.get('port')) {
            this.homey.settings.set('port', 502);
        }

        this._registerFlows();
    }

    async triggerGridConnectionStatusChanged(device, tokens) {
        await this._grid_connection_status_changed.trigger(device, tokens, {}).catch(error => { this.error(utilFunctions.formatError(error)) });
    }

    async triggerGridVoltageChanged(device, tokens, state) {
        await this._grid_voltage_dropped_below.trigger(device, tokens, state).catch(error => { this.error(utilFunctions.formatError(error)) });
    }

    _registerFlows() {
        this.log('Registering flows');

        // Register device triggers
        this._grid_connection_status_changed = this.homey.flow.getDeviceTriggerCard('grid_connection_status_changed');

        this._grid_voltage_dropped_below = this.homey.flow.getDeviceTriggerCard('grid_voltage_dropped_below');
        this._grid_voltage_dropped_below.registerRunListener(async (args, state) => {
            // Only fire when the voltage crosses the threshold, not on every reading below it
            return (args.phase === 'any' || args.phase === state.phase) &&
                state.previous >= args.voltage && state.voltage < args.voltage;
        });

        // Register conditions
        const grid_voltage_below = this.homey.flow.getConditionCard('grid_voltage_below');
        grid_voltage_below.registerRunListener(async (args, state) => {
            const phases = args.phase === 'any' ? ['L1', 'L2', 'L3'] : [args.phase];
            const voltages = phases
                .map(phase => args.device.getCapabilityValue(`measure_voltage.grid_${phase.toLowerCase()}`))
                .filter(voltage => voltage != null);
            this.log(`[${args.device.getName()}] Condition 'grid_voltage_below' phase '${args.phase}', voltages '${voltages}', threshold '${args.voltage}'`);

            return voltages.some(voltage => voltage < args.voltage);
        });

        const isGridConnectionStatus = this.homey.flow.getConditionCard('isGridConnectionStatus');
        isGridConnectionStatus.registerRunListener(async (args, state) => {
            const status = args.device.getCapabilityValue('grid_connection_status');
            this.log(`[${args.device.getName()}] Condition 'isGridConnectionStatus' status '${status}', parameter '${args.status}'`);

            return status === args.status;
        });
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
        const devices = [];
        let mode;

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
                            this.log(`Found a SMA device that is not a battery: ${utilFunctions.formatError(device)}`);
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
                    this.log(`Auto-discovery failed, showing manual entry: ${utilFunctions.formatError(error)}`);
                    await session.showView('settings');
                }
            }
        });

        session.setHandler('settings', async (data) => {
            mode = 'manual';
            //Make sure devices array is empty
            devices.splice(0, devices.length);

            // Accepts 'IP' as well as 'IP:port', which is what users tend to paste.
            const target = utilFunctions.resolveManualAddress(data.address, this.homey.settings.get('port'));
            if (!target) {
                this.log(`Rejecting manual entry, '${data.address}' is not a valid address`);
                throw new Error(this.homey.__('pair.invalid_address'));
            }

            const smaSession = new Battery({
                host: target.host,
                port: target.port,
                autoClose: true,
                device: this
            });

            try {
                const deviceProperties = await utilFunctions.waitForProperties(smaSession);

                this.log(`Adding to devices: ${deviceProperties.deviceType}`);
                devices.push({
                    name: deviceProperties.deviceType,
                    data: {
                        id: deviceProperties.serialNo
                    },
                    settings: {
                        address: target.host,
                        port: target.port
                    }
                });

                await session.showView('list_devices');
            } catch (error) {
                this.log(`Failed to read device properties: ${utilFunctions.formatError(error)}`);
                // Include the underlying reason plus what to check. The pairing view
                // shows this message verbatim, and 'wrong IP or port' alone sends
                // users looking in the wrong place when the real cause was a timeout
                // or Modbus being disabled on the device.
                throw new Error(`No SMA device found at '${target.host}:${target.port}'. ${utilFunctions.formatError(error)} ${this.homey.__('pair.connection_hint')}`, { cause: error });
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

        const repairDevices = [];
        let mode = 'discovery';
        const deviceData = device.getData();
        const currentSerial = deviceData.id;

        const withSuspendedConnection = async (operation) => {
            await device.suspendConnectionForRepair();
            try {
                return await operation();
            } finally {
                await device.resumeConnectionAfterRepair().catch(error => {
                    this.error(`Failed to resume device after repair: ${utilFunctions.formatError(error)}`);
                });
            }
        };

        session.setHandler('showView', async (view) => {
            this.log(`Repair: Showing view '${view}'`);

            if (view === 'loading') {
                await withSuspendedConnection(async () => {
                    mode = 'discovery';
                    repairDevices.splice(0, repairDevices.length);

                    const discoveryQuery = new BatteryDiscovery({
                        port: this.homey.settings.get('port'),
                        device: this
                    });

                    try {
                        const devicesFound = await discoveryQuery.discover();

                        for (const deviceInfo of devicesFound) {
                            if (deviceInfo.serialNo === currentSerial) {
                                this.log(`Found matching device: ${deviceInfo.deviceType} at ${deviceInfo.address}`);
                                repairDevices.push({
                                    name: deviceInfo.deviceType,
                                    data: deviceData,
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
                            const deviceSettings = repairDevices[0].settings;
                            this.log(`Repair completed with settings: ${utilFunctions.formatError(deviceSettings)}`);
                            await session.done(deviceSettings);
                        }
                    } catch (error) {
                        this.log(`Auto-discovery failed during repair, showing manual entry: ${utilFunctions.formatError(error)}`);
                        await session.showView('settings');
                    }
                });
            }
        });

        session.setHandler('settings', async (data) => {
            return withSuspendedConnection(async () => {
                mode = 'manual';
                repairDevices.splice(0, repairDevices.length);

                const target = utilFunctions.resolveManualAddress(data.address, this.homey.settings.get('port'));
                if (!target) {
                    this.log(`Rejecting manual entry, '${data.address}' is not a valid address`);
                    throw new Error(this.homey.__('pair.invalid_address'));
                }

                const smaSession = new Battery({
                    host: target.host,
                    port: target.port,
                    autoClose: true,
                    device: this
                });

                try {
                    const deviceProperties = await utilFunctions.waitForProperties(smaSession);

                    if (deviceProperties.serialNo !== currentSerial) {
                        throw new Error(`Device serial number mismatch. Expected: ${currentSerial}, Found: ${deviceProperties.serialNo}`);
                    }

                    this.log(`Manual entry verified: ${deviceProperties.deviceType}`);
                    repairDevices.push({
                        name: deviceProperties.deviceType,
                        data: deviceData,
                        settings: {
                            address: target.host,
                            port: target.port
                        }
                    });

                    const deviceSettings = repairDevices[0].settings;
                    this.log(`Manual repair completed with settings: ${utilFunctions.formatError(deviceSettings)}`);
                    await session.done(deviceSettings);
                } catch (error) {
                    throw new Error(`Unable to verify device identity. ${utilFunctions.formatError(error)} ${this.homey.__('pair.connection_hint')}`, { cause: error });
                }
            });
        });
    }
}
module.exports = BatteryDriver;
