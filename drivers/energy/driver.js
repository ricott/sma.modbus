'use strict';

const { Driver } = require('homey');
const EnergyMeter = require('../../lib/sma_em.js');

class EnergyDriver extends Driver {

    async onInit() {
        this.log('SMA energy driver has been initialized');
        this.flowCards = {};
        this._registerFlows();
    }

    _registerFlows() {
        this.log('Registering flows');

        // Register device triggers
        this.flowCards['phase_threshold_triggered'] = this.homey.flow.getDeviceTriggerCard('phase_threshold_triggered');

        //Register conditions
        this.flowCards['phaseUtilized'] =
            this.homey.flow.getConditionCard('phaseUtilized')
                .registerRunListener(async (args, state) => {
                    this.log(`[${args.device.getName()}] Condition 'phaseUtilized' triggered`);
                    this.log(`[${args.device.getName()}] Phase: '${args.phase}'`);
                    this.log(`[${args.device.getName()}] Utilization: ${args.utilization}%`);
                    let phaseCurrent = args.device.getCapabilityValue(`measure_current.${args.phase}`);
                    this.log(`[${args.device.getName()}] - Phase current: ${phaseCurrent}A`);
                    let utilization = (phaseCurrent / args.device.energy.mainFuse) * 100;
                    this.log(`[${args.device.getName()}] - Phase utlization: ${utilization}%`);

                    if (utilization >= args.utilization) {
                        return true;
                    } else {
                        return false;
                    }
                });

        this.flowCards['anyPhaseUtilized'] =
            this.homey.flow.getConditionCard('anyPhaseUtilized')
                .registerRunListener(async (args, state) => {
                    this.log(`[${args.device.getName()}] Condition 'anyPhaseUtilized' triggered`);
                    this.log(`[${args.device.getName()}] Utilization: ${args.utilization}%`);
                    let utilizationL1 = (args.device.getCapabilityValue('measure_current.L1') / args.device.energy.mainFuse) * 100;
                    let utilizationL2 = (args.device.getCapabilityValue('measure_current.L2') / args.device.energy.mainFuse) * 100;
                    let utilizationL3 = (args.device.getCapabilityValue('measure_current.L3') / args.device.energy.mainFuse) * 100;
                    this.log(`[${args.device.getName()}] - Phase utlization: ${utilizationL1}%, ${utilizationL2}%, ${utilizationL3}%`);

                    if (utilizationL1 >= args.utilization || utilizationL2 >= args.utilization || utilizationL3 >= args.utilization) {
                        return true;
                    } else {
                        return false;
                    }
                });
    }

    triggerDeviceFlow(flow, tokens, device) {
        this.log(`[${device.getName()}] Triggering device flow '${flow}' with tokens`, tokens);
        this.flowCards[flow].trigger(device, tokens)
            .catch(error => {
                this.log(`Failed to trigger flow '${flow}' for device '${device.getName()}'`);
                this.log(error);
            });
    }

    async onPair(session) {
        let devices = [];

        session.setHandler('list_devices', async (data) => {
            let emSession = new EnergyMeter({});
            emSession.on('readings', readings => {
                if (!devices.find((em) => em.data.id === readings.serialNo)) {
                    this.log(`Adding to devices: ${readings.serialNo}`);
                    devices.push({
                        name: `Energy Meter (${readings.serialNo})`,
                        data: {
                            id: readings.serialNo
                        }
                    });
                }
            });

            //Wait for some time and see what we find
            return sleep(2500).then(() => {
                try {
                    emSession.disconnect();
                } catch (err) {
                    this.log(err);
                }

                if (devices.length == 0) {
                    throw new Error('No SMA Energy Meters found!')
                } else {
                    return devices;
                }

            }).catch(reason => {
                this.log('Timeout error', reason);
            });

        });
    }
}

// sleep time expects milliseconds
function sleep(time) {
    return new Promise((resolve) => this.homey.setTimeout(resolve, time));
}

module.exports = EnergyDriver;
