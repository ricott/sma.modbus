'use strict';

const Homey	= require('homey');
const { ManagerDrivers } = require('homey');

class SummaryDriver extends Homey.Driver {

	onInit() {
        this.log('SMA summary driver has been initialized');
        
	}

  onPair (socket) {
    let devices = [];

    socket.on('list_devices', (data, callback) => {

      //We need to find an inverter and an energy meter for this to make sense
      if (ManagerDrivers.getDriver('inverter').getDevices().length > 0 &&
          ManagerDrivers.getDriver('energy').getDevices().length > 0) {

            devices.push({
              name: 'SMA Summary',
              data: {
                id: 99999999999999
              }
            });
      }

      callback(null, devices);

    });
  }
}

module.exports = SummaryDriver;
