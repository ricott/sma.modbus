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
            inverterId: this.getSettings().inverterId
        };



        this._initilializeTimers();
    }

    updateValues() {

        let inverter = ManagerDrivers.getDriver('inverter').getDevice({ id: this.summary.inverterId });
        this._updateProperty('power_pv', inverter.getCapabilityValue('measure_power'));

        //this._updateProperty('measure_power.grid', readings.acPowerPV || 0);
        //this._updateProperty('measure_power.self', readings.psurplus || 0);

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
        let change = false;
        if (changedKeysArr.indexOf("polling") > -1) {
            this.log('Polling value was change to:', newSettings.polling);
            this.summary.polling = newSettings.polling;
            change = true;
        }

        if (change) {
            //TODO refresh polling interval
        }
    }

}

module.exports = SummaryDevice;
