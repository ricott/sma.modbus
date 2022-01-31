'use strict';

const { Device } = require('homey');
const modbus = require('jsmodbus');
const net = require('net');
const decodeData = require('../../lib/decodeData.js');
const socket = new net.Socket();

class SmaModbusStorageDevice extends Device {

  async onInit() {

    this.pollIntervals = [];
    let options = {
      'host': this.getSetting('address'),
      'port': this.getSetting('port'),
      'unitId': 3,
      'timeout': 5000,
      'autoReconnect': true,
      'reconnectTimeout': this.getSetting('polling'),
      'logLabel': 'SMA Sunny Boy Storage',
      'logLevel': 'error',
      'logEnabled': false
    }

    let client = new modbus.client.TCP(socket, 3)

    socket.connect(options);

    socket.on('connect', () => {
      this.log('Connected ...');

      this.pollingInterval = setInterval(() => {
        Promise.all([
          client.readHoldingRegisters(30955, 2),
          client.readHoldingRegisters(30845, 2),
          client.readHoldingRegisters(31393, 2),
          client.readHoldingRegisters(31395, 2),
          client.readHoldingRegisters(30865, 2),
          client.readHoldingRegisters(30867, 2),
          client.readHoldingRegisters(30847, 2)
        ]).then((results) => {
          let operational_code = decodeData.decodeU32(results[0].response._body._valuesAsArray, 0, 0);
          let battery = decodeData.decodeU32(results[1].response._body._valuesAsArray, 0, 0);
          let charge = decodeData.decodeU32(results[2].response._body._valuesAsArray, 0, 0);
          let discharge = decodeData.decodeU32(results[3].response._body._valuesAsArray, 0, 0);
          let power_drawn = decodeData.decodeS32(results[4].response._body._valuesAsArray, 0, 0);
          let powergrid_feed_in = decodeData.decodeS32(results[5].response._body._valuesAsArray, 0, 0);
          let battery_capacity = decodeData.decodeU32(results[6].response._body._valuesAsArray, 0, 0);

          // OPERATIONAL STATUS
          if (this.getCapabilityValue('operational_status') != this.homey.__('Off') && operational_code == 303) {
            this.setCapabilityValue('operational_status', this.homey.__('Off'));
            let tokens = {
              status: this.homey.__('Off')
            }
            this.driver.triggerDeviceFlow('changedOperationalStatus', tokens, this);

          } else if (this.getCapabilityValue('operational_status') != this.homey.__('Standby') && operational_code == 2291) {
            this.setCapabilityValue('operational_status', this.homey.__('Standby'));
            let tokens = {
              status: this.homey.__('Standby')
            }
            this.driver.triggerDeviceFlow('changedOperationalStatus', tokens, this);

          } else if (this.getCapabilityValue('operational_status') != this.homey.__('Charge') && operational_code == 2292) {
            this.setCapabilityValue('operational_status', this.homey.__('Charge'));
            let tokens = {
              status: this.homey.__('Charge')
            }
            this.driver.triggerDeviceFlow('changedOperationalStatus', tokens, this);

          } else if (this.getCapabilityValue('operational_status') != this.homey.__('Discharge') && operational_code == 2293) {
            this.setCapabilityValue('operational_status', this.homey.__('Discharge'));
            let tokens = {
              status: this.homey.__('Discharge')
            }
            this.driver.triggerDeviceFlow('changedOperationalStatus', tokens, this);

          } else if (this.getCapabilityValue('operational_status') != this.homey.__('NA') && operational_code == 16777213) {
            this.setCapabilityValue('operational_status', this.homey.__('NA'));
            let tokens = {
              status: this.homey.__('NA')
            }
            this.driver.triggerDeviceFlow('changedOperationalStatus', tokens, this);
          }

          // BATTERY
          if (this.getCapabilityValue('battery') != battery) {
            this.setCapabilityValue('battery', battery);
            let tokens = {
              charge: battery
            }
            this.driver.triggerDeviceFlow('changedBattery', tokens, this);
          }

          // MEASURE_POWER: CHARGE
          if (this.getCapabilityValue('measure_power.charge') != charge) {
            this.setCapabilityValue('measure_power.charge', charge);
            let tokens = {
              charging: charge
            }
            this.driver.triggerDeviceFlow('changedBatteryCharging', tokens, this);
          }

          // MEASURE_POWER: DISCHARGE
          if (this.getCapabilityValue('measure_power.discharge') != discharge) {
            this.setCapabilityValue('measure_power.discharge', discharge);
            let tokens = {
              discharging: discharge
            }
            this.driver.triggerDeviceFlow('changedBatteryDischarging', tokens, this);
          }

          // POWER DRAWN
          if (this.getCapabilityValue('power_drawn') != power_drawn) {
            this.setCapabilityValue('power_drawn', power_drawn);
            let tokens = {
              drawn: power_drawn
            }
            this.driver.triggerDeviceFlow('changedPowerDrawn', tokens, this);
          }

          // POWERGRID FEED IN
          if (this.getCapabilityValue('powergrid_feed_in') != powergrid_feed_in) {
            this.setCapabilityValue('powergrid_feed_in', powergrid_feed_in);
            let tokens = {
              feedin: powergrid_feed_in
            }
            this.driver.triggerDeviceFlow('changedPowerGridFeedin', tokens, this);
          }

          // BATTERY CAPACITY
          if (this.getCapabilityValue('battery_capacity') != battery_capacity) {
            this.setCapabilityValue('battery_capacity', battery_capacity);
            let tokens = {
              capacity: battery_capacity
            }
            this.driver.triggerDeviceFlow('changedBatteryCapacity', tokens, this);
          }

        }).catch((err) => {
          this.log(err);
        })
      }, this.getSetting('polling') * 1000)

    })

    socket.on('error', (err) => {
      this.log(err);
      socket.end();
    })

    socket.on('close', () => {
      this.log('Client closed, retrying in 63 seconds');

      clearInterval(this.pollingInterval);

      setTimeout(() => {
        socket.connect(options);
        this.log('Reconnecting now ...');
      }, 63000)
    })

  }

  onDeleted() {
    this.log(`Deleting SMA storage '${this.getName()}' from Homey.`);
    clearInterval(this.pollingInterval);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    let change = false;
    if (changedKeys.indexOf("address") > -1) {
      this.log('Address value was change to:', newSettings.address);
      change = true;
    }
    if (changedKeys.indexOf("port") > -1) {
      this.log('Port value was change to:', newSettings.port);
      change = true;
    }
    if (changedKeys.indexOf("polling") > -1) {
      this.log('Polling value was change to:', newSettings.polling);
      change = true;
    }

    if (change) {
      //We need to re-initialize the SMA session since setting(s) are changed
      //TODO 
    }
  }

}

module.exports = SmaModbusStorageDevice;
