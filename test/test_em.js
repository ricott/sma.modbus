'use strict';

const EnergyMeter = require('../lib/sma_em.js');
var config = require('./config');

let emSession = new EnergyMeter({
  serialNo: config.hm2.serial,
  refreshInterval: 2
});

emSession.on('readings', readings => {
  console.log('SerialNo : ' + readings.serialNo);
  console.log('frequency : ' + readings.frequency);
  /*
  console.log('pregard  : ' + readings.pregard);
  console.log('psurplus : ' + readings.psurplus);
*/

 console.log('pregardcounter : ' + readings.pregardcounter);
 console.log('psurpluscounter : ' + readings.psurpluscounter);
 /*console.log('pregardL1 : ' + readings.pregardL1);
 console.log('pregardL2 : ' + readings.pregardL2);
 console.log('pregardL3 : ' + readings.pregardL3);

 console.log('psurplusL1 : ' + readings.psurplusL1);
 console.log('psurplusL2 : ' + readings.psurplusL2);
 console.log('psurplusL3 : ' + readings.psurplusL3);

 console.log('currentL1 : ' + readings.currentL1);
 console.log('currentL2 : ' + readings.currentL2);
 console.log('currentL3 : ' + readings.currentL3);
 */
 console.log('swVersion : ' + readings.swVersion);
 console.log('*********************************');
});

emSession.on('error', error => {
  console.error('Houston we have a problem', error);

});

// sleep time expects milliseconds
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
