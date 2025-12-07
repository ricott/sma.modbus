'use strict';

const { Driver } = require('homey');
const PVOutputClient = require('../../lib/pvoutputClient.js');

class PVOutputDriver extends Driver {

  async onInit() {
    this.log('SMA PVOutput driver has been initialized');
  }

  async onPair(session) {
    let devices = [];
    let settings;

    session.setHandler('settings', async (data) => {
      settings = data;
      try {
        session.nextView();
      } catch (error) {
        this.log('Error showing next view', error);
      }
    });

    session.setHandler('list_devices', async (data) => {
      //Check that we have an inverter registered as a device
      //Validate pvoutput account by looking up system
      if (this.homey.drivers.getDriver('inverter').getDevices().length > 0) {
        let client = new PVOutputClient({
          apikey: settings.apikey,
          systemId: settings.systemid
        });

        return client.getSystem()
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
              return devices;
            } else {
              // Handle error response properly - it might be an Error object or string
              const errorMessage = result.response instanceof Error ? result.response.message : result.response;
              throw new Error(errorMessage);
            }
          });
      } else {
        throw new Error('You need at least one inverter already registered in Homey to add a PVOutput device');
      }
    });
  }
}

module.exports = PVOutputDriver;
