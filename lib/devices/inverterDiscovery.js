'use strict';

const BaseDiscovery = require('./deviceDiscovery.js');
const Inverter = require('./inverter.js');

class InverterDiscovery extends BaseDiscovery {
    createDevice(options) {
        return new Inverter(options);
    }

    getDeviceTypeName() {
        return 'Inverter';
    }
}

module.exports = InverterDiscovery; 