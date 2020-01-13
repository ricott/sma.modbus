'use strict';

const Homey = require('homey');
const SMA = require('../../lib/sma.js');

const deviceCapabilitesList = ['measure_power',
                              'meter_power',
                              'measure_voltage',
                              'measure_yield',
                              'operational_status.health',
                              'operational_status',
                              'measure_voltage.dcA',
                              'measure_voltage.dcB'];

class InverterDevice extends Homey.Device {

  onInit() {
    this.log(`SMA inverter initiated, '${this.getName()}'`);

    //New class in Homey v3, update existing devices to new class
    if (this.getClass() !== 'solarpanel') {
      this.setClass('solarpanel');
    }

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

        //Existing capabilities
      this._updateProperty('measure_power', readings.acPowerTotal || 0);
      this._updateProperty('meter_power', readings.dailyYield || 0.0);
      this._updateProperty('measure_voltage', readings.acVoltageL1 || 0);
      this._updateProperty('measure_yield', readings.totalYield || 0.0);

      //New capabilities
      if (readings.condition && !readings.condition.startsWith('UNKNOWN')) {
        this._updateProperty('operational_status.health', readings.condition || 'n/a');
      }
      //Skip the odd redings that sometimes appear that show 0 as condition
      //There is no mapping for 0, so it is an unknown value
      if (readings.status && !readings.status.startsWith('UNKNOWN')) {
        this._updateProperty('operational_status', readings.status);
      }
      this._updateProperty('measure_voltage.dcA', readings.dcVoltageA || 0);
      this._updateProperty('measure_voltage.dcB', readings.dcVoltageB || 0);
    });

    this.inverter.smaApi.on('properties', properties => {
      this.inverter.properties = properties;

      this.setSettings({deviceType: String(properties.deviceType),
                        serialNo: String(properties.serialNo),
                        swVersion: String(properties.swVersion || 'unknown'),
                        maxPower: String(properties.maxPower || 'unknown'),
                        activePowerLimit: String(properties.activePowerLimit || 'unknown'),
                        gridCountry: String(properties.gridCountry || 'unknown')})
        .catch(err => {
          this.error('Failed to update settings', err);
        });

      //When properties are read we have the device type needed to know capabilities
      this.setupCapabilities();
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

  setupCapabilities() {
    this.log('Setting up capabilities')
    let capabilities = this.inverter.smaApi.getDeviceCapabilities();
    let capabilityKeys = Object.values(capabilities);

    deviceCapabilitesList.forEach(capability => {
      if (capabilityKeys.includes(capability)) {
        //Device should have capability
        if (!this.hasCapability(capability)) {
          this.log(`Adding missing capability '${capability}'`);
          this.addCapability(capability);
        } else {
          this.log(`Device has capability '${capability}'`);
        }
      } else {
        //Device doesnt have capability, remove it
        this.log(`Removing capability '${capability}'`);
        this.removeCapability(capability);
      }
    });
  }

  isError(err) {
    return (err && err.stack && err.message);
  }

  _updateProperty(key, value) {
    if (this.hasCapability(key)) {
      let oldValue = this.getCapabilityValue(key);
      //If oldValue===null then it is a newly added device, lets not trigger flows on that
      if (oldValue !== null && oldValue != value) {
          //this.log(`[${this.getName()}] Updating capability '${key}' from '${oldValue}' to '${value}'`);
          this.setCapabilityValue(key, value);
  
          if (key === 'operational_status') {
            let tokens = {
              inverter_status: value || 'n/a'
            }
            this.getDriver().triggerFlow('trigger.inverter_status_changed', tokens, this);

          } else if (key === 'operational_status.health') {
            let tokens = {
              inverter_condition: value || 'n/a'
            }
            this.getDriver().triggerFlow('trigger.inverter_condition_changed', tokens, this);
          }
          
      } else {
        //Update value to show we are doing it in app
        //this.log(`[${this.getName()}] (NoDiff) Updating capability '${key}' from '${oldValue}' to '${value}'`);
        this.setCapabilityValue(key, value);
      }
    }
  }

  onDeleted() {
    this.log(`Deleting SMA inverter '${this.getName()}' from Homey.`);
    this.destroySMASession();
  }

  onRenamed (name) {
    this.log(`Renaming SMA inverter from '${this.inverter.name}' to '${name}'`);
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

module.exports = InverterDevice;
