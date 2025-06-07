'use strict';

const BaseDiscovery = require('./deviceDiscovery.js');
const Battery = require('./battery.js');

class BatteryDiscovery extends BaseDiscovery {
    createDevice(options) {
        return new Battery(options);
    }

    getDeviceTypeName() {
        return 'Battery';
    }
}

module.exports = BatteryDiscovery; 