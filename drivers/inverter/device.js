'use strict';

const { Device } = require('homey');
const spacetime = require('spacetime');
const SMA = require('../../lib/sma.js');
const decodeData = require('../../lib/decodeData.js');

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

const _defaultActivePower = 50000;

class InverterDevice extends Device {

    async onInit() {
        this.log(`[${this.getName()}] SMA inverter initiated`);
        this.smaApi = null;

        // Register device triggers
        this._inverter_status_changed = this.homey.flow.getDeviceTriggerCard('inverter_status_changed');
        this._inverter_condition_changed = this.homey.flow.getDeviceTriggerCard('inverter_condition_changed');

        this.setupSMASession();
        this.resetAtMidnight();
    }

    async setupCapabilityListeners() {

        this.registerCapabilityListener('target_power', async (power) => {
            this.log(`[${this.getName()}] Set active power limit to '${power}'`);
            // Adjust active power to be <= max power
            const activePower = Math.min(Number(this.getSetting('maxPower')), power);
            await this.smaApi.setMaxActivePowerOutput(activePower)
                .catch(reason => {
                    let msg = `Failed to set active power limit! Reason: ${reason.message}`;
                    this.error(msg);
                    return Promise.reject(new Error(msg));
                });
        });
    }

    setupSMASession() {
        this.smaApi = new SMA({
            host: this.getSetting('address'),
            port: this.getSetting('port'),
            refreshInterval: this.getSetting('polling'),
            device: this
        });

        this.initializeEventListeners();
    }
    destroySMASession() {
        if (this.smaApi) {
            this.log(`[${this.getName()}] Disconnecting the inverter`);
            this.smaApi.disconnect();
        }
    }
    reinitializeSMASession() {
        this.destroySMASession();
        this.setupSMASession();
    }

    initializeEventListeners() {

        this.smaApi.on('readings', (readings) => {
            var self = this;

            if (self.getSetting('isDailyYieldManual') == 'true') {
                self.calculateDailyYield(readings.totalYield)
                    .then(function (dailyYield) {
                        //self.log(`[${self.getName()}] Calculated daily yield '${dailyYield}'`);
                        //Fishy values coming for at least one user with negative daily yield
                        //Lets make sure it is not negative
                        dailyYield = Math.max(dailyYield, 0.0);
                        self._updateProperty('meter_power', decodeData.formatWHasKWH(dailyYield));
                    });
            } else {
                //Fishy values coming for at least one user with negative daily yield
                //Lets make sure it is not negative
                let dailyYield = readings.dailyYield || 0.0;
                dailyYield = Math.max(dailyYield, 0.0);
                this._updateProperty('meter_power', decodeData.formatWHasKWH(dailyYield));
            }

            this._updateProperty('measure_power', readings.acPowerTotal || 0);
            this._updateProperty('measure_voltage', readings.acVoltageL1 || 0);
            this._updateProperty('measure_voltage.l2', readings.acVoltageL2 || 0);
            this._updateProperty('measure_voltage.l3', readings.acVoltageL3 || 0);
            //Ignore occasional 0 values for the total yield
            if (readings.totalYield && readings.totalYield > 0) {
                this._updateProperty('measure_yield', decodeData.formatWHasKWH(readings.totalYield));
            }

            //New capabilities
            if (readings.condition && !readings.condition.startsWith('UNKNOWN')) {
                this._updateProperty('operational_status.health', readings.condition);
            }
            //Skip the odd redings that sometimes appear that show 0 as condition
            //There is no mapping for 0, so it is an unknown value
            //Value here would be UNKNOW (0)
            if (readings.status && readings.status.indexOf('(0)') == -1) {
                this._updateProperty('operational_status', readings.status);
            }
            if (readings.batteryStatus && readings.batteryStatus.indexOf('(0)') == -1) {
                this._updateProperty('operational_status.battery', readings.batteryStatus);
            }
            this._updateProperty('measure_voltage.dcA', readings.dcVoltageA || 0);
            this._updateProperty('measure_voltage.dcB', readings.dcVoltageB || 0);
            this._updateProperty('measure_voltage.dcC', readings.dcVoltageC || 0);
            this._updateProperty('measure_power.dcA', readings.dcPowerA || 0);
            this._updateProperty('measure_power.dcB', readings.dcPowerB || 0);
            this._updateProperty('measure_power.dcC', readings.dcPowerC || 0);

            this._updateProperty('measure_battery', Number.isNaN(readings.batterySoC) ? 0 : readings.batterySoC);
            //Adjust active power to be <= max power
            const activePower = Math.min(Number(this.getSetting('maxPower')), readings.targetPower || 0);
            this._updateProperty('target_power', activePower);

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
            this._updateProperty('measure_power.battery', batteryPower);

        });

        this.smaApi.on('properties', async (properties) => {

            await this.setSettings({
                deviceType: String(properties.deviceType),
                serialNo: String(properties.serialNo),
                swVersion: String(properties.swVersion || 'unknown'),
                maxPower: String(properties.maxPower || _defaultActivePower),
                gridCountry: String(properties.gridCountry || 'unknown')

            }).catch(err => {
                this.error('Failed to update settings', err);
            });

            //When properties are read we have the device type needed to know capabilities
            await this.setupCapabilities();
            await this.updateCapabilityProperties();
            await this.shouldWeCalculateDailyYield();
            await this.setupCapabilityListeners();

            //Update all the required properties first, then we start the timers to get readings
            this.smaApi.initilializeTimers();
        });

        this.smaApi.on('error', (error) => {
            this.error(`[${this.getName()}] Houston we have a problem`, error);

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
            this.setSettings({ sma_last_error: dateTime + '\n' + message })
                .catch(err => {
                    this.error('Failed to update settings sma_last_error', err);
                });
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
        const manual = this.smaApi.isDailyYieldManual();
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

        let capabilities = this.smaApi.getDeviceCapabilities();
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

    isError(err) {
        return (err && err.stack && err.message);
    }

    _updateProperty(key, value) {
        let self = this;
        if (self.hasCapability(key)) {
            if (typeof value !== 'undefined' && value !== null) {
                let oldValue = self.getCapabilityValue(key);
                if (oldValue !== null && oldValue != value) {

                    self.setCapabilityValue(key, value)
                        .then(function () {

                            if (key === 'operational_status') {
                                let tokens = {
                                    inverter_status: value || 'n/a'
                                }
                                self._inverter_status_changed.trigger(self, tokens, {}).catch(error => { self.error(error) });

                            } else if (key === 'operational_status.health') {
                                let tokens = {
                                    inverter_condition: value || 'n/a'
                                }
                                self._inverter_condition_changed.trigger(self, tokens, {}).catch(error => { self.error(error) });
                            }

                        }).catch(reason => {
                            self.error(reason);
                        });
                } else {
                    self.setCapabilityValue(key, value)
                        .catch(reason => {
                            self.error(reason);
                        });
                }

            } else {
                self.log(`[${self.getName()}] Value for capability '${key}' is 'undefined'`);
            }
        }
    }

    onDeleted() {
        this.log(`[${this.getName()}] Deleting this SMA inverter from Homey.`);
        this.destroySMASession();
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        let changeConn = false;
        let changeLabel = false;
        if (changedKeys.indexOf("address") > -1) {
            this.log(`[${this.getName()}] Address value was change to '${newSettings.address}'`);
            changeConn = true;
        }
        if (changedKeys.indexOf("port") > -1) {
            this.log(`[${this.getName()}] Port value was change to '${newSettings.port}'`);
            changeConn = true;
        }
        if (changedKeys.indexOf("polling") > -1) {
            this.log(`[${this.getName()}] Polling value was change to '${newSettings.polling}'`);
            changeConn = true;
        }

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

        if (changeConn) {
            //We need to re-initialize the SMA session since setting(s) are changed
            this.reinitializeSMASession();
        }

        if (changeLabel) {
            await this.updateCapabilityProperties();
        }
    }

    async removeCapabilityHelper(capability) {
        if (this.hasCapability(capability)) {
            try {
                this.log(`[${this.getName()}] Remove existing capability '${capability}'`);
                await this.removeCapability(capability);
            } catch (reason) {
                this.error(reason);
            }
        }
    }
    async addCapabilityHelper(capability) {
        if (!this.hasCapability(capability)) {
            try {
                this.log(`[${this.getName()}] Adding missing capability '${capability}'`);
                await this.addCapability(capability);
            } catch (reason) {
                this.error(reason);
            }
        }
    }

    async updateCapabilityOptions(capability, options) {
        if (this.hasCapability(capability)) {
            try {
                this.log(`[${this.getName()}] Updating capability options '${capability}'`);
                await this.setCapabilityOptions(capability, options);
            } catch (reason) {
                this.error(reason);
            }
        }
    }
}

module.exports = InverterDevice;
