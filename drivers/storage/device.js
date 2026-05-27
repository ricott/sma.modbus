'use strict';

const { Device } = require('homey');
const modbus = require('jsmodbus');
const net = require('net');
const decodeData = require('../../lib/modbus/decodeData.js');
const utility = require('../../lib/util.js');

const RECONNECT_DELAY_MS = 63 * 1000;
const UNIT_ID = 3;
const REQUEST_TIMEOUT_MS = 5000;

// Modbus register addresses
const REG = {
    operationalStatus: 30955,
    battery: 30845,
    charge: 31393,
    discharge: 31395,
    powerDrawn: 30865,
    powerGridFeedin: 30867,
    batteryCapacity: 30847
};

// Operational status codes -> i18n keys
const OPERATIONAL_STATUS = {
    303: 'Off',
    2291: 'Standby',
    2292: 'Charge',
    2293: 'Discharge',
    16777213: 'NA'
};

class SmaModbusStorageDevice extends Device {

    #socket = null;
    #client = null;
    #pollingInterval = null;
    #reconnectTimeout = null;
    #destroyed = false;

    async onInit() {
        // Register device triggers
        this._changedOperationalStatus = this.homey.flow.getDeviceTriggerCard('changedOperationalStatus');
        this._changedBattery = this.homey.flow.getDeviceTriggerCard('changedBattery');
        this._changedBatteryCharging = this.homey.flow.getDeviceTriggerCard('changedBatteryCharging');
        this._changedBatteryDischarging = this.homey.flow.getDeviceTriggerCard('changedBatteryDischarging');
        this._changedPowerDrawn = this.homey.flow.getDeviceTriggerCard('changedPowerDrawn');
        this._changedPowerGridFeedin = this.homey.flow.getDeviceTriggerCard('changedPowerGridFeedin');
        this._changedBatteryCapacity = this.homey.flow.getDeviceTriggerCard('changedBatteryCapacity');

        this.#connect();
    }

    async onDeleted() {
        this.log(`Deleting SMA Storage '${this.getName()}' from Homey.`);
        this.#destroyed = true;
        this.#teardown();
    }

    #teardown() {
        if (this.#pollingInterval) {
            this.homey.clearInterval(this.#pollingInterval);
            this.#pollingInterval = null;
        }
        if (this.#reconnectTimeout) {
            this.homey.clearTimeout(this.#reconnectTimeout);
            this.#reconnectTimeout = null;
        }
        if (this.#socket) {
            this.#socket.removeAllListeners();
            this.#socket.destroy();
            this.#socket = null;
        }
        this.#client = null;
    }

    #connect() {
        if (this.#destroyed) {
            return;
        }

        this.#teardown();

        const options = {
            host: this.getSetting('address'),
            port: this.getSetting('port')
        };

        this.#socket = new net.Socket();
        this.#client = new modbus.client.TCP(this.#socket, UNIT_ID, REQUEST_TIMEOUT_MS);

        this.#socket.on('connect', () => {
            this.log('Connected ...');
            this.#startPolling();
        });

        this.#socket.on('error', (err) => {
            this.log(`Socket error: ${utility.formatError(err)}`);
            // 'close' will fire after this and trigger reconnection
            this.#socket?.end();
        });

        this.#socket.on('close', () => {
            if (this.#destroyed) {
                return;
            }
            this.log(`Client closed, retrying in ${RECONNECT_DELAY_MS / 1000} seconds`);

            if (this.#pollingInterval) {
                this.homey.clearInterval(this.#pollingInterval);
                this.#pollingInterval = null;
            }

            this.#reconnectTimeout = this.homey.setTimeout(() => {
                this.log('Reconnecting now ...');
                this.#connect();
            }, RECONNECT_DELAY_MS);
        });

        this.#socket.connect(options);
    }

    #startPolling() {
        const pollingMs = this.getSetting('polling') * 1000;
        this.#pollingInterval = this.homey.setInterval(() => this.#poll(), pollingMs);
    }

    async #poll() {
        if (!this.#client) {
            return;
        }

        try {
            const [
                operationalStatusRes,
                batteryRes,
                chargeRes,
                dischargeRes,
                powerDrawnRes,
                powerGridFeedinRes,
                batteryCapacityRes
            ] = await Promise.all([
                this.#client.readHoldingRegisters(REG.operationalStatus, 2),
                this.#client.readHoldingRegisters(REG.battery, 2),
                this.#client.readHoldingRegisters(REG.charge, 2),
                this.#client.readHoldingRegisters(REG.discharge, 2),
                this.#client.readHoldingRegisters(REG.powerDrawn, 2),
                this.#client.readHoldingRegisters(REG.powerGridFeedin, 2),
                this.#client.readHoldingRegisters(REG.batteryCapacity, 2)
            ]);

            const operationalCode = decodeData.decodeU32(operationalStatusRes.response._body._valuesAsArray, 0, 0);
            const battery = decodeData.decodeU32(batteryRes.response._body._valuesAsArray, 0, 0);
            const charge = decodeData.decodeU32(chargeRes.response._body._valuesAsArray, 0, 0);
            const discharge = decodeData.decodeU32(dischargeRes.response._body._valuesAsArray, 0, 0);
            const powerDrawn = decodeData.decodeS32(powerDrawnRes.response._body._valuesAsArray, 0, 0);
            const powerGridFeedin = decodeData.decodeS32(powerGridFeedinRes.response._body._valuesAsArray, 0, 0);
            const batteryCapacity = decodeData.decodeU32(batteryCapacityRes.response._body._valuesAsArray, 0, 0);

            // Operational status
            const statusKey = OPERATIONAL_STATUS[operationalCode];
            if (statusKey) {
                const localizedStatus = this.homey.__(statusKey);
                await this.#updateCapabilityAndTrigger(
                    'operational_status', localizedStatus,
                    this._changedOperationalStatus, { status: localizedStatus }
                );
            }

            // Battery
            await this.#updateCapabilityAndTrigger(
                'battery', battery,
                this._changedBattery, { charge: battery }
            );

            // Charge / discharge power
            await this.#updateCapabilityAndTrigger(
                'measure_power.charge', charge,
                this._changedBatteryCharging, { charging: charge }
            );
            await this.#updateCapabilityAndTrigger(
                'measure_power.discharge', discharge,
                this._changedBatteryDischarging, { discharging: discharge }
            );

            // Power drawn / fed in
            await this.#updateCapabilityAndTrigger(
                'power_drawn', powerDrawn,
                this._changedPowerDrawn, { drawn: powerDrawn }
            );
            await this.#updateCapabilityAndTrigger(
                'powergrid_feed_in', powerGridFeedin,
                this._changedPowerGridFeedin, { feedin: powerGridFeedin }
            );

            // Battery capacity
            await this.#updateCapabilityAndTrigger(
                'battery_capacity', batteryCapacity,
                this._changedBatteryCapacity, { capacity: batteryCapacity }
            );
        } catch (err) {
            this.log(`Polling failed: ${utility.formatError(err)}`);
        }
    }

    async #updateCapabilityAndTrigger(capability, value, triggerCard, tokens) {
        if (this.getCapabilityValue(capability) == value) {
            return;
        }

        try {
            await this.setCapabilityValue(capability, value);
            await triggerCard.trigger(this, tokens, {}).catch(error => {
                this.error(utility.formatError(error));
            });
        } catch (reason) {
            this.error(utility.formatError(reason));
        }
    }

    async onSettings({ newSettings, changedKeys }) {
        if (changedKeys.includes('address') || changedKeys.includes('port')) {
            this.log('Connection settings changed, reconnecting');
            this.#connect();
        } else if (changedKeys.includes('polling')) {
            this.log(`Polling value was changed to: ${newSettings.polling}`);
            if (this.#pollingInterval) {
                this.homey.clearInterval(this.#pollingInterval);
                this.#pollingInterval = null;
                this.#startPolling();
            }
        }
    }
}

module.exports = SmaModbusStorageDevice;
