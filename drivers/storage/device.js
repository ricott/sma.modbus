'use strict';

const Homey = require('homey');
const modbus = require('jsmodbus');
const net = require('net');
const decodeData = require('../../lib/decodeData.js');
const socket = new net.Socket();

class SmaModbusStorageDevice extends Homey.Device {

  onInit() {

    this.pollIntervals = [];
    this.storage = {
      name: this.getName(),
      address: this.getSettings().address,
      port: this.getSettings().port,
      polling: this.getSettings().polling,
    };

    let options = {
      'host': this.storage.address,
      'port': this.storage.port,
      'unitId': 3,
      'timeout': 5000,
      'autoReconnect': true,
      'reconnectTimeout': this.storage.polling,
      'logLabel' : 'SMA Sunny Boy Storage',
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
          if (this.getCapabilityValue('operational_status') != Homey.__('Off') && operational_code == 303) {
            this.setCapabilityValue('operational_status', Homey.__('Off'));
            Homey.ManagerFlow.getCard('trigger', 'changedOperationalStatus').trigger(this, { status: Homey.__('Off') }, {});
          } else if (this.getCapabilityValue('operational_status') != Homey.__('Standby') && operational_code == 2291) {
            this.setCapabilityValue('operational_status', Homey.__('Standby'));
            Homey.ManagerFlow.getCard('trigger', 'changedOperationalStatus').trigger(this, { status: Homey.__('Standby') }, {});
          } else if (this.getCapabilityValue('operational_status') != Homey.__('Charge') && operational_code == 2292) {
            this.setCapabilityValue('operational_status', Homey.__('Charge'));
            Homey.ManagerFlow.getCard('trigger', 'changedOperationalStatus').trigger(this, { status: Homey.__('Charge') }, {});
          } else if (this.getCapabilityValue('operational_status') != Homey.__('Discharge') && operational_code == 2293) {
            this.setCapabilityValue('operational_status', Homey.__('Discharge'));
            Homey.ManagerFlow.getCard('trigger', 'changedOperationalStatus').trigger(this, { status: Homey.__('Discharge') }, {});
          } else if (this.getCapabilityValue('operational_status') != Homey.__('NA') && operational_code == 16777213) {
            this.setCapabilityValue('operational_status', Homey.__('NA'));
            Homey.ManagerFlow.getCard('trigger', 'changedOperationalStatus').trigger(this, { status: Homey.__('NA') }, {});
          }

          // BATTERY
          if (this.getCapabilityValue('battery') != battery) {
            this.setCapabilityValue('battery', battery);
            Homey.ManagerFlow.getCard('trigger', 'changedBattery').trigger(this, { charge: battery }, {});
          }

          // MEASURE_POWER: CHARGE
          if (this.getCapabilityValue('measure_power.charge') != charge) {
            this.setCapabilityValue('measure_power.charge', charge);
            Homey.ManagerFlow.getCard('trigger', 'changedBatteryCharging').trigger(this, { charging: charge }, {});
          }

          // MEASURE_POWER: DISCHARGE
          if (this.getCapabilityValue('measure_power.discharge') != discharge) {
            this.setCapabilityValue('measure_power.discharge', discharge);
            Homey.ManagerFlow.getCard('trigger', 'changedBatteryDischarging').trigger(this, { discharging: discharge }, {});
          }

          // POWER DRAWN
          if (this.getCapabilityValue('power_drawn') != power_drawn) {
            this.setCapabilityValue('power_drawn', power_drawn);
            Homey.ManagerFlow.getCard('trigger', 'changedPowerDrawn').trigger(this, { drawn: power_drawn }, {});
          }

          // POWERGRID FEED IN
          if (this.getCapabilityValue('powergrid_feed_in') != powergrid_feed_in) {
            this.setCapabilityValue('powergrid_feed_in', powergrid_feed_in);
            Homey.ManagerFlow.getCard('trigger', 'changedPowerGridFeedin').trigger(this, { feedin: powergrid_feed_in }, {});
          }

          // BATTERY CAPACITY
          if (this.getCapabilityValue('battery_capacity') != battery_capacity) {
            this.setCapabilityValue('battery_capacity', battery_capacity);
            Homey.ManagerFlow.getCard('trigger', 'changedBatteryCapacity').trigger(this, { capacity: battery_capacity }, {});
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

  onRenamed (name) {
    this.log(`Renaming SMA storage from '${this.storage.name}' to '${name}'`);
    this.storage.name = name;
  }

  async onSettings(oldSettings, newSettings, changedKeysArr) {
    let change = false;
		if (changedKeysArr.indexOf("address") > -1) {
			this.log('Address value was change to:', newSettings.address);
      this.storage.address = newSettings.address;
      change = true;
		}
    if (changedKeysArr.indexOf("port") > -1) {
			this.log('Port value was change to:', newSettings.port);
      this.storage.port = newSettings.port;
      change = true;
		}
    if (changedKeysArr.indexOf("polling") > -1) {
			this.log('Polling value was change to:', newSettings.polling);
      this.storage.polling = newSettings.polling;
      change = true;
		}

    if (change) {
      //We need to re-initialize the SMA session since setting(s) are changed
      //TODO 
    }
	}

}

module.exports = SmaModbusStorageDevice;
