'use strict';

const Homey	= require('homey');
const SMA = require('../../lib/sma.js');

class TriPowerDriver extends Homey.Driver {

	onInit() {
		this.log('SMA Tripower driver has been initialized');

		this.flowCards = {};
		this._registerFlows();
	}

  _registerFlows() {
    this.log('Registering flows');
  }

  onPair (socket) {
    var smaSession;
    var settings;
    var inverterProperties;

    socket.on('settings', function( data, callback ) {
      settings = data;

      smaSession = new SMA({
        host: settings.address,
        port: settings.port,
				autoClose: true
      });

      smaSession.on('properties', properties => {
        //console.log('Got properties', properties);
        inverterProperties = properties;
      });

			//Wait 3 seconds to allow properties to be read
      sleep(3000).then(() => {
        callback( null, true);
				// Show the next view
				socket.nextView();
      });
    });

    socket.on('list_devices', (data, callback) => {

      if (!inverterProperties) {
        callback(new Error('Bad IP number, no SMA Tripower found'));
      } else {
        let devices = [];
        devices.push({
          name: inverterProperties.deviceType,
          data: {
            id: inverterProperties.serialNo
          },
					settings: {
						address: settings.address,
            port: settings.port
					}
        });

  			callback(null, devices);
      }
    });
  }

}

// sleep time expects milliseconds
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

module.exports = TriPowerDriver;
