'use strict';

const ModbusDevice = require('../modbusDevice.js');
const Battery = require('../../lib/devices/battery.js');
const decodeData = require('../../lib/modbus/decodeData.js');
const utilFunctions = require('../../lib/util.js');

class BatteryDevice extends ModbusDevice {

    async onInit() {
        // Ensure cumulative energy meter capabilities exist for already-paired
        // devices so Homey Energy can display charged/discharged kWh.
        await this.addCapabilityHelper('meter_power.charged');
        await this.addCapabilityHelper('meter_power.discharged');
        await this.updateCapabilityOptions('meter_power.charged', { title: { en: 'Charged', nl: 'Opgeladen', sv: 'Laddat' } });
        await this.updateCapabilityOptions('meter_power.discharged', { title: { en: 'Discharged', nl: 'Ontladen', sv: 'Urladdat' } });

        await super.onInit();
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

            // Derive power and charging state from the present charge/discharge
            // readings. Some devices (e.g. Sunny Boy Smart Energy) don't expose a
            // battery operating-status register, so we must not depend on it here.
            // Idle power is 0; charging is positive, discharging is negative.
            let batteryPower = 0;
            let chargingState = 'idle';
            if (batteryCharge > 0) {
                // We are charging
                batteryPower = batteryCharge;
                chargingState = 'charging';
            } else if (batteryDischarge > 0) {
                // We are discharging, make discharge negative
                batteryPower = (batteryDischarge * -1);
                chargingState = 'discharging';
            }

            const batterySoC = Number.isFinite(readings.batterySoC) ? readings.batterySoC : 0;

            await Promise.all([
                this._updateProperty('measure_power', batteryPower),
                this._updateProperty('measure_battery', batterySoC),
                this._updateProperty('battery_charging_state', chargingState),
                this._updateProperty('measure_voltage', readings.batteryVoltage || 0),
                this._updateProperty('measure_current', readings.batteryCurrent || 0),
                this._updateProperty('measure_temperature', readings.batteryTemperature || 0),
                this._updateProperty('meter_power.charged', decodeData.formatWHasKWH(readings.batteryChargeTotal || 0)),
                this._updateProperty('meter_power.discharged', decodeData.formatWHasKWH(readings.batteryDischargeTotal || 0))
            ]);
        } catch (err) {
            this.error(`Failed to update readings: ${utilFunctions.formatError(err)}`);
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
            this.error(`Failed to update settings: ${utilFunctions.formatError(err)}`);
        }
    }
}
module.exports = BatteryDevice;
