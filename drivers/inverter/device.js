'use strict';

const Homey = require('homey');
const modbus = require('jsmodbus');
const net = require('net');
const socket = new net.Socket();

class SmaModbusDevice extends Homey.Device {

  onInit() {

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

      this.log('Connected ...')

      this.pollingInterval = setInterval(() => {
        Promise.all([
          client.readHoldingRegisters(30775, 2),
          client.readHoldingRegisters(30517, 4),
          client.readHoldingRegisters(30783, 2),
          client.readHoldingRegisters(30531, 2)
        ]).then((results) => {
          var powerac = results[0].response._body._valuesAsArray[1];
          var daily_yield = results[1].response._body._valuesAsArray[3];
          var voltage = results[2].response._body._valuesAsArray[1];
          var total_yield = results[3].response._body._valuesAsArray[1];

          // POWER
          if (powerac < 0 || powerac > 10000) {
            this.setCapabilityValue('measure_power', 0);
          } else {
            this.setCapabilityValue('measure_power', powerac);
          }

          /* DAILY YIELD */
          var meterpower = daily_yield / 1000;
          this.setCapabilityValue('meter_power', meterpower);

          /* VOLTAGE */
          if (voltage === 65535) {
            this.setCapabilityValue('measure_voltage', 0);
          } else {
            var volt = voltage / 100;
            this.setCapabilityValue('measure_voltage', volt);
          }

          /* TOTAL YIELD */
          var measureyield = total_yield / 1000;
          this.setCapabilityValue('measure_yield', measureyield);
        })
      }, this.getSetting('polling') * 1000)

    })

    socket.on('error', (err) => {
      this.log(err);
      this.setUnavailable(err.err);
      client.close();
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
