'use strict';

const Homey = require('homey');
const { ManagerDrivers } = require('homey');
const PVOutputClient = require('../../lib/pvoutputClient.js');

class PVOutputDriver extends Homey.Driver {

  onInit() {
    this.log('SMA PVOutput driver has been initialized');
    this.flowCards = {};
    this._registerFlows();
  }

  _registerFlows() {
    this.log('Registering flows');

  }

  onPair(socket) {
    let devices = [];
    let settings;

    socket.on('settings', function (data, callback) {
      settings = data;
      callback(null, true);
      // Show the next view
      socket.nextView();
    });

    socket.on('list_devices', (data, callback) => {
      //Check that we have an inverter registered as a device
      //Validate pvoutput account by looking up system
      if (ManagerDrivers.getDriver('inverter').getDevices().length > 0) {

        let client = new PVOutputClient({
          apikey: settings.apikey,
          systemId: settings.systemid
        });

        client.getSystem()
          .then(function (result) {
            if (result.statusCode === 200) {
              devices.push({
                name: result.name,
                data: {
                  id: settings.systemid
                },
                settings: {
                  interval: Number(settings.interval),
                  start_reporting: settings.start_reporting,
                  stop_reporting: settings.stop_reporting
                },
                store: {
                  apikey: settings.apikey
                }
              });
              callback(null, devices);
            } else {
              callback(new Error(result.response));
            }
          });
      } else {
        callback(new Error('You need at least one inverter already registered in Homey to add a PVOutput device'));
      }
    });
  }
}

module.exports = PVOutputDriver;
