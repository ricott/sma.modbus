'use strict';

const BaseDevice = require('../baseDevice.js');
const Battery = require('../../lib/devices/battery.js');
const decodeData = require('../../lib/modbus/decodeData.js');

class BatteryDevice extends BaseDevice {

    async onInit() {
        await this.upgradeDevice();
        await super.onInit();
    }

    async upgradeDevice() {
        this.logMessage('Upgrading existing device');

    }

    async setupSession(address, port, polling) {
        this.api = new Battery({
            host: address,
            port: port,
            refreshInterval: polling,
            device: this
        });

        await this.initializeEventListeners();
    }

    async initializeEventListeners() {
        this.api.on('readings', async (readings) => {

            const batteryCharge = readings.batteryCharge || 0;
            const batteryDischarge = readings.batteryDischarge || 0;
            // Idle power is 0
            let batteryPower = 0;
            if (batteryCharge > 0) {
                // We are charging
                batteryPower = batteryCharge;
            } else if (batteryDischarge > 0) {
                // We are discharging, make discharge negative
                batteryPower = (batteryDischarge * -1);
            }
            await this._updateProperty('measure_power', batteryPower);
            await this._updateProperty('measure_battery', Number.isNaN(readings.batterySoC) ? 0 : readings.batterySoC);
            await this._updateProperty('battery_charging_state', decodeData.decodeBatteryChargingState(readings.batteryStatus));

            await this._updateProperty('measure_voltage', readings.batteryVoltage || 0);
            await this._updateProperty('measure_current', readings.batteryCurrent || 0);
            await this._updateProperty('measure_temperature', readings.batteryTemperature || 0);

        });

        this.api.on('properties', async (properties) => {
            try {
                await this.setSettings({
                    deviceType: String(properties.deviceType),
                    deviceClass: decodeData.decodeDeviceClass(properties.deviceClass || 0),
                    serialNo: String(properties.serialNo),
                    swVersion: String(properties.swVersion || 'unknown')
                });
            } catch (err) {
                this.error('Failed to update settings', err);
            }
        });

        this.api.on('error', async (error) => {
            this.error(`[${this.getName()}] Houston we have a problem`, error);

            let message = '';
            if (this.isError(error)) {
                message = error.stack;
            } else {
                try {
                    message = JSON.stringify(error, null, "  ");
                } catch (e) {
                    this.error(`[${this.getName()}] Failed to stringify object`, e);
                    message = 'Unknown error';
                }
            }

            const timeString = new Date().toLocaleString('sv-SE', { hour12: false, timeZone: this.homey.clock.getTimezone() });
            try {
                await this.setSettings({ last_error: timeString + '\n' + message });
            } catch (err) {
                this.error('Failed to update settings', err);
            }
        });
    }

    async triggerDeviceTriggers(key, value) {
        // Empty for now, called from baseDevice
    }
}
module.exports = BatteryDevice;
