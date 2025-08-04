'use strict';

const ModbusDevice = require('../modbusDevice.js');
const Battery = require('../../lib/devices/battery.js');
const decodeData = require('../../lib/modbus/decodeData.js');

class BatteryDevice extends ModbusDevice {

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
        this.api.on('readings', this.handleReadingsEvent.bind(this));
        this.api.on('properties', this.handlePropertiesEvent.bind(this));
        this.api.on('error', this.handleErrorEvent.bind(this));
    }

    async handleErrorEvent(error) {
        // Handle the error with base device error handling
        await this._handleErrorEvent(error);
        
        // Also check if this is a communication error that should trigger reconnection
        await this.onCommunicationError(error);
    }

    async handleReadingsEvent(readings) {
        try {
            // Update availability tracking
            await this.onDataReceived();

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

            await Promise.all([
                this._updateProperty('measure_power', batteryPower),
                this._updateProperty('measure_battery', Number.isNaN(readings.batterySoC) ? 0 : readings.batterySoC),
                this._updateProperty('battery_charging_state', decodeData.decodeBatteryChargingState(readings.batteryStatus)),
                this._updateProperty('measure_voltage', readings.batteryVoltage || 0),
                this._updateProperty('measure_current', readings.batteryCurrent || 0),
                this._updateProperty('measure_temperature', readings.batteryTemperature || 0)
            ]);
        } catch (err) {
            this.error('Failed to update readings', err);
        }
    }

    async handlePropertiesEvent(properties) {
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
    }
}
module.exports = BatteryDevice;
