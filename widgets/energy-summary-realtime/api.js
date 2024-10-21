'use strict';

module.exports = {
  async getSummary({ homey, query }) {

    const summaryDevice = homey.drivers.getDriver('summary').getDevice({ id: 99999999999999 });
    if (summaryDevice) {
      return {
        power: {
          grid: summaryDevice.getCapabilityValue('measure_power'),
          pv: summaryDevice.getCapabilityValue('measure_power.pv'),
          load: summaryDevice.getCapabilityValue('measure_power.consumption'),
          battery: summaryDevice.getCapabilityValue('measure_power.battery')
        }
      };
    }
  },
};
