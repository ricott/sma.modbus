'use strict';

const spacetime = require('spacetime');
const ModbusDevice = require('../modbusDevice.js');
const Inverter = require('../../lib/devices/inverter.js');
const decodeData = require('../../lib/modbus/decodeData.js');

const _defaultActivePower = 50000;
const deviceCapabilitesList = [
    'measure_battery',
    'target_power',
    'measure_power',
    'measure_power.battery',
    'meter_power',
    'measure_voltage',
    'measure_voltage.l2',
    'measure_voltage.l3',
    'measure_yield',
    'operational_status.health',
    'operational_status',
    'operational_status.battery',
    'measure_voltage.dcA',
    'measure_voltage.dcB',
    'measure_voltage.dcC',
    'measure_power.dcA',
    'measure_power.dcB',
    'measure_power.dcC'
];

class InverterDevice extends ModbusDevice {

    #capabilityListenersRegistered = false;

    async onInit() {
        await super.onInit();
        this.resetAtMidnight();
    }

    async setupCapabilityListeners() {
        if (this.hasCapability('target_power')) {
            if (this.#capabilityListenersRegistered) {
                return;
            }

            this.registerCapabilityListener('target_power', async (power) => {
                try {
                    this.log(`[${this.getName()}] Set active power limit to '${power}'`);
                    // Adjust active power to be <= max power
                    const activePower = Math.min(Number(this.getSetting('maxPower')), power);
                    await this.api.setMaxActivePowerOutput(activePower);
                } catch (reason) {
                    let msg = `Failed to set active power limit! Reason: ${reason.message}`;
                    this.error(msg);
                    throw new Error(msg);
                }
            });
            this.#capabilityListenersRegistered = true;
        }
    }

    async setupSession(address, port, polling) {
        this.api = new Inverter({
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
        this.api.on('error', this._handleErrorEvent.bind(this));
    }

    async handleReadingsEvent(readings) {
        try {
            // Update availability tracking
            await this.onDataReceived();

            // Handle daily yield calculation
            await this.handleDailyYield(readings);

            // Destructure readings for cleaner access
            const {
                acPowerTotal = 0,
                acVoltageL1 = 0,
                acVoltageL2 = 0,
                acVoltageL3 = 0,
                totalYield = 0,
                condition,
                status,
                batteryStatus,
                dcVoltageA = 0,
                dcVoltageB = 0,
                dcVoltageC = 0,
                dcPowerA = 0,
                dcPowerB = 0,
                dcPowerC = 0,
                batterySoC = 0,
                targetPower = 0,
                batteryCharge = 0,
                batteryDischarge = 0
            } = readings;

            // Update basic power and voltage readings
            await this._updateProperty('measure_power', acPowerTotal);
            await this._updateProperty('measure_voltage', acVoltageL1);
            await this._updateProperty('measure_voltage.l2', acVoltageL2);
            await this._updateProperty('measure_voltage.l3', acVoltageL3);

            // Update total yield (ignore occasional 0 values)
            if (totalYield > 0) {
                await this._updateProperty('measure_yield', decodeData.formatWHasKWH(totalYield));
            }

            // Update operational status capabilities
            await this.updateOperationalStatus(condition, status, batteryStatus);

            // Update DC voltage and power readings
            await this.updateDCReadings({ dcVoltageA, dcVoltageB, dcVoltageC, dcPowerA, dcPowerB, dcPowerC });

            // Update battery and target power
            await this._updateProperty('measure_battery', Number.isNaN(batterySoC) ? 0 : batterySoC);

            // Adjust active power to be <= max power
            const maxPower = Number(this.getSetting('maxPower'));
            const activePower = Math.min(maxPower, targetPower);
            await this._updateProperty('target_power', activePower);

            // Calculate and update battery power
            const batteryPower = this.calculateBatteryPower(batteryCharge, batteryDischarge);
            await this._updateProperty('measure_power.battery', batteryPower);

        } catch (error) {
            this.error('Failed to process inverter readings event:', error);
        }
    }

    async handleDailyYield(readings) {
        const isManualCalculation = this.getSetting('isDailyYieldManual') === 'true';

        if (isManualCalculation) {
            try {
                const calculatedDailyYield = await this.calculateDailyYield(readings.totalYield);
                // Ensure non-negative values (fishy values coming for at least one user)
                const dailyYield = Math.max(calculatedDailyYield, 0.0);
                await this._updateProperty('meter_power', decodeData.formatWHasKWH(dailyYield));
            } catch (error) {
                this.error('Failed to calculate daily yield:', error);
            }
        } else {
            // Ensure non-negative values (fishy values coming for at least one user)
            const dailyYield = Math.max(readings.dailyYield || 0.0, 0.0);
            await this._updateProperty('meter_power', decodeData.formatWHasKWH(dailyYield));
        }
    }

    async updateOperationalStatus(condition, status, batteryStatus) {
        // Update condition if valid and not unknown
        if (condition && !condition.startsWith('UNKNOWN')) {
            await this._updateProperty('operational_status.health', condition);
        }

        // Update status, skip odd readings that show 0 as condition
        // There is no mapping for 0, so it is an unknown value (UNKNOWN (0))
        if (status && !status.includes('(0)')) {
            await this._updateProperty('operational_status', status);
        }

        // Update battery status, skip invalid readings
        if (batteryStatus && !batteryStatus.includes('(0)')) {
            await this._updateProperty('operational_status.battery', batteryStatus);
        }
    }

    async updateDCReadings({ dcVoltageA, dcVoltageB, dcVoltageC, dcPowerA, dcPowerB, dcPowerC }) {
        await Promise.all([
            this._updateProperty('measure_voltage.dcA', dcVoltageA),
            this._updateProperty('measure_voltage.dcB', dcVoltageB),
            this._updateProperty('measure_voltage.dcC', dcVoltageC),
            this._updateProperty('measure_power.dcA', dcPowerA),
            this._updateProperty('measure_power.dcB', dcPowerB),
            this._updateProperty('measure_power.dcC', dcPowerC)
        ]);
    }

    calculateBatteryPower(batteryCharge, batteryDischarge) {
        // Idle power is 0
        if (batteryCharge > 0) {
            // We are charging
            return batteryCharge;
        } else if (batteryDischarge > 0) {
            // We are discharging, make discharge negative
            return -batteryDischarge;
        }
        return 0;
    }

    async handlePropertiesEvent(properties) {
        try {
            await this.setSettings({
                deviceType: String(properties.deviceType),
                serialNo: String(properties.serialNo),
                swVersion: String(properties.swVersion || 'unknown'),
                maxPower: String(properties.maxPower || _defaultActivePower),
                gridCountry: String(properties.gridCountry || 'unknown'),
                deviceClass: decodeData.decodeDeviceClass(properties.deviceClass || 0)
            });

            //When properties are read we have the device type needed to know capabilities
            await this.setupCapabilities();
            await this.updateCapabilityProperties();
            await this.shouldWeCalculateDailyYield();
            await this.setupCapabilityListeners();
        } catch (err) {
            this.error('Failed to process inverter properties event:', err);
        }
    }

    resetAtMidnight() {
        const tz = this.homey.clock.getTimezone();
        const midnight = spacetime.now(tz).add(1, 'day').startOf('day');
        const now = spacetime.now(tz);
        const msToMidnight = now.diff(midnight, 'milliseconds');
        this.log(`[${this.getName()}] Scheduling total daily to be reset at '${midnight.format('iso')}'`);

        this.homey.setTimeout(async () => {
            this.log(`[${this.getName()}] Resetting daily yield`);

            await this.resetDailyYield();
            this.resetAtMidnight();
        }, msToMidnight);
    }

    async resetDailyYield() {
        try {
            await this.setStoreValue('totalYieldAtMidnight', 0);
        } catch (reason) {
            this.error(reason);
        }
    }

    async calculateDailyYield(totalYield) {
        // Check if we have totalYield from midnight saved
        const totalYieldAtMidnight = this.getStoreValue('totalYieldAtMidnight') || 0;
        if (totalYieldAtMidnight == 0) {
            this.log(`[${this.getName()}] Total yield store value is '0', setting it to '${totalYield}'`);
            try {
                await this.setStoreValue('totalYieldAtMidnight', totalYield);
            } catch (reason) {
                this.error(reason);
            }
            return 0;
        }

        const dailyYield = totalYield - totalYieldAtMidnight;
        //this.log(`[${this.getName()}] Total yield '${totalYield}', total since midnight '${totalYieldAtMidnight}' - gives '${dailyYield}'`);
        return dailyYield;
    }

    async shouldWeCalculateDailyYield() {
        const manual = this.api.isDailyYieldManual();
        this.log(`[${this.getName()}] Calculate manual daily yield: '${manual}'`);
        await this.setSettings({
            isDailyYieldManual: String(manual || 'false')

        }).catch(err => {
            this.error('Failed to update isDailyYieldManual', err);
        });
    }

    async updateCapabilityProperties() {
        this.log(`[${this.getName()}] Assigning new capability names`);
        await this.updateCapabilityOptions('measure_voltage.dcA', { title: { en: this.getSetting('mpp_a_name') } });
        await this.updateCapabilityOptions('measure_power.dcA', { title: { en: this.getSetting('mpp_a_name') } });

        await this.updateCapabilityOptions('measure_voltage.dcB', { title: { en: this.getSetting('mpp_b_name') } });
        await this.updateCapabilityOptions('measure_power.dcB', { title: { en: this.getSetting('mpp_b_name') } });

        await this.updateCapabilityOptions('measure_voltage.dcC', { title: { en: this.getSetting('mpp_c_name') } });
        await this.updateCapabilityOptions('measure_power.dcC', { title: { en: this.getSetting('mpp_c_name') } });

        this.log(`[${this.getName()}] Updating max target power to '${this.getSetting('maxPower')}'`);
        await this.updateCapabilityOptions('target_power', { max: Number(this.getSetting('maxPower')) });
    }

    async setupCapabilities() {
        this.log(`[${this.getName()}] Setting up capabilities`);

        let capabilities = this.api.getDeviceCapabilities();
        let capabilityKeys = Object.values(capabilities);

        for (const capability of deviceCapabilitesList) {
            if (capabilityKeys.includes(capability)) {
                //Device should have capability
                if (!this.hasCapability(capability)) {
                    await this.addCapabilityHelper(capability);
                } else {
                    this.log(`[${this.getName()}] Device has capability '${capability}'`);
                }
            } else {
                //Device doesnt have capability, remove it
                await this.removeCapabilityHelper(capability);
            }
        }
    }

    async _handlePropertyTriggers(key, value) {
        if (key === 'operational_status') {
            const tokens = {
                inverter_status: value || 'n/a'
            };
            await this.driver.triggerInverterStatusChanged(this, tokens).catch(error => { this.error(error) });

        } else if (key === 'operational_status.health') {
            const tokens = {
                inverter_condition: value || 'n/a'
            };
            await this.driver.triggerInverterConditionChanged(this, tokens).catch(error => { this.error(error) });
        }
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        let changeLabel = false;
        if (changedKeys.indexOf("mpp_a_name") > -1) {
            this.log(`[${this.getName()}] MPP A name was change to '${newSettings.mpp_a_name}'`);
            changeLabel = true;
        }
        if (changedKeys.indexOf("mpp_b_name") > -1) {
            this.log(`[${this.getName()}] MPP B name was change to '${newSettings.mpp_b_name}'`);
            changeLabel = true;
        }
        if (changedKeys.indexOf("mpp_c_name") > -1) {
            this.log(`[${this.getName()}] MPP C name was change to '${newSettings.mpp_c_name}'`);
            changeLabel = true;
        }

        if (changeLabel) {
            await this.updateCapabilityProperties();
        }

        await super.onSettings({ oldSettings, newSettings, changedKeys });
    }
}
module.exports = InverterDevice;
