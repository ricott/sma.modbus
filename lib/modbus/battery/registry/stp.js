'use strict';

const { BASE } = require('./base.js');

// Used by hybrid inverters
// STP5.0-3SE-40 / STP6.0-3SE-40 / STP8.0-3SE-40 / STP10.0-3SE-40
const STP_SE_int = {
};
const STP_SE = Object.freeze(Object.assign(Object.assign({}, BASE), STP_SE_int));

module.exports = {
    STP_SE
}
