'use strict';

const { Driver } = require('homey');
//const { ManagerDrivers } = require('homey');

class SummaryDriver extends Driver {

	async onInit() {
        this.log('SMA summary driver has been initialized');
	}

  async onPair (session) {
    let devices = [];

    //socket.on('list_devices', (data, callback) => {
    session.setHandler('list_devices', async (data) => {

      //We need to find an inverter and an energy meter for this to make sense
      if (this.homey.drivers.getDriver('inverter').getDevices().length > 0 &&
        this.homey.drivers.getDriver('energy').getDevices().length > 0) {

            devices.push({
              name: 'Energy Summary',
              data: {
                id: 99999999999999
              }
            });
            //callback(null, devices);
            return devices;

      } else {
        //callback(new Error('You need at least one inverter and one energy meter already registered in Homey to add an Energy Summary device'));
        throw new Error('You need at least one inverter and one energy meter already registered in Homey to add an Energy Summary device');
      }
    });
  }
}

module.exports = SummaryDriver;
