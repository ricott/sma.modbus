'use strict';

const EnergyMeter = require('../lib/devices/energyMeter.js');

// Configure as needed; unitId usually 2 for HM-2, 3 for PV inverter.
const UNIT_ID = 2;
const EXPORT_LIMIT = 100; // value to write to 40016

let wrote = false;
const em = new EnergyMeter({ debug: true, refreshInterval: 2 });

em.on('readings', async (readings) => {
  if (wrote) return;
  try {
    const res = await em.writeExportLimit(EXPORT_LIMIT, { unitId: UNIT_ID });
    console.log('Write response:', res && res.response ? 'OK' : res);
    wrote = true;
    em.disconnect();
  } catch (err) {
    console.error('Write error:', err && err.message ? err.message : err);
    wrote = true;
    em.disconnect();
  }
});

em.on('error', (err) => {
  console.error('EM error:', err && err.message ? err.message : err);
});


