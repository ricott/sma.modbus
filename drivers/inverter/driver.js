'use strict';

const Homey = require('homey');
const discovery = require('../../lib/deviceDiscovery.js');
const SMA = require('../../lib/sma.js');

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

    // Register device triggers
    let triggers = [
      'inverter_status_changed'
    ];
    this._registerFlow('trigger', triggers, Homey.FlowCardTriggerDevice);

    //Register conditions
    triggers = [
      'isInverterDailyYield',
      'isInverterStatus'
    ];
    this._registerFlow('condition', triggers, Homey.FlowCardCondition);

    this.flowCards['condition.isInverterDailyYield']
      .registerRunListener((args, state, callback) => {
        this.log('Flow condition.isInverterDailyYield');
        this.log(`- inverter.dailyYield: ${args.device.getCapabilityValue('meter_power')}`);
        this.log(`- parameter yield: '${args.daily_yield}'`);

        if (args.device.getCapabilityValue('meter_power') > args.daily_yield) {
          return true;
        } else {
          return false;
        }
      });

    this.flowCards['condition.isInverterStatus']
      .registerRunListener((args, state, callback) => {
        this.log('Flow condition.isInverterStatus');
        this.log(`- inverter.status: ${args.device.getCapabilityValue('operational_status')}`);
        this.log(`- parameter status: '${args.inverter_status}'`);

        if (args.device.getCapabilityValue('operational_status').indexOf(args.inverter_status) > -1) {
          return true;
        } else {
          return false;
        }
      });

  }

  _registerFlow(type, keys, cls) {
    keys.forEach(key => {
      this.log(`- flow '${type}.${key}'`);
      this.flowCards[`${type}.${key}`] = new cls(key).register();
    });
  }

  triggerFlow(flow, tokens, device) {
    this.log(`Triggering flow '${flow}' with tokens`, tokens);

    if (this.flowCards[flow] instanceof Homey.FlowCardTriggerDevice) {
      this.log('- device trigger for ', device.getName());
      this.flowCards[flow].trigger(device, tokens);

    } else if (this.flowCards[flow] instanceof Homey.FlowCardTrigger) {
      this.log('- regular trigger');
      this.flowCards[flow].trigger(tokens);
    }
  }

  onPair(socket) {
    let self = this;
    let devices = [];
    //let discoveryError;
    let inverterProperties;
    let mode = 'discovery';
    let settings;

    socket.on('showView', (viewId, callback) => {
      if (viewId === 'settings' && mode === 'discovery') {
        this.log('Showing settings for first time, lets do discovery');
        socket.nextView();
      }
    });

    socket.on('settings', function (data, callback) {
      settings = data;

      let smaSession = new SMA({
        host: settings.address,
        port: Homey.ManagerSettings.get('port'),
        autoClose: true
      });

      smaSession.on('properties', properties => {
        inverterProperties = properties;
      });

      smaSession.on('error', error => {
        self.log('Failed to read inverter properties', error);
      });

      //Wait 3 seconds to allow properties to be read
      sleep(3000).then(() => {
        callback(null, true);
        // Show the next view
        socket.nextView();
      });
    });

    socket.on('list_devices', (data, callback) => {

      if (mode === 'manual') {
        if (!inverterProperties) {
          callback(new Error('Wrong IP number or port, no SMA inverter found'));
        } else {
          this.log(`Adding to devices: ${inverterProperties.deviceType}`);
          devices.push({
            name: inverterProperties.deviceType,
            data: {
              id: inverterProperties.serialNo
            },
            settings: {
              address: settings.address,
              port: Number(Homey.ManagerSettings.get('port'))
            }
          });
  
          callback(null, devices);
        }
      } else {
        //Discover devices using multicast query
        let discoveryQuery = new discovery({
          port: Homey.ManagerSettings.get('port')
        });
        discoveryQuery.discover();

        //We can find multiple inverters, this method is called once per inverter found
        discoveryQuery.on('deviceInfo', inverterInfo => {
          //8001: Solar Inverters (DevClss1)
          //Filter out storage devices, etc
          if (inverterInfo.deviceClass == 8001) {
            this.log(`Adding to devices: ${inverterInfo.deviceType}`);
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
          //Ignore the error, if no inverter found we'll do manual entry
          //discoveryError = error;
        });

        //Wait for inverterInfo to be collected
        sleep(6000).then(() => {
          if (devices.length === 0) {
            this.log('No inverters found using auto-discovery, fallback to manual entry');
            mode = 'manual';
            socket.showView('settings');
          } else {
            this.log(`Found '${devices.length}' inverter(s)`);
            callback(null, devices);
          }

        }).catch(reason => {
          console.log('Timeout error', reason);
        });
      }
    });
  }
}

// sleep time expects milliseconds
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

module.exports = InverterDriver;
