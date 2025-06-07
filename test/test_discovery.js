'use strict';

const InverterDiscovery = require('../lib/devices/inverterDiscovery.js');

let discoveryQuery = new InverterDiscovery({
    port: 502
  });

discoveryQuery.discover();

discoveryQuery.on('inverterInfo', result => {
    console.log('inverterInfo: ', result);
});