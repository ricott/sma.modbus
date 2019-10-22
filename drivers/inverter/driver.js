'use strict';

const Homey	= require('homey');
const discovery = require('../../lib/deviceDiscovery.js');

class InverterDriver extends Homey.Driver {

	onInit() {
		this.log('SMA Inverter driver has been initialized');

    //First time app starts, set default port to 502.
    if (!Homey.ManagerSettings.get('port')) {
			Homey.ManagerSettings.set('port', 502);
		}

		this.flowCards = {};
		this._registerFlows();
	}

  _registerFlows() {
    this.log('Registering flows');
    //Empty placeholder
  }

  onPair (socket) {
    let devices = [];
    let discoveryError;

    socket.on('list_devices', (data, callback) => {
      //Discover devices using multicast query
      let discoveryQuery = new discovery({
        port: Homey.ManagerSettings.get('port')
      });
      discoveryQuery.discover();
      
      //We can find multiple inverters, this method is called once per inverter found
      discoveryQuery.on('inverterInfo', inverterInfo => {
        //8001: Solar Inverters (DevClss1)
        //Filter out storage devices, etc
        if (inverterInfo.deviceClass == 8001) {
          devices.push({
            name: inverterInfo.deviceType,
            data: {
              id: inverterInfo.serialNo
            },
            settings: {
              address: inverterInfo.address,
              port: Number(inverterInfo.port)
            }
          });
        } else {
          this.log('Found a SMA device that is not an inverter', inverterInfo);
        }
      });

      discoveryQuery.on('error', error => {
        discoveryError = error;
      });

      //Wait for inverterInfo to be collected
      sleep(2500).then(() => {
        if (devices.length == 0 && discoveryError) {
          callback(discoveryError);
        } else if (devices.length == 0) {
          callback(new Error('No SMA Inverters found!'));
        } else {
          callback(null, devices);
        }

      }).catch(reason => {
        console.log('Timeout error', reason);
      });

    });
  }
}

// sleep time expects milliseconds
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

module.exports = InverterDriver;
