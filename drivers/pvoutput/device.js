'use strict';

const Homey = require('homey');
const crypto = require('crypto');
const PVOutputClient = require('../../lib/pvoutputClient.js');
const utility = require('../../lib/util.js');
const decodeData = require('../../lib/modbus/decodeData.js');

const CRYPTO_ALGORITHM = 'aes-256-ctr';

class PVOutputDevice extends Homey.Device {

  async onInit() {
    this.log(`[${this.getName()}] SMA PVOutput initiated`);

    this.pvoutputSession = null;
    this.statusInterval = null;

    if (!this.homey.settings.get(`${this.getData().id}.apikey`)) {
      // Newly added device, copy api key to homey settings
      this.log(`[${this.getName()}] Storing api key`);
      this.storeAPIKeyEncrypted();
    }

    this.pvoutputSession = new PVOutputClient({
      apikey: this.getAPIKey(),
      systemId: this.getData().id
    });

    this._initializeTimers();
  }

  _initializeTimers() {
    this.log(`[${this.getName()}] Adding timers`);
    this._clearTimers();

    const intervalMs = this.getSetting('interval') * 60 * 1000;
    this.statusInterval = this.homey.setInterval(() => this.addStatus(), intervalMs);
  }

  _clearTimers() {
    if (this.statusInterval) {
      this.homey.clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  async addStatus() {
    if (!this.shouldAddStatus()) {
      return;
    }

    // Sum values across all registered inverters
    // Most people will only have one, but lets support several
    let power_pv = 0;
    let yield_pv = 0;
    let voltage_pv = 0;
    let numberOfInverters = 0;

    for (const inverter of this.homey.drivers.getDriver('inverter').getDevices()) {
      numberOfInverters++;
      power_pv += inverter.getCapabilityValue('measure_power');
      yield_pv += decodeData.formatKWHasWH(inverter.getCapabilityValue('meter_power'));
      voltage_pv += inverter.getCapabilityValue('measure_voltage');
    }

    // Average voltage across inverters
    if (numberOfInverters > 1) {
      voltage_pv = Number(voltage_pv / numberOfInverters).toFixed(2);
    }

    try {
      const result = await this.pvoutputSession.publishStatus(this.homey.clock.getTimezone(), {
        yield: yield_pv,
        power: power_pv,
        voltage: voltage_pv
      });

      if (result.statusCode === 200) {
        this._updateProperty('connected', true);
        return;
      }

      this._updateProperty('connected', false);

      const dateTime = new Date().toISOString();
      const errorMessage = utility.formatError(result.response);
      try {
        await this.setSettings({ last_error: `${dateTime}\n${errorMessage}` });
      } catch (err) {
        this.error(`Failed to update settings last_error: ${utility.formatError(err)}`);
      }
    } catch (err) {
      this.error(`Failed to publish PVOutput status: ${utility.formatError(err)}`);
    }
  }

  shouldAddStatus() {
    const timestamp = new Date();
    const time = Number(`${timestamp.getHours()}${utility.pad(timestamp.getMinutes(), 2)}`);
    return time > this.getSetting('start_reporting') && time < this.getSetting('stop_reporting');
  }

  _updateProperty(key, value) {
    if (!this.hasCapability(key)) {
      return;
    }

    if (typeof value === 'undefined' || value === null) {
      this.log(`[${this.getName()}] Value for capability '${key}' is 'undefined'`);
      return;
    }

    this.setCapabilityValue(key, value).catch(reason => {
      this.error(utility.formatError(reason));
    });
  }

  onDeleted() {
    this.log(`Deleting SMA PVOutput '${this.getName()}' from Homey.`);
    this._clearTimers();
    this.homey.settings.unset(`${this.getData().id}.apikey`);
    this.pvoutputSession = null;
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('interval')) {
      this.log(`Interval value was changed to: ${newSettings.interval}`);
      this._initializeTimers();
    }
  }

  storeAPIKeyEncrypted() {
    this.log(`[${this.getName()}] Encrypting api key`);
    const plaintextApikey = this.getStoreValue('apikey');
    this.homey.settings.set(`${this.getData().id}.apikey`, this.encryptText(plaintextApikey));

    // Remove unencrypted apikey passed from driver
    this.unsetStoreValue('apikey');
  }

  getAPIKey() {
    return this.decryptText(this.homey.settings.get(`${this.getData().id}.apikey`));
  }

  encryptText(plainText) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, Buffer.from(Homey.env.ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
  }

  decryptText(encryptedJson) {
    const iv = Buffer.from(encryptedJson.iv, 'hex');
    const encryptedText = Buffer.from(encryptedJson.encryptedData, 'hex');
    const decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, Buffer.from(Homey.env.ENCRYPTION_KEY), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString();
  }
}

module.exports = PVOutputDevice;
