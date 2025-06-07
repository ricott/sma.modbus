'use strict';

const { BASE } = require('./base.js');

// Used by
// Sunny Boy Smart Energy 3.6 / Sunny Boy Smart Energy 4.0 / Sunny Boy Smart Energy 5.0 / Sunny Boy Smart Energy 6.0
// Sunny Boy Smart Energy 3.8-US / Sunny Boy Smart Energy 4.8-US / Sunny Boy Smart Energy 5.8-US / Sunny Boy Smart Energy 7.7-US
const SMARTENERGY_int = {
    // No battery status available
    batteryStatus: null
};
const SMARTENERGY = Object.freeze(Object.assign(Object.assign({}, BASE), SMARTENERGY_int));

module.exports = {
    SMARTENERGY
}
