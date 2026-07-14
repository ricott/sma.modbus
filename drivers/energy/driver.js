'use strict';

const { Driver } = require('homey');
const EnergyMeter = require('../../lib/devices/energyMeter.js');
const utilFunctions = require('../../lib/util.js');

class EnergyDriver extends Driver {

    async onInit() {
        this.log('SMA energy driver has been initialized');
        this._registerFlows();
    }

    async triggerPhaseThresholdTriggered(device, tokens) {
        await this._phase_threshold_triggered.trigger(device, tokens, {}).catch(error => { this.error(utilFunctions.formatError(error)) });
    }

    _registerFlows() {
        this.log('Registering flows');

        // Register device triggers
        this._phase_threshold_triggered = this.homey.flow.getDeviceTriggerCard('phase_threshold_triggered');

        //Register conditions
        const phaseUtilized = this.homey.flow.getConditionCard('phaseUtilized');
        phaseUtilized.registerRunListener(async (args, state) => {
            this.log(`[${args.device.getName()}] Condition 'phaseUtilized' triggered`);
            this.log(`[${args.device.getName()}] Phase: '${args.phase}'`);
            this.log(`[${args.device.getName()}] Utilization: ${args.utilization}%`);
            const phaseCurrent = args.device.getCapabilityValue(`measure_current.${args.phase}`);
            this.log(`[${args.device.getName()}] - Phase current: ${phaseCurrent}A`);
            const utilization = (phaseCurrent / args.device.energy.mainFuse) * 100;
            this.log(`[${args.device.getName()}] - Phase utlization: ${utilization}%`);

            if (utilization >= args.utilization) {
                return true;
            } else {
                return false;
            }
        });

        const anyPhaseUtilized = this.homey.flow.getConditionCard('anyPhaseUtilized');
        anyPhaseUtilized.registerRunListener(async (args, state) => {
            this.log(`[${args.device.getName()}] Condition 'anyPhaseUtilized' triggered`);
            this.log(`[${args.device.getName()}] Utilization: ${args.utilization}%`);
            const utilizationL1 = (args.device.getCapabilityValue('measure_current.L1') / args.device.energy.mainFuse) * 100;
            const utilizationL2 = (args.device.getCapabilityValue('measure_current.L2') / args.device.energy.mainFuse) * 100;
            const utilizationL3 = (args.device.getCapabilityValue('measure_current.L3') / args.device.energy.mainFuse) * 100;
            this.log(`[${args.device.getName()}] - Phase utlization: ${utilizationL1}%, ${utilizationL2}%, ${utilizationL3}%`);

            if (utilizationL1 >= args.utilization || utilizationL2 >= args.utilization || utilizationL3 >= args.utilization) {
                return true;
            } else {
                return false;
            }
        });

        const set_export_limit = this.homey.flow.getActionCard('set_export_limit');
        set_export_limit.registerRunListener(async (args) => {
            this.log(`[${args.device.getName()}] Action 'set_export_limit' triggered`);
            this.log(`[${args.device.getName()}] - limit: '${args.limit}'`);

            // Adjust active power to be <= max power
            return args.device.api.writeExportLimit(args.limit, {})
                .then(function (result) {
                    return Promise.resolve(true);
                }).catch(reason => {
                    this.error(utilFunctions.formatError(reason));
                    throw new Error(`Failed to set the export limit. Reason: ${utilFunctions.formatError(reason)}`);
                });
        });
    }

    async onPair(session) {
        const devices = [];

        session.setHandler('list_devices', async (data) => {
            const emSession = new EnergyMeter({
                device: this
            });
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
            return this.#sleep(2500).then(() => {
                try {
                    emSession.disconnect();
                } catch (err) {
                    this.log(utilFunctions.formatError(err));
                }

                if (devices.length == 0) {
                    this.log(`No SMA Energy Meters found!`);
                }
                return devices;

            }).catch(reason => {
                this.log(`Timeout error: ${utilFunctions.formatError(reason)}`);
            });

        });
    }

    #sleep(time) {
        return new Promise((resolve) => this.homey.setTimeout(resolve, time));
    }
}

module.exports = EnergyDriver;
