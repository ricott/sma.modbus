"use strict";

const { Driver } = require('homey');

class SmaModbusStorageDriver extends Driver {

  async onInit() {
    this.log('SMA Storage driver has been initialized');
    this.flowCards = {};
    this._registerFlows();
  }

  _registerFlows() {
    this.log('Registering flows');

    // Register device triggers
    this.flowCards['changedOperationalStatus'] = this.homey.flow.getDeviceTriggerCard('changedOperationalStatus');
    this.flowCards['changedBattery'] = this.homey.flow.getDeviceTriggerCard('changedBattery');
    this.flowCards['changedBatteryCharging'] = this.homey.flow.getDeviceTriggerCard('changedBatteryCharging');
    this.flowCards['changedBatteryDischarging'] = this.homey.flow.getDeviceTriggerCard('changedBatteryDischarging');
    this.flowCards['changedPowerDrawn'] = this.homey.flow.getDeviceTriggerCard('changedPowerDrawn');
    this.flowCards['changedPowerGridFeedin'] = this.homey.flow.getDeviceTriggerCard('changedPowerGridFeedin');
    this.flowCards['changedBatteryCapacity'] = this.homey.flow.getDeviceTriggerCard('changedBatteryCapacity');

    //Conditions
    this.flowCards['isOperationalStatus'] =
      this.homey.flow.getConditionCard('isOperationalStatus')
        .registerRunListener(async (args, state) => {
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

  triggerDeviceFlow(flow, tokens, device) {
    this.log(`[${device.getName()}] Triggering device flow '${flow}' with tokens`, tokens);
    try {
        this.flowCards[flow].trigger(device, tokens);        
    } catch (error) {
        this.log(`Failed to trigger flow '${flow}' for device '${device.getName()}'`);
        this.log(error);
    }
  }

}

module.exports = SmaModbusStorageDriver;
