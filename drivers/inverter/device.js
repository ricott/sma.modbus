'use strict';

const spacetime = require('spacetime');
const ModbusDevice = require('../modbusDevice.js');
const Inverter = require('../../lib/devices/inverter.js');
const decodeData = require('../../lib/modbus/decodeData.js');
const utilFunctions = require('../../lib/util.js');

const _defaultActivePower = 50000;
const deviceCapabilitesList = [
    'target_power',
    'measure_power',
    'meter_power',
    'measure_voltage',
    'measure_voltage.l2',
    'measure_voltage.l3',
    'measure_yield',
    'operational_status.health',
    'operational_status',
    'measure_voltage.dcA',
    'measure_voltage.dcB',
    'measure_voltage.dcC',
    'measure_power.dcA',
    'measure_power.dcB',
    'measure_power.dcC'
];

class InverterDevice extends ModbusDevice {

    #capabilityListenersRegistered = false;
    // Integrated daily PV yield (Wh) for hybrid inverters, where no PV-only
    // energy counter exists and the AC yield counters include battery discharge.
    #dailyPvWh = 0;
    #lastPvSampleTs = null;

    async onInit() {
        await super.onInit();
        // Restore the integrated daily PV yield so a mid-day app restart doesn't
        // lose the day's accumulation. The sample timestamp is intentionally not
        // restored so we don't add bogus energy for the downtime gap.
        this.#dailyPvWh = Number(this.getStoreValue('dailyPvYieldWh')) || 0;
        this.#lastPvSampleTs = null;
        this.resetAtMidnight();
    }

    // A hybrid inverter (device class 8009) has a battery connected, so its AC
    // output includes battery discharge. Used to report PV-only production.
    isHybrid() {
        return this.getSetting('deviceClass') === decodeData.decodeDeviceClass(8009);
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
                    const msg = `Failed to set active power limit! Reason: ${utilFunctions.formatError(reason)}`;
                    this.error(msg);
                    throw new Error(msg, { cause: reason });
                }
            });
            this.#capabilityListenersRegistered = true;
        }
    }

    async setupSession(address, port, polling, timeout) {
        this.api = new Inverter({
            host: address,
            port: port,
            refreshInterval: polling,
            timeout: timeout,
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

            // Destructure readings for cleaner access
            const {
                acPowerTotal = 0,
                acVoltageL1 = 0,
                acVoltageL2 = 0,
                acVoltageL3 = 0,
                totalYield = 0,
                condition,
                status,
                dcVoltageA = 0,
                dcVoltageB = 0,
                dcVoltageC = 0,
                dcPowerA = 0,
                dcPowerB = 0,
                dcPowerC = 0,
                targetPower = 0
            } = readings;

            // On hybrid inverters the AC output (reg 30775) and the AC yield
            // counters include battery discharge. If reported as-is, Homey counts
            // that discharge as solar production and double-counts it against the
            // battery device. Report PV (DC) production instead so Homey Energy
            // attributes solar correctly. Non-hybrid inverters are unaffected.
            if (this.isHybrid()) {
                const pvPower = Math.max((dcPowerA || 0) + (dcPowerB || 0) + (dcPowerC || 0), 0);
                await this._updateProperty('measure_power', pvPower);

                // These devices expose no PV-only energy counter, so integrate the
                // PV power over time to derive the daily PV yield.
                const dailyPvWh = await this.accumulateDailyPvYield(pvPower);
                await this._updateProperty('meter_power', decodeData.formatWHasKWH(dailyPvWh));
            } else {
                await this._updateProperty('measure_power', acPowerTotal);
                // Handle daily yield calculation (direct register or from lifetime yield)
                await this.handleDailyYield(readings);
            }

            // Update AC voltage readings
            await this._updateProperty('measure_voltage', acVoltageL1);
            await this._updateProperty('measure_voltage.l2', acVoltageL2);
            await this._updateProperty('measure_voltage.l3', acVoltageL3);

            // Update total yield (ignore occasional 0 values)
            if (totalYield > 0) {
                await this._updateProperty('measure_yield', decodeData.formatWHasKWH(totalYield));
            }

            // Update operational status capabilities
            await this.updateOperationalStatus(condition, status);

            // Update DC voltage and power readings
            await this.updateDCReadings({ dcVoltageA, dcVoltageB, dcVoltageC, dcPowerA, dcPowerB, dcPowerC });

            // Adjust active power to be <= max power
            const maxPower = Number(this.getSetting('maxPower'));
            const activePower = Math.min(maxPower, targetPower);
            await this._updateProperty('target_power', activePower);

        } catch (error) {
            this.error(`Failed to process inverter readings event: ${utilFunctions.formatError(error)}`);
        }
    }

    // Integrates PV (DC) power over time to derive the daily PV yield (Wh) for
    // hybrid inverters. Resets to zero at midnight via resetDailyYield().
    async accumulateDailyPvYield(pvPowerW) {
        const now = Date.now();
        const pollingS = Number(this.getSetting('polling')) || 10;
        const maxDtMs = pollingS * 2 * 1000;

        if (this.#lastPvSampleTs != null) {
            let dtMs = now - this.#lastPvSampleTs;
            if (dtMs < 0) {
                dtMs = 0;
            } else if (dtMs > maxDtMs) {
                // Cap the interval to avoid a spike after a polling gap or restart
                dtMs = maxDtMs;
            }

            const incrementWh = (Math.max(pvPowerW, 0) * dtMs) / 3600000;
            if (incrementWh > 0) {
                this.#dailyPvWh += incrementWh;
                await this.setStoreValue('dailyPvYieldWh', this.#dailyPvWh).catch(reason => {
                    this.error(`Failed to persist daily PV yield: ${utilFunctions.formatError(reason)}`);
                });
            }
        }

        this.#lastPvSampleTs = now;
        return this.#dailyPvWh;
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
                this.error(`Failed to calculate daily yield: ${utilFunctions.formatError(error)}`);
            }
        } else {
            // Ensure non-negative values (fishy values coming for at least one user)
            const dailyYield = Math.max(readings.dailyYield || 0.0, 0.0);
            await this._updateProperty('meter_power', decodeData.formatWHasKWH(dailyYield));
        }
    }

    async updateOperationalStatus(condition, status) {
        // Update condition if valid and not unknown
        if (condition && !condition.startsWith('UNKNOWN')) {
            await this._updateProperty('operational_status.health', condition);
        }

        // Update status, skip odd readings that show 0 as condition
        // There is no mapping for 0, so it is an unknown value (UNKNOWN (0))
        if (status && !status.includes('(0)')) {
            await this._updateProperty('operational_status', status);
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
            this.error(`Failed to process inverter properties event: ${utilFunctions.formatError(err)}`);
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

            // Reset the integrated hybrid PV daily yield as well
            this.#dailyPvWh = 0;
            this.#lastPvSampleTs = null;
            await this.setStoreValue('dailyPvYieldWh', 0);
            if (this.isHybrid()) {
                await this._updateProperty('meter_power', 0);
            }
        } catch (reason) {
            this.error(utilFunctions.formatError(reason));
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
                this.error(utilFunctions.formatError(reason));
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
            this.error(`Failed to update isDailyYieldManual: ${utilFunctions.formatError(err)}`);
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

        // On hybrid inverters measure_power reports PV (DC) production rather than
        // AC grid power, so relabel the capability accordingly.
        if (this.isHybrid()) {
            await this.updateCapabilityOptions('measure_power', {
                title: { en: 'PV power', nl: 'PV-vermogen', sv: 'PV-effekt' }
            });
        }
    }

    async setupCapabilities() {
        this.log(`[${this.getName()}] Setting up capabilities`);

        const capabilities = this.api.getDeviceCapabilities();
        const capabilityKeys = Object.values(capabilities);

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
            await this.driver.triggerInverterStatusChanged(this, tokens).catch(error => { this.error(utilFunctions.formatError(error)) });

        } else if (key === 'operational_status.health') {
            const tokens = {
                inverter_condition: value || 'n/a'
            };
            await this.driver.triggerInverterConditionChanged(this, tokens).catch(error => { this.error(utilFunctions.formatError(error)) });
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
