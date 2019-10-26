'use strict';

const Homey	= require('homey');
//const HomeyAPI = require('athom-api');
const { ManagerDrivers } = require('homey');


class SummaryDriver extends Homey.Driver {

	onInit() {
        this.log('SMA summary driver has been initialized');
        
	}

  onPair (socket) {
    let devices = [];
    let discoveryError;

    socket.on('list_devices', (data, callback) => {

        let inverters = ManagerDrivers.getDriver('inverter').getDevices();
        inverters.forEach(inverter => {
            devices.push({
                name: inverter.getName() + ' Energy Meter',
                data: {
                  id: 99999999999999
                },
                settings: {
                  inverterId: inverter.getData().id
                }
              });
        });

        callback(null, devices);


    });
  }
}

module.exports = SummaryDriver;
