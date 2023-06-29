"use strict";

const { Driver } = require('homey');

class SmaModbusStorageDriver extends Driver {

    async onInit() {
        this.log('SMA Storage driver has been initialized');
        this._registerFlows();
    }

    _registerFlows() {
        this.log('Registering flows');

        //Conditions
        const isOperationalStatus = this.homey.flow.getConditionCard('isOperationalStatus');
        isOperationalStatus.registerRunListener(async (args, state) => {
            this.log(`[${args.device.getName()}] Condition 'isOperationalStatus' triggered`);

            if (args.device.getCapabilityValue('operational_status') == this.homey.__('Off') && args.status == '303') {
            } else if (args.device.getCapabilityValue('operational_status') == this.homey.__('Standby') && args.status == '2291') {
                return true;
            } else if (args.device.getCapabilityValue('operational_status') == this.homey.__('Charge') && args.status == '2292') {
                return true;
            } else if (args.device.getCapabilityValue('operational_status') == this.homey.__('Discharge') && args.status == '2293') {
                return true;
            } else if (args.device.getCapabilityValue('operational_status') == this.homey.__('NA') && args.status == '16777213') {
                return true;
            } else {
                return false;
            }
        });
    }
}
module.exports = SmaModbusStorageDriver;
