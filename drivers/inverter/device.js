'use strict';

const spacetime = require('spacetime');
const BaseDevice = require('../baseDevice.js');
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

class InverterDevice extends BaseDevice {

    #capabilityListenersRegistered = false;

    async onInit() {
        // Register device triggers
        this._inverter_status_changed = this.homey.flow.getDeviceTriggerCard('inverter_status_changed');
        this._inverter_condition_changed = this.homey.flow.getDeviceTriggerCard('inverter_condition_changed');
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
        this.api.on('readings', async (readings) => {
            await this.onDataReceived();

            if (this.getSetting('isDailyYieldManual') == 'true') {
                try {
                    const calculatedDailyYield = await this.calculateDailyYield(readings.totalYield);
                    //this.log(`[${this.getName()}] Calculated daily yield '${calculatedDailyYield}'`);
                    //Fishy values coming for at least one user with negative daily yield
                    //Lets make sure it is not negative
                    const dailyYield = Math.max(calculatedDailyYield, 0.0);
                    await this._updateProperty('meter_power', decodeData.formatWHasKWH(dailyYield));
                } catch (error) {
                    this.error('Failed to calculate daily yield:', error);
                }
            } else {
                //Fishy values coming for at least one user with negative daily yield
                //Lets make sure it is not negative
                const dailyYield = Math.max(readings.dailyYield || 0.0, 0.0);
                await this._updateProperty('meter_power', decodeData.formatWHasKWH(dailyYield));
            }

            await this._updateProperty('measure_power', readings.acPowerTotal || 0);
            await this._updateProperty('measure_voltage', readings.acVoltageL1 || 0);
            await this._updateProperty('measure_voltage.l2', readings.acVoltageL2 || 0);
            await this._updateProperty('measure_voltage.l3', readings.acVoltageL3 || 0);
            //Ignore occasional 0 values for the total yield
            if (readings.totalYield && readings.totalYield > 0) {
                await this._updateProperty('measure_yield', decodeData.formatWHasKWH(readings.totalYield));
            }

            //New capabilities
            if (readings.condition && !readings.condition.startsWith('UNKNOWN')) {
                await this._updateProperty('operational_status.health', readings.condition);
            }
            //Skip the odd redings that sometimes appear that show 0 as condition
            //There is no mapping for 0, so it is an unknown value
            //Value here would be UNKNOW (0)
            if (readings.status && readings.status.indexOf('(0)') == -1) {
                await this._updateProperty('operational_status', readings.status);
            }
            if (readings.batteryStatus && readings.batteryStatus.indexOf('(0)') == -1) {
                await this._updateProperty('operational_status.battery', readings.batteryStatus);
            }
            await this._updateProperty('measure_voltage.dcA', readings.dcVoltageA || 0);
            await this._updateProperty('measure_voltage.dcB', readings.dcVoltageB || 0);
            await this._updateProperty('measure_voltage.dcC', readings.dcVoltageC || 0);
            await this._updateProperty('measure_power.dcA', readings.dcPowerA || 0);
            await this._updateProperty('measure_power.dcB', readings.dcPowerB || 0);
            await this._updateProperty('measure_power.dcC', readings.dcPowerC || 0);

            await this._updateProperty('measure_battery', Number.isNaN(readings.batterySoC) ? 0 : readings.batterySoC);
            //Adjust active power to be <= max power
            const activePower = Math.min(Number(this.getSetting('maxPower')), readings.targetPower || 0);
            await this._updateProperty('target_power', activePower);

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
            await this._updateProperty('measure_power.battery', batteryPower);

        });

        this.api.on('properties', async (properties) => {
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
                this.error('Failed to update settings', err);
            }
        });

        this.api.on('error', async (error) => {
            this.error(`[${this.getName()}] Houston we have a problem`, error);

            // Use BaseDevice's communication error handling
            await this.onCommunicationError(error);

            let message = '';
            if (this.isError(error)) {
                message = error.stack;
            } else {
                try {
                    message = JSON.stringify(error, null, "  ");
                } catch (e) {
                    this.log('Failed to stringify object', e);
                    message = error.toString();
                }
            }

            const dateTime = new Date().toISOString();
            try {
                await this.setSettings({ sma_last_error: dateTime + '\n' + message });
            } catch (err) {
                this.error('Failed to update settings sma_last_error', err);
            }
        });
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
        await this.setStoreValue('totalYieldAtMidnight', 0)
            .catch(reason => {
                this.error(reason);
            });
    }

    async calculateDailyYield(totalYield) {
        //Check if we have totalYield from midnight saved
        let totalYieldAtMidnight = this.getStoreValue('totalYieldAtMidnight') || 0;
        if (totalYieldAtMidnight == 0) {
            this.log(`[${this.getName()}] Total yield store value is '0', setting it to '${totalYield}'`);
            await this.setStoreValue('totalYieldAtMidnight', totalYield)
                .catch(reason => {
                    this.error(reason);
                });
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

    async triggerDeviceTriggers(key, value) {
        if (key === 'operational_status') {
            let tokens = {
                inverter_status: value || 'n/a'
            }
            this._inverter_status_changed.trigger(this, tokens, {}).catch(error => { this.error(error) });

        } else if (key === 'operational_status.health') {
            let tokens = {
                inverter_condition: value || 'n/a'
            }
            this._inverter_condition_changed.trigger(this, tokens, {}).catch(error => { this.error(error) });
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
