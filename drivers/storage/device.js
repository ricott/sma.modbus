'use strict';

const { Device } = require('homey');
const modbus = require('jsmodbus');
const net = require('net');
const decodeData = require('../../lib/modbus/decodeData.js');
const socket = new net.Socket();

class SmaModbusStorageDevice extends Device {

    async onInit() {
        let self = this;
        // Register device triggers
        self._changedOperationalStatus = self.homey.flow.getDeviceTriggerCard('changedOperationalStatus');
        self._changedBattery = self.homey.flow.getDeviceTriggerCard('changedBattery');
        self._changedBatteryCharging = self.homey.flow.getDeviceTriggerCard('changedBatteryCharging');
        self._changedBatteryDischarging = self.homey.flow.getDeviceTriggerCard('changedBatteryDischarging');
        self._changedPowerDrawn = self.homey.flow.getDeviceTriggerCard('changedPowerDrawn');
        self._changedPowerGridFeedin = self.homey.flow.getDeviceTriggerCard('changedPowerGridFeedin');
        self._changedBatteryCapacity = self.homey.flow.getDeviceTriggerCard('changedBatteryCapacity');

        let options = {
            'host': self.getSetting('address'),
            'port': self.getSetting('port'),
            'unitId': 3,
            'timeout': 5000,
            'autoReconnect': true,
            'reconnectTimeout': self.getSetting('polling'),
            'logLabel': 'SMA Sunny Boy Storage',
            'logLevel': 'error',
            'logEnabled': false
        }

        let client = new modbus.client.TCP(socket, 3)
        socket.connect(options);

        socket.on('connect', () => {
            self.log('Connected ...');

            self.pollingInterval = self.homey.setInterval(() => {
                Promise.all([
                    client.readHoldingRegisters(30955, 2),
                    client.readHoldingRegisters(30845, 2),
                    client.readHoldingRegisters(31393, 2),
                    client.readHoldingRegisters(31395, 2),
                    client.readHoldingRegisters(30865, 2),
                    client.readHoldingRegisters(30867, 2),
                    client.readHoldingRegisters(30847, 2),
                    //client.readHoldingRegisters(31397, 4),
                    //client.readHoldingRegisters(31401, 4)

                ]).then((results) => {
                    let operational_code = decodeData.decodeU32(results[0].response._body._valuesAsArray, 0, 0);
                    let battery = decodeData.decodeU32(results[1].response._body._valuesAsArray, 0, 0);
                    let charge = decodeData.decodeU32(results[2].response._body._valuesAsArray, 0, 0);
                    let discharge = decodeData.decodeU32(results[3].response._body._valuesAsArray, 0, 0);
                    let power_drawn = decodeData.decodeS32(results[4].response._body._valuesAsArray, 0, 0);
                    let powergrid_feed_in = decodeData.decodeS32(results[5].response._body._valuesAsArray, 0, 0);
                    let battery_capacity = decodeData.decodeU32(results[6].response._body._valuesAsArray, 0, 0);

                    //31397, Battery charge, Wh (U64, FIX0)
                    //31401, Battery discharge, Wh (U64, FIX0)

                    // OPERATIONAL STATUS
                    if (self.getCapabilityValue('operational_status') != self.homey.__('Off') && operational_code == 303) {
                        self.setCapabilityValue('operational_status', self.homey.__('Off'))
                            .then(function () {

                                let tokens = {
                                    status: self.homey.__('Off')
                                }
                                self._changedOperationalStatus.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });

                    } else if (self.getCapabilityValue('operational_status') != self.homey.__('Standby') && operational_code == 2291) {
                        self.setCapabilityValue('operational_status', self.homey.__('Standby'))
                            .then(function () {

                                let tokens = {
                                    status: self.homey.__('Standby')
                                }
                                self._changedOperationalStatus.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });

                    } else if (self.getCapabilityValue('operational_status') != self.homey.__('Charge') && operational_code == 2292) {
                        self.setCapabilityValue('operational_status', self.homey.__('Charge'))
                            .then(function () {

                                let tokens = {
                                    status: self.homey.__('Charge')
                                }
                                self._changedOperationalStatus.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });

                    } else if (self.getCapabilityValue('operational_status') != self.homey.__('Discharge') && operational_code == 2293) {
                        self.setCapabilityValue('operational_status', self.homey.__('Discharge'))
                            .then(function () {

                                let tokens = {
                                    status: self.homey.__('Discharge')
                                }
                                self._changedOperationalStatus.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });

                    } else if (self.getCapabilityValue('operational_status') != self.homey.__('NA') && operational_code == 16777213) {
                        self.setCapabilityValue('operational_status', self.homey.__('NA'))
                            .then(function () {

                                let tokens = {
                                    status: self.homey.__('NA')
                                }
                                self._changedOperationalStatus.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });
                    }

                    // BATTERY
                    if (self.getCapabilityValue('battery') != battery) {
                        self.setCapabilityValue('battery', battery)
                            .then(function () {

                                let tokens = {
                                    charge: battery
                                }
                                self._changedBattery.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });
                    }

                    // MEASURE_POWER: CHARGE
                    if (self.getCapabilityValue('measure_power.charge') != charge) {
                        self.setCapabilityValue('measure_power.charge', charge)
                            .then(function () {

                                let tokens = {
                                    charging: charge
                                }
                                self._changedBatteryCharging.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });
                    }

                    // MEASURE_POWER: DISCHARGE
                    if (self.getCapabilityValue('measure_power.discharge') != discharge) {
                        self.setCapabilityValue('measure_power.discharge', discharge)
                            .then(function () {

                                let tokens = {
                                    discharging: discharge
                                }
                                self._changedBatteryDischarging.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });
                    }

                    // POWER DRAWN
                    if (self.getCapabilityValue('power_drawn') != power_drawn) {
                        self.setCapabilityValue('power_drawn', power_drawn)
                            .then(function () {

                                let tokens = {
                                    drawn: power_drawn
                                }
                                self._changedPowerDrawn.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });
                    }

                    // POWERGRID FEED IN
                    if (self.getCapabilityValue('powergrid_feed_in') != powergrid_feed_in) {
                        self.setCapabilityValue('powergrid_feed_in', powergrid_feed_in)
                            .then(function () {

                                let tokens = {
                                    feedin: powergrid_feed_in
                                }
                                self._changedPowerGridFeedin.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });
                    }

                    // BATTERY CAPACITY
                    if (self.getCapabilityValue('battery_capacity') != battery_capacity) {
                        self.setCapabilityValue('battery_capacity', battery_capacity)
                            .then(function () {

                                let tokens = {
                                    capacity: battery_capacity
                                }
                                self._changedBatteryCapacity.trigger(self, tokens, {}).catch(error => { self.error(error.message || String(error)) });

                            }).catch(reason => {
                                self.error(reason.message || String(reason));
                            });
                    }

                }).catch((err) => {
                    self.log(err.message || String(err));
                })
            }, self.getSetting('polling') * 1000);
        });

        socket.on('error', (err) => {
            self.log(err.message || String(err));
            socket.end();
        })

        socket.on('close', () => {
            self.log('Client closed, retrying in 63 seconds');

            self.homey.clearInterval(self.pollingInterval);
            self.homey.setTimeout(() => {
                socket.connect(options);
                self.log('Reconnecting now ...');
            }, 63000)
        })

    }
}

module.exports = SmaModbusStorageDevice;
