'use strict';

const { Device } = require('homey');
const SMA = require('../../lib/sma.js');
const decodeData = require('../../lib/decodeData.js');

const deviceCapabilitesList = ['measure_power',
  'meter_power',
  'measure_voltage',
  'measure_yield',
  'operational_status.health',
  'operational_status',
  'measure_voltage.dcA',
  'measure_voltage.dcB',
  'measure_power.dcA',
  'measure_power.dcB'];

class InverterDevice extends Device {

  async onInit() {
    this.log(`[${this.getName()}] SMA inverter initiated`);

    //New class in Homey v3, update existing devices to new class
    if (this.getClass() !== 'solarpanel') {
      this.setClass('solarpanel');
    }

    this.inverter = {
      name: this.getName(),
      address: this.getSettings().address,
      port: this.getSettings().port,
      polling: this.getSettings().polling,
      mppAName: this.getSettings().mpp_a_name,
      mppBName: this.getSettings().mpp_b_name,
      manualDailyYield: false,
      currentDailyYield: 0,
      properties: null,
      readings: null,
      smaApi: null
    };

    this.setupSMASession();
    this.resetAtMidnight();
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
      this.log(`[${this.getName()}] Disconnecting the inverter`);
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
      let dailyYield = readings.dailyYield || 0.0
      if (this.inverter.manualDailyYield) {
        dailyYield = this.calculateDailyYield(readings.totalYield);
      }
      //Fishy values coming for at least one user with negative daily yield
      //Lets make sure it is not negative
      dailyYield = Math.max(dailyYield, 0.0);
      this.inverter.currentDailyYield = dailyYield;
      this._updateProperty('meter_power', decodeData.formatWHasKWH(dailyYield));

      this._updateProperty('measure_power', readings.acPowerTotal || 0);
      this._updateProperty('measure_voltage', readings.acVoltageL1 || 0);
      this._updateProperty('measure_yield', decodeData.formatWHasMWH(readings.totalYield || 0.0));

      //New capabilities
      if (readings.condition && !readings.condition.startsWith('UNKNOWN')) {
        this._updateProperty('operational_status.health', readings.condition || 'n/a');
      }
      //Skip the odd redings that sometimes appear that show 0 as condition
      //There is no mapping for 0, so it is an unknown value
      //Value here would be UNKNOW (0)
      if (readings.status && readings.status.indexOf('(0)') == -1) {
        this._updateProperty('operational_status', readings.status);
      }
      this._updateProperty('measure_voltage.dcA', readings.dcVoltageA || 0);
      this._updateProperty('measure_voltage.dcB', readings.dcVoltageB || 0);
      this._updateProperty('measure_power.dcA', readings.dcPowerA || 0);
      this._updateProperty('measure_power.dcB', readings.dcPowerB || 0);
    });

    this.inverter.smaApi.on('properties', properties => {
      this.inverter.properties = properties;

      this.setSettings({
        deviceType: String(properties.deviceType),
        serialNo: String(properties.serialNo),
        swVersion: String(properties.swVersion || 'unknown'),
        maxPower: String(properties.maxPower || 'unknown'),
        activePowerLimit: String(properties.activePowerLimit || 'unknown'),
        gridCountry: String(properties.gridCountry || 'unknown')
      })
        .catch(err => {
          this.error('Failed to update settings', err);
        });

      //When properties are read we have the device type needed to know capabilities
      this.setupCapabilities();
      this.assignCapabilityNames();
      this.shouldWeCalculateDailyYield();
    });

    this.inverter.smaApi.on('error', error => {
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

      let dateTime = new Date().toISOString();
      this.setSettings({ sma_last_error: dateTime + '\n' + message })
        .catch(err => {
          this.error('Failed to update settings', err);
        });
    });
  }

  getCurrentDailyYield() {
    return this.inverter.currentDailyYield;
  }

  resetAtMidnight() {
    let night = new Date();
    night.setDate(night.getDate() + 1)
    night.setHours(0);
    night.setMinutes(0);
    night.setSeconds(1);
    night.setMilliseconds(0);
    let timeToMidnight = night.getTime() - new Date().getTime();

    setTimeout(() => {
      this.log(`[${this.getName()}] Resetting total yield at midnight`);

      this.resetDailyYield();
      this.resetAtMidnight();
    }, timeToMidnight);
  }

  resetDailyYield() {
    this.setStoreValue('totalYieldAtMidnight', 0);
  }

  calculateDailyYield(totalYield) {
    //Check if we have totalYield from midnight saved
    let totalYieldAtMidnight = this.getStoreValue('totalYieldAtMidnight') || 0;
    if (totalYieldAtMidnight === 0) {
      this.log(`[${this.getName()}] Total yield store value is '0', setting it to '${totalYield}'`);
      this.setStoreValue('totalYieldAtMidnight', totalYield);
    }

    let dailyYield = totalYield - totalYieldAtMidnight;
    return dailyYield;
  }

  shouldWeCalculateDailyYield() {
    let manual = this.inverter.smaApi.isDailyYieldManual();
    this.log(`[${this.getName()}] Calculate manual daily yield: '${manual}'`);
    this.inverter.manualDailyYield = manual;
  }

  assignCapabilityNames() {
    this.log(`[${this.getName()}] Assigning new capability names`);
    if (this.hasCapability('measure_voltage.dcA')) {
      this.setCapabilityOptions('measure_voltage.dcA', { title: { en: this.inverter.mppAName } });
    }
    if (this.hasCapability('measure_power.dcA')) {
      this.setCapabilityOptions('measure_power.dcA', { title: { en: this.inverter.mppAName } });
    }
    if (this.hasCapability('measure_voltage.dcB')) {
      this.setCapabilityOptions('measure_voltage.dcB', { title: { en: this.inverter.mppBName } });
    }
    if (this.hasCapability('measure_power.dcB')) {
      this.setCapabilityOptions('measure_power.dcB', { title: { en: this.inverter.mppBName } });
    }
  }

  setupCapabilities() {
    this.log(`[${this.getName()}] Setting up capabilities`);

    let capabilities = this.inverter.smaApi.getDeviceCapabilities();
    let capabilityKeys = Object.values(capabilities);

    deviceCapabilitesList.forEach(capability => {
      if (capabilityKeys.includes(capability)) {
        //Device should have capability
        if (!this.hasCapability(capability)) {
          this.log(`[${this.getName()}] Adding missing capability '${capability}'`);
          this.addCapability(capability);
        } else {
          this.log(`[${this.getName()}] Device has capability '${capability}'`);
        }
      } else {
        //Device doesnt have capability, remove it
        this.log(`[${this.getName()}] Removing capability '${capability}'`);
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
          this.driver.triggerDeviceFlow('inverter_status_changed', tokens, this);

        } else if (key === 'operational_status.health') {
          let tokens = {
            inverter_condition: value || 'n/a'
          }
          this.driver.triggerDeviceFlow('inverter_condition_changed', tokens, this);
        }
      } else {
        //Update value to show we are doing it in app
        //this.log(`[${this.getName()}] (NoDiff) Updating capability '${key}' from '${oldValue}' to '${value}'`);
        this.setCapabilityValue(key, value);
      }
    }
  }

  onDeleted() {
    this.log(`[${this.getName()}] Deleting this SMA inverter from Homey.`);
    this.destroySMASession();
  }

  onRenamed(name) {
    this.log(`Renaming SMA inverter from '${this.inverter.name}' to '${name}'`);
    this.inverter.name = name;
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    let changeConn = false;
    let changeLabel = false;
    if (changedKeys.indexOf("address") > -1) {
      this.log(`[${this.getName()}] Address value was change to '${newSettings.address}'`);
      this.inverter.address = newSettings.address;
      changeConn = true;
    }
    if (changedKeys.indexOf("port") > -1) {
      this.log(`[${this.getName()}] Port value was change to '${newSettings.port}'`);
      this.inverter.port = newSettings.port;
      changeConn = true;
    }
    if (changedKeys.indexOf("polling") > -1) {
      this.log(`[${this.getName()}] Polling value was change to '${newSettings.polling}'`);
      this.inverter.polling = newSettings.polling;
      changeConn = true;
    }

    if (changedKeys.indexOf("mpp_a_name") > -1) {
      this.log(`[${this.getName()}] MPP A name was change to '${newSettings.mpp_a_name}'`);
      this.inverter.mppAName = newSettings.mpp_a_name;
      changeLabel = true;
    }
    if (changedKeys.indexOf("mpp_b_name") > -1) {
      this.log(`[${this.getName()}] MPP B name was change to '${newSettings.mpp_b_name}'`);
      this.inverter.mppBName = newSettings.mpp_b_name;
      changeLabel = true;
    }

    if (changeConn) {
      //We need to re-initialize the SMA session since setting(s) are changed
      this.reinitializeSMASession();
    }

    if (changeLabel) {
      this.assignCapabilityNames();
    }
  }

}

module.exports = InverterDevice;
