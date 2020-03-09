'use strict';

const Homey = require('homey');
const { ManagerDrivers } = require('homey');

class SummaryDevice extends Homey.Device {

    onInit() {
        this.log(`SMA summary initiated, '${this.getName()}'`);

        this.pollIntervals = [];
        this.summary = {
            name: this.getName(),
            polling: this.getSettings().polling,
            showMPP: this.getSettings().show_mpp,
            invertersMPPConfig: null
        };

        this.summary.invertersMPPConfig = this.getInverterMPPConfig();
        this.setupCapabilities();
        this._initilializeTimers();
    }

    setupCapabilities() {
        this.log('Setting up capabilities');
        if (this.summary.showMPP === 'yes') {
            if (this.summary.invertersMPPConfig.MPP_A) {
                this.showCapability('power_pv.dcA', this.summary.invertersMPPConfig.MPP_A_LBL);
            }
            if (this.summary.invertersMPPConfig.MPP_B) {
                this.showCapability('power_pv.dcB', this.summary.invertersMPPConfig.MPP_B_LBL);
            }
        } else {
            this.hideCapability('power_pv.dcA');
            this.hideCapability('power_pv.dcB');
        }
    }

    showCapability(capabilityName, label) {
        //Device should have capability
        if (!this.hasCapability(capabilityName)) {
            this.log(`Adding missing capability '${capabilityName}' with label '${label}'`);
            this.addCapability(capabilityName);
            this.setCapabilityOptions(capabilityName, {title: { en: label}});
        } else {
            this.log(`Device has capability '${capabilityName}'`);
        }
    }

    hideCapability(capabilityName) {
        //Device doesnt have capability, remove it
        this.log(`Removing capability '${capabilityName}'`);
        this.removeCapability(capabilityName);
    }

    getInverterMPPConfig() {
        let mpp = {MPP_A: true, MPP_A_LBL: '' ,MPP_B: true, MPP_B_LBL: ''};
        ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
            if (!inverter.hasCapability('measure_power.dcA')) {
                mpp.MPP_A = false;
            } else {
                mpp.MPP_A_LBL = inverter.getCapabilityOptions('measure_power.dcA').title.en;
            }
            if (!inverter.hasCapability('measure_power.dcB')) {
                mpp.MPP_B = false;
            } else {
                mpp.MPP_B_LBL = inverter.getCapabilityOptions('measure_power.dcB').title.en;
            }
        });
        return mpp;
    }

    updateValues() {

        let battery_charge = 0;
        let battery_discharge = 0;
        ManagerDrivers.getDriver('storage').getDevices().forEach(function (inverter) {
            battery_charge = battery_charge + inverter.getCapabilityValue('measure_power.charge');
            battery_discharge = battery_discharge + inverter.getCapabilityValue('measure_power.discharge')
        });
        this._updateProperty('power_drawn.battery', (battery_charge - battery_discharge));

        let power_pv = 0;
        let power_MPPA = 0;
        let power_MPPB = 0;
        ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
            power_pv = power_pv + inverter.getCapabilityValue('measure_power');
            power_MPPA = power_MPPA + inverter.getCapabilityValue('measure_power.dcA') || 0;
            power_MPPB = power_MPPB + inverter.getCapabilityValue('measure_power.dcB') || 0;
        });
        this._updateProperty('power_pv', power_pv);
        this._updateProperty('power_pv.dcA', power_MPPA);
        this._updateProperty('power_pv.dcB', power_MPPB);

        let power_grid = 0;
        let surplus = 0;
        ManagerDrivers.getDriver('energy').getDevices().forEach(function (em) {
            power_grid = power_grid + em.getCapabilityValue('measure_power');
            surplus = surplus + em.getCapabilityValue('measure_power.surplus');
        });
        //Will be negative if there is a surplus
        this._updateProperty('power_grid', (power_grid - surplus));
        this._updateProperty('power_self', ((power_pv + power_grid + battery_discharge) - (surplus + battery_charge)));
    }

    _initilializeTimers() {
        this.log('Adding timers');
        this.pollIntervals.push(setInterval(() => {
            this.updateValues();
        }, 1000 * this.summary.polling));
    }

    _deleteTimers() {
        //Kill interval object(s)
        this.log('Removing timers');
        this.pollIntervals.forEach(timer => {
            clearInterval(timer);
        });
    }

    _reinitializeTimers() {
        this._deleteTimers();
        this._initilializeTimers();
    }

    _updateProperty(key, value) {
        if (this.hasCapability(key)) {
            let oldValue = this.getCapabilityValue(key);
            if (oldValue !== null && oldValue != value) {
                this.setCapabilityValue(key, value);
                //Placeholder for trigger logic

            } else {
                this.setCapabilityValue(key, value);
            }
        }
    }

    onDeleted() {
        this.log(`Deleting SMA summary '${this.getName()}' from Homey.`);
        this._deleteTimers();
    }

    onRenamed(name) {
        this.log(`Renaming SMA summary from '${this.summary.name}' to '${name}'`);
        this.summary.name = name;
    }

    async onSettings(oldSettings, newSettings, changedKeysArr) {

        if (changedKeysArr.indexOf("polling") > -1) {
            this.log('Polling value was change to:', newSettings.polling);
            this.summary.polling = newSettings.polling;
            this._reinitializeTimers();
        }

        if (changedKeysArr.indexOf("show_mpp") > -1) {
            this.log('Show MPP value was change to:', newSettings.show_mpp);
            this.summary.showMPP = newSettings.show_mpp;
            this.summary.invertersMPPConfig = this.getInverterMPPConfig();
            this.setupCapabilities();
        }
    }
}

module.exports = SummaryDevice;
