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

      setInterval(() => {
        /* Current Power AC */
        client.readHoldingRegisters(30775, 2).then((resp) => {
          var powerac = resp.payload.readUInt32BE(0, 1);
          if (powerac < 0 || powerac > 10000) {
            this.setCapabilityValue('measure_power', 0);
          } else {
            this.setCapabilityValue('measure_power', powerac);
          }
        }).catch((err) => {
          console.log(err);
          this.setUnavailable(err);
        }).done(() => {

          /* DAILY YIELD */
          client.readHoldingRegisters(30517, 4).then((resp) => {
            this.setCapabilityValue('meter_power', resp.payload.readUInt32BE(4));
          }).catch((err) => {
            console.log(err);
            this.setUnavailable(err);
          }).done(() => {

            /* VOLTAGE */
            client.readHoldingRegisters(30783, 2).then((resp) => {
              var volt = resp.payload.readUInt32BE() / 100;
              if (volt < 0 || volt > 10000) {
                this.setCapabilityValue('measure_voltage', 0);
              } else {
                this.setCapabilityValue('measure_voltage', volt);
              }
            }).catch((err) => {
              console.log(err);
              this.setUnavailable(err);
            }).done(() => {

              /* TOTAL YIELD */
              client.readHoldingRegisters(30513, 4).then((resp) => {
                var totalyield = resp.payload.readUInt32BE(4) / 1000;
                var totalyieldmwh = +totalyield.toFixed(2);
                this.setCapabilityValue('measure_yield', totalyieldmwh);
              }).catch((err) => {
                console.log(err);
                this.setUnavailable(err);
              })

            })
          })
        })
      }, this.getSetting('polling') * 1000)

    })

    client.on('error', (err) => {
      console.log(err);
      this.setUnavailable(err);
    })

  }

}

module.exports = SmaModbusDevice;
