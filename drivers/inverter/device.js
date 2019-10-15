'use strict';

const Homey = require('homey');
const modbus = require('jsmodbus');
const net = require('net');
const decodeData = require('../../lib/decodeData.js');
const socket = new net.Socket();

class SmaModbusDevice extends Homey.Device {

  onInit() {

    if (this.getClass() !== 'solarpanel') {
      this.setClass('solarpanel');
    }

    let options = {
      'host': this.getSetting('address'),
      'port': this.getSetting('port'),
      'unitId': 3,
      'timeout': 5000,
      'autoReconnect': true,
      'reconnectTimeout': this.getSetting('polling'),
      'logLabel' : 'SMA Inverter',
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
          client.readHoldingRegisters(30775, 2), //S32 AC Power
          client.readHoldingRegisters(30535, 2), //U32 Daily Yield Wh
          client.readHoldingRegisters(30783, 2), //U32, 2 decimals, Grid voltage phase L1
          client.readHoldingRegisters(30529, 2), //U32, Total yield Wh
        ]).then((results) => {
          let powerac = decodeData.decodeS32(results[0].response._body._valuesAsArray, 0, 0)
          let daily_yield = decodeData.formatWHasKWH(decodeData.decodeU32(results[1].response._body._valuesAsArray, 0, 0));
          let voltage = decodeData.decodeU32(results[2].response._body._valuesAsArray, 2, 0)
          let total_yield = decodeData.formatWHasMWH(decodeData.decodeU32(results[3].response._body._valuesAsArray, 0, 0));

          // POWER
          if (this.getCapabilityValue('measure_power') != powerac) {
            this.setCapabilityValue('measure_power', powerac);
          }

          /* DAILY YIELD */
          if (this.getCapabilityValue('meter_power') != daily_yield) {
            this.setCapabilityValue('meter_power', daily_yield);
          }

          /* VOLTAGE */
          if (this.getCapabilityValue('measure_voltage') != voltage) {
            this.setCapabilityValue('measure_voltage', voltage);
          }

          /* TOTAL YIELD */
          if (this.getCapabilityValue('measure_yield') != total_yield) {
            this.setCapabilityValue('measure_yield', total_yield);
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

module.exports = SmaModbusDevice;
