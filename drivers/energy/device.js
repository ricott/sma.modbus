'use strict';

const Homey = require('homey');
const EnergyMeter = require('../../lib/sma_em.js');

class EnergyDevice extends Homey.Device {

  onInit() {
    this.log(`SMA energy meter initiated, '${this.getName()}'`);

    this.energy = {
      name: this.getName(),
      polling: this.getSettings().polling,
      serialNo: this.getData().id,
      properties: null,
      readings: null,
      emSession: null
    };

    //Update serial number setting
    this.setSettings({serialNo: String(this.energy.serialNo)})
      .catch(err => {
        this.error('Failed to update settings', err);
      });

    this.setupEMSession();
  }

  setupEMSession() {
    this.energy.emSession = new EnergyMeter({
      serialNo: this.energy.serialNo,
      refreshInterval: this.energy.polling
    });

    this.initializeEventListeners();
  }

  initializeEventListeners() {

    this.energy.emSession.on('readings', readings => {
      this.energy.readings = readings;

      this._updateProperty('measure_power.grid', readings.pregard);
      this._updateProperty('measure_power.surplus', readings.psurplus);

      this._updateProperty('measure_power.L1', (readings.pregardL1 - readings.psurplusL1));
      this._updateProperty('measure_current.L1', readings.currentL1);
      this._updateProperty('measure_power.L2', (readings.pregardL2 - readings.psurplusL2));
      this._updateProperty('measure_current.L2', readings.currentL2);
      this._updateProperty('measure_power.L3', (readings.pregardL3 - readings.psurplusL3));
      this._updateProperty('measure_current.L3', readings.currentL3);

    });

    this.energy.emSession.on('properties', properties => {
      this.energy.properties = properties;

      this.setSettings({serialNo: String(properties.serialNo)})
        .catch(err => {
          this.error('Failed to update settings', err);
        });

    });

    this.energy.emSession.on('error', error => {
      this.error('Houston we have a problem', error);

      let message = '';
      if (this.isError(error)) {
        message = error.stack;
      } else {
        try {
          message = JSON.stringify(error, null, "  ");
        } catch(e) {
          this.log('Failed to stringify object', e);
          message = error.toString();
        }
      }

      let dateTime = new Date().toISOString();
      this.setSettings({sma_last_error: dateTime + '\n' + message})
        .catch(err => {
          this.error('Failed to update settings', err);
        });
    });
  }

  isError(err) {
    return (err && err.stack && err.message);
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
    this.log(`Deleting SMA energy meter '${this.getName()}' from Homey.`);
    this.energy.emSession.disconnect();
    this.energy.emSession = null;
  }

  onRenamed (name) {
    this.log(`Renaming SMA energy meter from '${this.energy.name}' to '${name}'`);
    this.energy.name = name;
  }

    async onSettings(oldSettings, newSettings, changedKeysArr) {
        let change = false;
        if (changedKeysArr.indexOf("polling") > -1) {
            this.log('Polling value was change to:', newSettings.polling);
            this.energy.polling = newSettings.polling;
            change = true;
        }

        if (change) {
            //TODO refresh polling interval
        }
    }

}

module.exports = EnergyDevice;
