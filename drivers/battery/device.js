'use strict';

const ModbusDevice = require('../modbusDevice.js');
const Battery = require('../../lib/devices/battery.js');
const decodeData = require('../../lib/modbus/decodeData.js');
const utilFunctions = require('../../lib/util.js');

// External grid connection capabilities, only exposed by Sunny Island devices
const gridCapabilities = {
    'measure_voltage.grid_l1': { en: 'Grid voltage L1', nl: 'Netspanning L1', sv: 'Nätspänning L1' },
    'measure_voltage.grid_l2': { en: 'Grid voltage L2', nl: 'Netspanning L2', sv: 'Nätspänning L2' },
    'measure_voltage.grid_l3': { en: 'Grid voltage L3', nl: 'Netspanning L3', sv: 'Nätspänning L3' },
    'grid_connection_status': null
};

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

    async setupSession(address, port, polling, timeout) {
        const api = new Battery({
            host: address,
            port: port,
            refreshInterval: polling,
            timeout: timeout,
            device: this
        });
        this.api = api;

        await this.initializeEventListeners(api);
        await api.waitUntilReady();
    }

    async initializeEventListeners(api = this.api) {
        api.on('readings', this.handleReadingsEvent.bind(this));
        api.on('properties', this.handlePropertiesEvent.bind(this));
        api.on('error', error => this.handleErrorEvent(error, api));
    }

    async handleErrorEvent(error, api = this.api) {
        if (api !== this.api) {
            return;
        }

        // Handle the error with base device error handling
        await this._handleErrorEvent(error);

        // A replacement may have occurred while Homey handled the error.
        if (api === this.api) {
            await this.onCommunicationError(error);
        }
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

            await this.updateGridReadings(readings);
        } catch (err) {
            this.error(`Failed to update readings: ${utilFunctions.formatError(err)}`);
        }
    }

    async updateGridReadings(readings) {
        const phases = { L1: readings.gridVoltageL1, L2: readings.gridVoltageL2, L3: readings.gridVoltageL3 };
        for (const [phase, voltage] of Object.entries(phases)) {
            const capability = `measure_voltage.grid_${phase.toLowerCase()}`;
            if (voltage == null || !this.hasCapability(capability)) {
                continue;
            }

            const previous = this.getCapabilityValue(capability);
            await this._updateProperty(capability, voltage);
            if (previous != null && voltage !== previous) {
                await this.driver.triggerGridVoltageChanged(this, { phase, voltage }, { phase, voltage, previous });
            }
        }

        const status = readings.gridConnectionStatus;
        if (status && !status.startsWith('UNKNOWN')) {
            await this._updateProperty('grid_connection_status', status);
        }
    }

    async setupGridCapabilities() {
        const capabilityKeys = Object.values(this.api.getDeviceCapabilities());

        for (const [capability, title] of Object.entries(gridCapabilities)) {
            if (capabilityKeys.includes(capability)) {
                await this.addCapabilityHelper(capability);
                if (title) {
                    await this.updateCapabilityOptions(capability, { title });
                }
            } else {
                await this.removeCapabilityHelper(capability);
            }
        }
    }

    async _handlePropertyTriggers(key, value) {
        if (key === 'grid_connection_status') {
            const tokens = {
                grid_connection_status: value || 'n/a'
            };
            await this.driver.triggerGridConnectionStatusChanged(this, tokens).catch(error => { this.error(utilFunctions.formatError(error)) });
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

            // When properties are read we have the device type needed to know capabilities
            await this.setupGridCapabilities();
        } catch (err) {
            this.error(`Failed to update settings: ${utilFunctions.formatError(err)}`);
        }
    }
}
module.exports = BatteryDevice;
