'use strict';

const Homey = require('homey');
const node_modbus = require('node-modbus');

class SmaModbusDevice extends Homey.Device {

  onInit() {

    const client = node_modbus.client.tcp.complete({
        'host': this.getSetting('address'),
        'port': this.getSetting('port'),
        'unitId': 3,
        'timeout': 2000,
        'autoReconnect': true,
        'reconnectTimeout': this.getSetting('polling'),
        'logLabel' : 'SMA Inverter',
        'logLevel': 'error',
        'logEnabled': false
    })

    client.connect();

    client.on('connect', () => {

      console.log('Connected ...')

      setInterval(() => {
        /* Current Power AC */
        client.readHoldingRegisters(30775, 2).then((resp) => {
          if (resp.payload.length > 0) {
            var powerac = resp.payload.readUInt32BE(0, 1);
            if (powerac < 0 || powerac > 10000) {
              this.setCapabilityValue('measure_power', 0);
            } else {
              this.setCapabilityValue('measure_power', powerac);
            }
          } else {
            console.log('Reading out current power AC failed.');
          }
        }).catch((err) => {
          console.log(err);
          this.setUnavailable(err.err);
          client.close();
        }).done(() => {

          /* DAILY YIELD */
          client.readHoldingRegisters(30517, 4).then((resp) => {
            if (resp.payload.length > 0) {
              var meterpower = resp.payload.readUInt32BE(4) / 1000;
              this.setCapabilityValue('meter_power', meterpower);
            } else {
              console.log('Reading out daily yield failed.');
            }
          }).catch((err) => {
            console.log(err);
            this.setUnavailable(err.err);
            client.close();
          }).done(() => {

            /* VOLTAGE */
            client.readHoldingRegisters(30783, 2).then((resp) => {
              if (resp.payload.length > 0) {
                var volt = resp.payload.readUInt32BE() / 100;
                if (volt < 0 || volt > 10000) {
                  this.setCapabilityValue('measure_voltage', 0);
                } else {
                  this.setCapabilityValue('measure_voltage', volt);
                }
              } else {
                console.log('Reading out voltage failed.');
              }
            }).catch((err) => {
              console.log(err);
              this.setUnavailable(err.err);
              client.close();
            }).done(() => {

              /* TOTAL YIELD */
              client.readHoldingRegisters(30513, 4).then((resp) => {
                if (resp.payload.length > 0) {
                  var totalyield = resp.payload.readUInt32BE(4) / 1000;
                  var totalyieldmwh = +totalyield.toFixed(0);
                  this.setCapabilityValue('measure_yield', totalyieldmwh);
                } else {
                  console.log('Reading out total yield failed.');
                }
              }).catch((err) => {
                console.log(err);
                this.setUnavailable(err.err);
                client.close();
              })

            })
          })
        })
      }, this.getSetting('polling') * 1000)

    })

    client.on('error', (err) => {
      this.log(err);
      this.setUnavailable(err.err);
      client.close();
    })

    client.on('close', () => {
      console.log('Client closed, retrying in 63 seconds');

      setTimeout(() => {
        client.connect();
        console.log('Reconnecting now ...');
      }, 63000)
    })

  }

}

module.exports = SmaModbusDevice;
