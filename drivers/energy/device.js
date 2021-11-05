'use strict';

const { Device } = require('homey');
const EnergyMeter = require('../../lib/sma_em.js');

class EnergyDevice extends Device {

  async onInit() {
    this.log(`[${this.getName()}] SMA energy meter initiated`);

    this.phaseAlerts = {
      L1: false,
      L2: false,
      L3: false
    };

    this.energy = {
      name: this.getName(),
      polling: this.getSettings().polling,
      serialNo: this.getData().id,
      mainFuse: this.getSettings().mainFuse,
      threshold: this.getSettings().threshold,
      offset: this.getSettings().offset,
      softwareVersion: null,
      properties: null,
      readings: null,
      emSession: null
    };

    //Update serial number setting
    this.setSettings({ serialNo: String(this.energy.serialNo) })
      .catch(err => {
        this.error('Failed to update settings serialNo', err);
      });

    this.upgradeDevice();
    await this.registerFlowTokens();

    this.setupEMSession();
  }

  upgradeDevice() {
    this.log('Upgrading existing device');
    //v2.0.9 added frequency capability, lets add it to existing devices
    let capability = 'frequency';
    if (!this.hasCapability(capability)) {
      this.log(`Adding missing capability '${capability}'`);
      this.addCapability(capability);
    }
  }

  async registerFlowTokens() {
    this.availCurrentToken = await this.homey.flow.createToken(`${this.energy.serialNo}.availableCurrent`,
    {
      type: 'number',
      title: `${this.energy.name} Available current`
    });
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

      this._updateProperty('measure_power', readings.pregard);
      this._updateProperty('measure_power.surplus', readings.psurplus);

      this._updateProperty('measure_power.L1', (readings.pregardL1 - readings.psurplusL1));
      this._updateProperty('measure_current.L1', readings.currentL1);
      this._updateProperty('measure_power.L2', (readings.pregardL2 - readings.psurplusL2));
      this._updateProperty('measure_current.L2', readings.currentL2);
      this._updateProperty('measure_power.L3', (readings.pregardL3 - readings.psurplusL3));
      this._updateProperty('measure_current.L3', readings.currentL3);
      this._updateProperty('frequency', readings.frequency);

      if (this.energy.softwareVersion != readings.swVersion && readings.swVersion != 0) {
        this.energy.softwareVersion = readings.swVersion;
        this.setSettings({ swVersion: `${this.energy.softwareVersion}` })
          .catch(err => {
            this.error('Failed to update settings swVersion', err);
          });
      }

      //Available current token, largest phase utilization vs main fuse vs offset
      let currentL1 = readings.currentL1;
      let currentL2 = readings.currentL2;
      let currentL3 = readings.currentL3;
      if (readings.psurplusL1 > 0) {
        currentL1 = 0;
      }
      if (readings.psurplusL2 > 0) {
        currentL2 = 0;
      }
      if (readings.psurplusL3 > 0) {
        currentL3 = 0;
      }

      let availableCurrent = this.energy.mainFuse - Math.max(currentL1, currentL2, currentL3);
      availableCurrent = availableCurrent - this.energy.offset;
      if (availableCurrent < 0) {
        availableCurrent = 0;
      } else {
        availableCurrent = parseFloat(availableCurrent.toFixed(0));
      }
      this.availCurrentToken.setValue(availableCurrent);
    });

    this.energy.emSession.on('error', error => {
      this.error('Houston we have a problem', error);

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
          this.error('Failed to update settings sma_last_error', err);
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

        if (key === 'measure_current.L1' ||
          key === 'measure_current.L2' ||
          key === 'measure_current.L3') {

          let phase = key.substring(key.indexOf('.') + 1);
          let utilization = (value / this.energy.mainFuse) * 100;
          if (utilization >= this.energy.threshold) {
            if (this.phaseAlerts[phase] === false) {
              //Only trigger if this is new threshold alert
              utilization = parseFloat(utilization.toFixed(2));
              this.phaseAlerts[phase] = true;
              let tokens = {
                phase: phase,
                percentageUtilized: utilization
              }
              this.driver.triggerDeviceFlow('phase_threshold_triggered', tokens, this);
            }
          } else if (this.phaseAlerts[phase] === true) {
            //Reset alert
            this.log(`Resetting phase alert state for '${key}'`);
            this.phaseAlerts[phase] = false;
          }
        }

      } else {
        this.setCapabilityValue(key, value);
      }
    }
  }

  onDeleted() {
    this.log(`[${this.getName()}] Deleting SMA energy meter from Homey.`);
    this.homey.flow.unregisterToken(this.availCurrentToken);
    this.energy.emSession.disconnect();
    this.energy.emSession = null;
  }

  onRenamed(name) {
    this.log(`Renaming SMA energy meter from '${this.energy.name}' to '${name}'`);
    this.energy.name = name;
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    let change = false;
    if (changedKeys.indexOf("polling") > -1) {
      this.log('Polling value was change to:', newSettings.polling);
      this.energy.polling = newSettings.polling;
      this.energy.emSession.setRefreshInterval(this.energy.polling);
    }

    if (changedKeys.indexOf("offset") > -1) {
      this.log('Offset value was change to:', newSettings.offset);
      this.energy.offset = newSettings.offset;
    }

    if (changedKeys.indexOf("mainFuse") > -1) {
      this.log('Main fuse value was change to:', newSettings.mainFuse);
      this.energy.mainFuse = newSettings.mainFuse;
      change = true;
    }

    if (changedKeys.indexOf("threshold") > -1) {
      this.log('Threshold value was change to:', newSettings.threshold);
      this.energy.threshold = newSettings.threshold;
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
