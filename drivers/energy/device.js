'use strict';

const EnergyMeter = require('../../lib/devices/energyMeter.js');
const utilFunctions = require('../../lib/util.js');
const BaseDevice = require('../baseDevice.js');

class EnergyDevice extends BaseDevice {

    async onInit() {
        this.log(`[${this.getName()}] SMA energy meter initiated`);

        this.phaseAlerts = {
            L1: false,
            L2: false,
            L3: false
        };

        this.api = null;

        //Update serial number setting
        await this.updateSetting('serialNo', this.getData().id);
        await this.upgradeDevice();
        await this.registerFlowTokens();

        this.setupEMAPI();
    }

    async upgradeDevice() {
        this.log('Upgrading existing device');
        // v2.0.9 added frequency capability, lets add it to existing devices
        await this.addCapabilityHelper('frequency');
        // v2.4.1 added meter_power import and export
        await this.addCapabilityHelper('meter_power');
        await this.addCapabilityHelper('meter_power.export');
        // v2.5.4 add voltage for all three phases
        await this.addCapabilityHelper('measure_voltage.L1');
        await this.addCapabilityHelper('measure_voltage.L2');
        await this.addCapabilityHelper('measure_voltage.L3');

        // v2.6.9 removed surplus power capability, instead show negative value for measure_power
        await this.removeCapabilityHelper('measure_power.surplus');
    }

    async registerFlowTokens() {
        this.log('Registering flow tokens');
        this.availCurrentToken = await this.homey.flow.createToken(`${this.getData().id}.availableCurrent`,
            {
                type: 'number',
                title: `${this.getName()} Available current`
            });
        this.pRegardCounterToken = await this.homey.flow.createToken(`${this.getData().id}.pregardcounter`,
            {
                type: 'number',
                title: `${this.getName()} Grid Import Meter`
            });
        this.pSurplusCounterToken = await this.homey.flow.createToken(`${this.getData().id}.psurpluscounter`,
            {
                type: 'number',
                title: `${this.getName()} Grid Export Meter`
            });
    }

    async setupEMAPI() {
        this.api = new EnergyMeter({
            serialNo: this.getData().id,
            refreshInterval: this.getSetting('polling'),
            device: this
        });

        await this.initializeEventListeners();
    }

    async initializeEventListeners() {
        this.api.on('readings', this.handleReadingsEvent.bind(this));
        this.api.on('error', this._handleErrorEvent.bind(this));
    }

    async handleReadingsEvent(readings) {
        try {
            // Destructure readings for cleaner code
            const {
                pregard, psurplus, frequency, pregardcounter, psurpluscounter, swVersion,
                pregardL1, psurplusL1, currentL1, voltageL1,
                pregardL2, psurplusL2, currentL2, voltageL2,
                pregardL3, psurplusL3, currentL3, voltageL3
            } = readings;

            // Update all capabilities in parallel
            await Promise.all([
                // Total power and frequency
                this._updateProperty('measure_power', pregard - psurplus),
                this._updateProperty('frequency', frequency),
                this._updateProperty('meter_power', pregardcounter),
                this._updateProperty('meter_power.export', psurpluscounter),

                // Phase L1
                this._updateProperty('measure_power.L1', pregardL1 - psurplusL1),
                this._updateProperty('measure_current.L1', currentL1),
                this._updateProperty('measure_voltage.L1', voltageL1),

                // Phase L2
                this._updateProperty('measure_power.L2', pregardL2 - psurplusL2),
                this._updateProperty('measure_current.L2', currentL2),
                this._updateProperty('measure_voltage.L2', voltageL2),

                // Phase L3
                this._updateProperty('measure_power.L3', pregardL3 - psurplusL3),
                this._updateProperty('measure_current.L3', currentL3),
                this._updateProperty('measure_voltage.L3', voltageL3)
            ]);

            // Update software version if available
            if (swVersion !== 0) {
                await this.updateSetting('swVersion', swVersion);
            }

            // Update flow tokens
            this.pRegardCounterToken.setValue(pregardcounter);
            this.pSurplusCounterToken.setValue(psurpluscounter);

            // Calculate available current (zero out phases with surplus)
            const adjustedCurrents = [
                psurplusL1 > 0 ? 0 : currentL1,
                psurplusL2 > 0 ? 0 : currentL2,
                psurplusL3 > 0 ? 0 : currentL3
            ];

            const { mainFuse, offset } = this.getSettings();
            const maxCurrent = Math.max(...adjustedCurrents);
            const availableCurrent = Math.max(0, Math.round(mainFuse - maxCurrent - offset));

            this.availCurrentToken.setValue(availableCurrent);
        } catch (error) {
            this.error('Failed to process readings event:', error);
        }
    }

    async _handlePropertyTriggers(key, value) {
        if (key === 'measure_current.L1' ||
            key === 'measure_current.L2' ||
            key === 'measure_current.L3') {

            const mainFuse = this.getSetting('mainFuse');
            const threshold = this.getSetting('threshold');
            let phase = key.substring(key.indexOf('.') + 1);
            let utilization = (value / mainFuse) * 100;
            if (utilization >= threshold) {
                if (this.phaseAlerts[phase] === false) {
                    //Only trigger if this is new threshold alert
                    utilization = parseFloat(utilization.toFixed(2));
                    this.phaseAlerts[phase] = true;
                    let tokens = {
                        phase: phase,
                        percentageUtilized: utilization
                    }
                    await this.driver.triggerPhaseThresholdTriggered(this, tokens).catch(error => { this.error(error) });
                }
            } else if (this.phaseAlerts[phase] === true) {
                //Reset alert
                this.log(`Resetting phase alert state for '${key}'`);
                this.phaseAlerts[phase] = false;
            }
        }
    }

    onDeleted() {
        this.log(`[${this.getName()}] Deleting SMA energy meter from Homey.`);
        this.homey.flow.unregisterToken(this.availCurrentToken);
        this.homey.flow.unregisterToken(this.pRegardCounterToken);
        this.homey.flow.unregisterToken(this.pSurplusCounterToken);
        this.api.disconnect();
        this.api = null;
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        let change = false;
        if (changedKeys.indexOf("polling") > -1) {
            this.log('Polling value was change to:', newSettings.polling);
            this.api.setRefreshInterval(newSettings.polling);
        }

        if (changedKeys.indexOf("offset") > -1) {
            this.log('Offset value was change to:', newSettings.offset);
            change = true;
        }

        if (changedKeys.indexOf("mainFuse") > -1) {
            this.log('Main fuse value was change to:', newSettings.mainFuse);
            change = true;
        }

        if (changedKeys.indexOf("threshold") > -1) {
            this.log('Threshold value was change to:', newSettings.threshold);
            change = true;
        }

        if (change) {
            //Theshold changed, reset alerts
            this.phaseAlerts = {
                L1: false,
                L2: false,
                L3: false
            };
        }
    }

}

module.exports = EnergyDevice;
