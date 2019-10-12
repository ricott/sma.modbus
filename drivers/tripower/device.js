'use strict';

const Homey = require('homey');
const SMA = require('../../lib/sma.js');

class TriPowerDevice extends Homey.Device {

  onInit() {
    this.log(`SMA inverter initiated, '${this.getName()}'`);

    this.inverter = {
      name: this.getName(),
      address: this.getSettings().address,
      port: this.getSettings().port,
      polling: this.getSettings().polling,
      properties: null,
      readings: null,
      smaApi: null
    };

    this.setupSMASession();
  }

  setupSMASession() {
    this.inverter.smaApi = new SMA({
      host: this.inverter.address,
      port: this.inverter.port,
      refreshInterval: this.inverter.polling
    });

    this.initializeEventListeners();
  }
  destroySMASession() {
    if (this.inverter.smaApi) {
      this.inverter.smaApi.disconnect();
    }
  }
  reinitializeSMASession() {
    this.destroySMASession();
    this.setupSMASession();
  }

  initializeEventListeners() {

    this.inverter.smaApi.on('readings', readings => {
      this.inverter.readings = readings;
        /* Currently not shown in app
        dcCurrentA: 0,
        dcCurrentB: 0,
        internalTemp: 0*/

        this._updateProperty('operational_status.health', readings.condition);
        this._updateProperty('operational_status', readings.status);
        this._updateProperty('powergrid_feed_in', readings.acPowerTotal);
        this._updateProperty('powergrid_voltage_in', readings.acVoltageL1);
        this._updateProperty('measure_voltage.dcA', readings.dcVoltageA);
        this._updateProperty('measure_voltage.dcB', readings.dcVoltageB);
        this._updateProperty('meter_power', readings.dailyYield);
        this._updateProperty('measure_yield', readings.totalYield);

    });

    this.inverter.smaApi.on('properties', properties => {
      this.inverter.properties = properties;

      this.setSettings({deviceType: String(properties.deviceType),
                        serialNo: String(properties.serialNo),
                        swVersion: String(properties.swVersion),
                        maxPower: String(properties.maxPower)})
        .catch(err => {
          this.error('Failed to update settings', err);
        });
    });

    this.inverter.smaApi.on('error', error => {
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
    let oldValue = this.getCapabilityValue(key);
    //If oldValue===null then it is a newly added device, lets not trigger flows on that
    if (oldValue !== null && oldValue != value) {
        //this.log(`[${this.getName()}] Updating capability '${key}' from '${oldValue}' to '${value}'`);
        this.setCapabilityValue(key, value);

        //Prepared for triggers, value changed from last value

    } else {
      //Update value to show we are doing it in app
      //this.log(`[${this.getName()}] (NoDiff) Updating capability '${key}' from '${oldValue}' to '${value}'`);
      this.setCapabilityValue(key, value);
    }
  }

  onDeleted() {
    this.log(`Deleting SMA inverter '${this.getName()}' from Homey.`);
    this.destroySMASession();
  }

  onRenamed (name) {
    this.log(`Renaming SMA inverter from '${this.inverter.name}' to '${name}'`)
    this.inverter.name = name;
  }

  async onSettings(oldSettings, newSettings, changedKeysArr) {
    let change = false;
		if (changedKeysArr.indexOf("address") > -1) {
			this.log('Address value was change to:', newSettings.address);
      this.inverter.address = newSettings.address;
      change = true;
		}
    if (changedKeysArr.indexOf("port") > -1) {
			this.log('Port value was change to:', newSettings.port);
      this.inverter.port = newSettings.port;
      change = true;
		}
    if (changedKeysArr.indexOf("polling") > -1) {
			this.log('Polling value was change to:', newSettings.polling);
      this.inverter.polling = newSettings.polling;
      change = true;
		}

    if (change) {
      //We need to re-initialize the SMA session since setting(s) are changed
      this.reinitializeSMASession();
    }
	}

}

module.exports = TriPowerDevice;
