'use strict';

const Homey = require('homey');
const modbus = require('jsmodbus');
const net = require('net');
const socket = new net.Socket();

class SmaModbusStorageDevice extends Homey.Device {

  onInit() {

    let options = {
      'host': this.getSetting('address'),
      'port': this.getSetting('port'),
      'unitId': 3,
      'timeout': 5000,
      'autoReconnect': true,
      'reconnectTimeout': this.getSetting('polling'),
      'logLabel' : 'SMA Sunny Boy Storage',
      'logLevel': 'error',
      'logEnabled': false
    }

    let client = new modbus.client.TCP(socket, 3)

    socket.connect(options);

    socket.on('connect', () => {

      this.log('Connected ...');
      if (!this.getAvailable()) {
        this.setAvailable();
      }

      this.pollingInterval = setInterval(() => {
        Promise.all([
          client.readHoldingRegisters(30845, 2),
          client.readHoldingRegisters(30847, 2),
          client.readHoldingRegisters(30775, 2),
          client.readHoldingRegisters(30865, 2),
          client.readHoldingRegisters(30867, 2),
          client.readHoldingRegisters(30955, 2)
        ]).then((results) => {
          var battery = results[0].response._body._valuesAsArray[1];
          var battery_capacity = results[1].response._body._valuesAsArray[1];
          var powerac = results[2].response._body._valuesAsArray[1];
          var power_drawn = results[3].response._body._valuesAsArray[1];
          var powergrid_feed_in = results[4].response._body._valuesAsArray[1];
          var operational_code = results[5].response._body._valuesAsArray[1];

          // BATTERY
          if (this.getCapabilityValue('measure_battery') != battery) {
            this.setCapabilityValue('measure_battery', battery);
          }

          // BATTERY CAPACITY
          if (this.getCapabilityValue('battery_capacity') != battery) {
            this.setCapabilityValue('battery_capacity', battery);
          }

          // CHARGE / DISCHARGE
          if (this.getCapabilityValue('measure_power') != powerac) {
            if (powerac < 0 || powerac > 10000) {
              this.setCapabilityValue('measure_power', 0);
            } else {
              this.setCapabilityValue('measure_power', powerac);
            }
          }

          // POWER DRAWN
          if (this.getCapabilityValue('power_drawn') != power_drawn) {
            this.setCapabilityValue('power_drawn', power_drawn);
          }

          // POWERGRID FEED IN
          if (this.getCapabilityValue('powergrid_feed_in') != powergrid_feed_in) {
            this.setCapabilityValue('powergrid_feed_in', powergrid_feed_in);
          }

          // OPERATIONAL STATUS
          if (this.getCapabilityValue('operational_status') != Homey.__('Off') && operational_code == 303) {
            this.setCapabilityValue('operational_status', Homey.__('Off'));
          } else if (this.getCapabilityValue('operational_status') != Homey.__('Standby') && operational_code == 2291) {
            this.setCapabilityValue('operational_status', Homey.__('Standby'));
          } else if (this.getCapabilityValue('operational_status') != Homey.__('Charge') && operational_code == 2292) {
            this.setCapabilityValue('operational_status', Homey.__('Charge'));
          } else if (this.getCapabilityValue('operational_status') != Homey.__('Discharge') && operational_code == 2293) {
            this.setCapabilityValue('operational_status', Homey.__('Discharge'));
          } else if (this.getCapabilityValue('operational_status') != Homey.__('NA') && operational_code == 16777213) {
            this.setCapabilityValue('operational_status', Homey.__('NA'));
          }

        }).catch((err) => {
          this.log(err);
        })
      }, this.getSetting('polling') * 1000)

    })

    socket.on('error', (err) => {
      this.log(err);
      this.setUnavailable(err.err);
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
    clearInterval(this.pollingInterval);
  }

}

module.exports = SmaModbusStorageDevice;
