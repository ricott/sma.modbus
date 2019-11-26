'use strict';

const discovery = require('../lib/deviceDiscovery.js');

let discoveryQuery = new discovery({
    port: 502
  });

discoveryQuery.discover();

discoveryQuery.on('inverterInfo', result => {
    console.log('inverterInfo: ', result);
});