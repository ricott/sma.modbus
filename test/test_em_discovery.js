'use strict';

const EnergyMeter = require('../lib/sma_em.js');

let devices = [];
let emSession = new EnergyMeter({debug: true});

emSession.on('readings', readings => {
    if (!devices.find((em) => em.data.id === readings.serialNo)) {
        console.log(`Adding device: ${readings.serialNo}`);
        devices.push({
            name: `Energy Meter (${readings.serialNo})`,
            data: {
                id: readings.serialNo
            }
        });
    }
});

//Wait for some time and see what we find
sleep(5000).then(() => {
    try {
        emSession.disconnect();
        console.log(devices);
    } catch (err) {
        console.log(err);
    }
}).catch(reason => {
    console.log('Timeout error', reason);
});

// sleep time expects milliseconds
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}