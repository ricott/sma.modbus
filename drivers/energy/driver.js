'use strict';

const Homey	= require('homey');
const EnergyMeter = require('../../lib/sma_em.js');

class EnergyDriver extends Homey.Driver {

	onInit() {
        this.log('SMA energy driver has been initialized');
        
	}

  onPair (socket) {
    let devices = [];

    socket.on('list_devices', (data, callback) => {

      let emSession = new EnergyMeter({});
  
      emSession.on('readings', readings => {
        
        if (!devices.find(( em ) => em.data.id === readings.serialNo)) {
          devices.push({
            name: `Energy Meter (${readings.serialNo})`,
            data: {
              id: readings.serialNo
            }
          });
        }
      });

      //Wait for some time and see what we find
      sleep(2500).then(() => {
        try {
          emSession.disconnect();
        } catch (err) {
          this.log(err);
        }

        if (devices.length == 0) {
          callback(new Error('No SMA Energy Meters found!'));
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

module.exports = EnergyDriver;
