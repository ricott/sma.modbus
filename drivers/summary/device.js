'use strict';

const Homey = require('homey');
const { ManagerDrivers } = require('homey');

class SummaryDevice extends Homey.Device {

    onInit() {
        this.log(`SMA summary initiated, '${this.getName()}'`);

        this.pollIntervals = [];
        this.summary = {
            name: this.getName(),
            polling: this.getSettings().polling
        };

        this._initilializeTimers();
    }

    updateValues() {

        let battery_charge = 0;
        let battery_discharge = 0;
        ManagerDrivers.getDriver('storage').getDevices().forEach(function(inverter) {
            battery_charge = battery_charge + inverter.getCapabilityValue('measure_power.charge');
            battery_discharge = battery_discharge + inverter.getCapabilityValue('measure_power.discharge')
        });
        this._updateProperty('power_drawn.battery', (battery_charge - battery_discharge));

        let power_pv = 0;
        ManagerDrivers.getDriver('inverter').getDevices().forEach(function(inverter) {
            power_pv = power_pv + inverter.getCapabilityValue('measure_power');
        });
        this._updateProperty('power_pv', power_pv);

        let power_grid = 0;
        let surplus = 0;
        ManagerDrivers.getDriver('energy').getDevices().forEach(function(em) {
            power_grid = power_grid + em.getCapabilityValue('measure_power');
            surplus = surplus + em.getCapabilityValue('measure_power.surplus');
        });
        //Will be negative if there is a surplus
        this._updateProperty('power_grid', (power_grid - surplus));
        this._updateProperty('power_self', ((power_pv + power_grid + battery_discharge) - surplus));
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
        let change = false;
        if (changedKeysArr.indexOf("polling") > -1) {
            this.log('Polling value was change to:', newSettings.polling);
            this.summary.polling = newSettings.polling;
            change = true;
        }

        if (change) {
            this._reinitializeTimers();
        }
    }

}

module.exports = SummaryDevice;
