'use strict';

const Homey = require('homey');
const EnergyMeter = require('../../lib/sma_em.js');

class EnergyDriver extends Homey.Driver {

  onInit() {
    this.log('SMA energy driver has been initialized');
    this.flowCards = {};
    this._registerFlows();
  }

  _registerFlows() {
    this.log('Registering flows');

    // Register device triggers
    let triggers = [
      'phase_threshold_triggered'
    ];
    this._registerFlow('trigger', triggers, Homey.FlowCardTriggerDevice);

    //Register conditions
    triggers = [
      'phaseUtilized',
      'anyPhaseUtilized'
    ];
    this._registerFlow('condition', triggers, Homey.FlowCardCondition);

    this.flowCards['condition.phaseUtilized']
      .registerRunListener((args, state, callback) => {
        this.log('Flow condition.phaseUtilization');
        this.log(`Phase: '${args.phase}'`);
        this.log(`Utilization: ${args.utilization}%`);
        let phaseCurrent = args.device.getCapabilityValue(`measure_current.${args.phase}`);
        this.log(`- Phase current: ${phaseCurrent}A`);
        let utilization = (phaseCurrent / args.device.energy.mainFuse) * 100;
        this.log(`- Phase utlization: ${utilization}%`);

        if (utilization >= args.utilization) {
          return true;
        } else {
          return false;
        }
      });

    this.flowCards['condition.anyPhaseUtilized']
      .registerRunListener((args, state, callback) => {
        this.log('Flow condition.phaseUtilization');
        this.log(`Utilization: ${args.utilization}%`);
        let utilizationL1 = (args.device.getCapabilityValue('measure_current.L1') / args.device.energy.mainFuse) * 100;
        let utilizationL2 = (args.device.getCapabilityValue('measure_current.L2') / args.device.energy.mainFuse) * 100;
        let utilizationL3 = (args.device.getCapabilityValue('measure_current.L3') / args.device.energy.mainFuse) * 100;
        this.log(`- Phase utlization: ${utilizationL1}%, ${utilizationL2}%, ${utilizationL3}%`);

        if (utilizationL1 >= args.utilization || utilizationL2 >= args.utilization || utilizationL3 >= args.utilization) {
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
    }
    else if (this.flowCards[flow] instanceof Homey.FlowCardTrigger) {
      this.log('- regular trigger');
      this.flowCards[flow].trigger(tokens);
    }
  }

  onPair(socket) {
    let devices = [];

    socket.on('list_devices', (data, callback) => {

      let emSession = new EnergyMeter({});

      emSession.on('readings', readings => {

        if (!devices.find((em) => em.data.id === readings.serialNo)) {
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
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

module.exports = EnergyDriver;
