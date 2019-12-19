'use strict';

const Homey = require('homey');
const { ManagerDrivers } = require('homey');
const PVOutputClient = require('../../lib/pvoutputClient.js');
//Encryption settings
const crypto = require('crypto');
const crypto_algorithm = 'aes-256-ctr';

class PVOutputDevice extends Homey.Device {

  onInit() {
    this.log(`SMA PVOutput initiated, '${this.getName()}'`);

    this.pollIntervals = [];
    this.pvoutput = {
      name: this.getName(),
      interval: this.getSettings().interval,
      systemId: this.getData().id,
      start_reporting: this.getSettings().start_reporting,
      stop_reporting: this.getSettings().stop_reporting,
      session: null
    };
    this.apikey_setting = `${this.pvoutput.systemId}.apikey`;

    if (!Homey.ManagerSettings.get(this.apikey_setting)) {
      //This is a newly added device, lets copy api key to homey settings
      this.log(`Storing api key`);
      this.storeAPIKeyEncrypted();
    }

    this.pvoutput.session = new PVOutputClient({
      apikey: this.getAPIKey(),
      systemId: this.pvoutput.systemId
    });

    this._initilializeTimers();
  }

  _initilializeTimers() {
    this.log('Adding timers');
    // Start a poller, to check the device status
    this.pollIntervals.push(setInterval(() => {
      this.addStatus();
    }, this.pvoutput.interval * 60 * 1000));
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

  addStatus() {
    //Timer runs on interval, but only between start and stop hours
    if (this.shouldAddStatus()) {
      //this.log('We are with start and stop reporting hours, lets update PVOutput');
      let power_pv = 0;
      let yield_pv = 0;
      let voltage_pv = 0;
      //Sum values across all registered inverters
      //Most people will only have one, but lets support several
      let numberOfInverters = 0;
      ManagerDrivers.getDriver('inverter').getDevices().forEach(function (inverter) {
        numberOfInverters++;
        power_pv = power_pv + inverter.getCapabilityValue('measure_power');
        yield_pv = yield_pv + inverter.getCapabilityValue('meter_power');
        voltage_pv = voltage_pv + inverter.getCapabilityValue('measure_voltage');
      });
      //Lets get average voltage
      if (numberOfInverters > 1) {
        voltage_pv = Number(voltage_pv / numberOfInverters).toFixed(2);
      }
      //yield_pv is in kWh, lets make it Wh
      yield_pv = yield_pv * 1000;

      let self = this;
      this.pvoutput.session.publishStatus({
        yield: yield_pv,
        power: power_pv,
        voltage: voltage_pv
      })
        .then(function (result) {
          if (result.statusCode === 200) {
            self._updateProperty('connected', true);

          } else {
            self._updateProperty('connected', false);

            let dateTime = new Date().toISOString();
            self.setSettings({ last_error: dateTime + '\n' + result.response })
              .catch(err => {
                self.error('Failed to update settings', err);
              });
          }
        });
    }/* else {
      this.log(`Current time outside reporting hours, start '${this.pvoutput.start_reporting}', stop '${this.pvoutput.stop_reporting}'`);
    }*/
  }

  shouldAddStatus() {
    let timestamp = new Date();
    let time = Number(`${timestamp.getHours()}${timestamp.getMinutes()}`);
    //this.log(`Current time '${time}', start reporting '${this.pvoutput.start_reporting}', stop reporting '${this.pvoutput.stop_reporting}'`);
    if (time > this.pvoutput.start_reporting && time < this.pvoutput.stop_reporting) {
      return true;
    } else {
      return false;
    }
  }

  _updateProperty(key, value) {
    if (this.hasCapability(key)) {
      let oldValue = this.getCapabilityValue(key);
      if (oldValue !== null && oldValue != value) {
        this.setCapabilityValue(key, value);

      } else {
        this.setCapabilityValue(key, value);
      }
    }
  }

  onDeleted() {
    this.log(`Deleting SMA PVOutput '${this.getName()}' from Homey.`);
    Homey.ManagerSettings.unset(this.apikey_setting);
    this.pvoutput = null;
  }

  onRenamed(name) {
    this.log(`Renaming SMA PVOutput from '${this.energy.name}' to '${name}'`);
    this.pvoutput.name = name;
  }

  async onSettings(oldSettings, newSettings, changedKeysArr) {
    let change = false;
    if (changedKeysArr.indexOf("interval") > -1) {
      this.log('Interval value was change to:', newSettings.interval);
      this.pvoutput.interval = newSettings.interval;
      change = true;
    }

    if (changedKeysArr.indexOf("start_reporting") > -1) {
      this.log('Start reporting value was change to:', newSettings.start_reporting);
      this.pvoutput.start_reporting = newSettings.start_reporting;
    }
    if (changedKeysArr.indexOf("stop_reporting") > -1) {
      this.log('Stop reporting value was change to:', newSettings.stop_reporting);
      this.pvoutput.stop_reporting = newSettings.stop_reporting;
    }

    if (change) {
      this._reinitializeTimers();
    }
  }

  storeAPIKeyEncrypted() {
    this.log(`Encrypting api key`);
    let plaintextApikey = this.getStoreValue('apikey');
    Homey.ManagerSettings.set(this.apikey_setting, this.encryptText(plaintextApikey));

    //Remove unencrypted apikey passed from driver
    this.unsetStoreValue('apikey');
  }

  getAPIKey() {
    return this.decryptText(Homey.ManagerSettings.get(this.apikey_setting));
  }

  encryptText(plainText) {
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv(crypto_algorithm, Buffer.from(Homey.env.ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(plainText);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
  }

  decryptText(encryptedJson) {
    let iv = Buffer.from(encryptedJson.iv, 'hex');
    let encryptedText = Buffer.from(encryptedJson.encryptedData, 'hex');
    let decipher = crypto.createDecipheriv(crypto_algorithm, Buffer.from(Homey.env.ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

}

module.exports = PVOutputDevice;
