'use strict';

const batteryRegistryHandler = require('../modbus/battery/batteryRegistryHandler.js');
const Base = require('./base.js');

class Battery extends Base {

  constructor(options = {}) {
    super(batteryRegistryHandler, options);
  }

}
module.exports = Battery;
