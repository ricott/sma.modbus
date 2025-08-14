'use strict';

const dgram = require('dgram');
const os = require('os');
const modbus = require('jsmodbus');
const net = require('net');
const utility = require('../util.js');
const HomeyEventEmitter = require('./homeyEventEmitter.js');

//UDP datagram must be sent to the multicast address 239.12.255.254 via port 9522
const PORT = 9522;
const MULTICAST_ADDR = "239.12.255.254";
const obis_dword_length = 4;

const EMConfig = {
    serialNo: { offset: 20, length: 4 },
    pregard: { obis: '1:1.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    pregardcounter: { obis: '1:1.8.0', length: 8, factor: 1 / 3600000, unit: 'kWh', decimals: 3 },
    psurplus: { obis: '1:2.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    psurpluscounter: { obis: '1:2.8.0', length: 8, factor: 1 / 3600000, unit: 'kWh', decimals: 3 },
    frequency: { obis: '1:14.4.0', length: 4, factor: 1 / 1000, unit: 'Watt', decimals: 2 },
    pregardL1: { obis: '1:21.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    psurplusL1: { obis: '1:22.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    currentL1: { obis: '1:31.4.0', length: 4, factor: 1 / 1000, unit: 'A', decimals: 2 },
    voltageL1: { obis: '1:32.4.0', length: 4, factor: 1 / 1000, unit: 'V', decimals: 0 },
    pregardL2: { obis: '1:41.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    psurplusL2: { obis: '1:42.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    currentL2: { obis: '1:51.4.0', length: 4, factor: 1 / 1000, unit: 'A', decimals: 2 },
    voltageL2: { obis: '1:52.4.0', length: 4, factor: 1 / 1000, unit: 'V', decimals: 0 },
    pregardL3: { obis: '1:61.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    psurplusL3: { obis: '1:62.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    currentL3: { obis: '1:71.4.0', length: 4, factor: 1 / 1000, unit: 'A', decimals: 2 },
    voltageL3: { obis: '1:72.4.0', length: 4, factor: 1 / 1000, unit: 'V', decimals: 0 },
    swVersion: { obis: '144:0.0.0', length: 4 }
};

class EnergyMeter extends HomeyEventEmitter {
    constructor(options) {
        super();
        if (options == null) { options = {} };
        this.options = options;
        this.shouldBeConnected = false;
        this.connected = false;
        this.lastReading = 0;
        this.remoteHost = null;
        this.udpSourcePort = null;

        this.#initListenersAndConnect();
    }

    disconnect() {
        this.shouldBeConnected = false;

        if (this.client) {
            this.client.close();
        }
    }

    setRefreshInterval(interval) {
        this.options.refreshInterval = interval;
    }

    #restartClientIfLost() {
        this._logMessage('DEBUG', `Checking client status...`);
        let timestamp = Date.now();
        if (this.client && (this.lastReading + (this.options.refreshInterval * 2000) < timestamp)) {
            this._logMessage('INFO', `No messages recieved for some time. Restarting EM2 client listener...`);
            this.shouldBeConnected = false;
            this.client.close();
            this.#initListenersAndConnect();
        }
    }

    #initListenersAndConnect() {
        this.client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        this.client.on('listening', () => {
            // If refresh interval is not set, then we assume we are doing discovery
            if (this.options.refreshInterval) {
                this.intervalTimer = this._setInterval(
                    () => {
                        this.#restartClientIfLost();
                    }, this.options.refreshInterval * 2000
                );
            }
        });

        this.client.on("message", (message, rinfo) => {
            // Include remote sender information (IP:port) with each received datagram
            this._logMessage('DEBUG', `Message from ${rinfo.address}:${rinfo.port}: `, message.toString('hex'));

            // Check if packet is an SMA energy meter packet
            if (verifyMessage(message) === false) {
                return;
            }

            if (!this.connected) {
                this.connected = true;
            }
            let timestamp = Date.now();
            if (!this.options.refreshInterval ||
                timestamp > (this.lastReading + this.options.refreshInterval * 1000)) {
                // Time to accept a new multicast reading
                this.lastReading = timestamp;
                // Remember last sender host/port for follow-up actions
                this.remoteHost = rinfo.address;
                this.udpSourcePort = rinfo.port;

                let response = {
                    serialNo: 0,
                    frequency: 0,
                    pregard: 0,
                    psurplus: 0,
                    pregardcounter: 0,
                    psurpluscounter: 0,
                    pregardL1: 0,
                    psurplusL1: 0,
                    currentL1: 0,
                    voltageL1: 0,
                    pregardL2: 0,
                    psurplusL2: 0,
                    currentL2: 0,
                    voltageL2: 0,
                    pregardL3: 0,
                    psurplusL3: 0,
                    currentL3: 0,
                    voltageL3: 0,
                    swVersion: 0
                };

                response.serialNo = readSerial(message, EMConfig.serialNo);
                if (this.options.serialNo != null && response.serialNo != null) {
                    // We are in operational mode
                    if (this.options.serialNo == response.serialNo) {
                        // We have a match on serial, lets get all readings from datagram
                        readObisValues(message, response);
                        this.emit('readings', response);
                    }
                } else if (response.serialNo != null) {
                    // We are in discovery mode
                    this.emit('readings', response);
                }
            }
        });

        this.client.on('close', () => {
            this._logMessage('INFO', `EM2 client closed`);
            if (this.intervalTimer) {
                this._clearInterval(this.intervalTimer);
                this.intervalTimer = null;
            }
            this.connected = false;
            if (this.shouldBeConnected) {
                // Not supposed to be closed
                this.emit('error', new Error('Socket closed unexpectedly, restart app'));
            }
        });

        this.client.on('error', (err) => {
            this.emit('error', err);
        });

        // Bind socket to the multicast address on all devices except localhost
        this.client.bind(PORT, () => {
            this.shouldBeConnected = true;

            for (const dev of findIPv4IPs()) {
                this._logMessage('INFO', `EM2 listen via UDPv4 on Device '${dev.name}' with IP '${dev.ipaddr}' on Port '${PORT}' for Multicast IP '${MULTICAST_ADDR}'`);
                this.client.addMembership(MULTICAST_ADDR, dev.ipaddr);
            }
        });
    }

    async writeExportLimit(value, options) {
        const defaults = { unitId: 2, host: null, port: null, timeoutMs: 5000 };
        const { unitId, host, port, timeoutMs } = Object.assign({}, defaults, options);

        const targetHost = host || this.remoteHost;
        const targetPort = port ?? 502; // Modbus/TCP default
        if (!targetHost) {
            throw new Error('No known remote host. Wait for a datagram or provide options.host');
        }

        this._logMessage('INFO', `Writing export limit ${value} to ${targetHost}:${targetPort} (unitId=${unitId}) @40016`);
        return await this.#writeSingleRegister(targetHost, targetPort, unitId, 40016, value, timeoutMs);
    }

    getLastSender() {
        return { host: this.remoteHost, udpPort: this.udpSourcePort };
    }

    #writeSingleRegister(host, port, unitId, address, value, timeoutMs) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const client = new modbus.client.TCP(socket, unitId, timeoutMs);
            const options = { host, port };

            let finished = false;
            const finishOnce = (err, res) => {
                if (finished) return;
                finished = true;
                try { socket.destroy(); } catch (e) { /* ignore */ }
                if (err) return reject(err);
                return resolve(res);
            };

            socket.setTimeout(timeoutMs);

            socket.on('connect', function () {
                client.writeSingleRegister(address, value)
                    .then((writeRes) => finishOnce(null, writeRes))
                    .catch((err) => finishOnce(err));
            });

            socket.on('error', function (err) {
                finishOnce(err);
            });

            socket.on('timeout', function () {
                finishOnce(new Error('Socket timeout'));
            });

            socket.on('close', function () {
                // no-op; handled via finishOnce
            });

            try {
                socket.connect(options);
            } catch (err) {
                finishOnce(err);
            }
        });
    }

}
module.exports = EnergyMeter;

function verifyMessage(message) {
    // Check SMA ident string at the first 0 bytes
    if (message.toString('ascii', 0, 3) != 'SMA') {
        return false;
    }

    // Check protocol type
    if (message.readUInt16BE(16) != 0x6069) {
        return false;
    }

    return true;
}

function findIPv4IPs() {
    // Get all network devices
    let ifaces = os.networkInterfaces();
    var net_devs = [];

    for (var dev in ifaces) {
        if (ifaces.hasOwnProperty(dev)) {

            // Read IPv4 address properties of each device by filtering for the IPv4 external interfaces
            ifaces[dev].forEach(details => {
                if (!details.internal && details.family === 'IPv4') {
                    net_devs.push({ name: dev, ipaddr: details.address });
                }
            });
        }
    }
    return net_devs;
}

function readObisValues(message, response) {
    //Start at position 28, after initial static stuff
    for (var pointer = 28; pointer < message.length; pointer++) {
        let val = message.readUIntBE(pointer, obis_dword_length);
        let potentialObis = decodeObis(val);

        switch (potentialObis) {
            case EMConfig.pregard.obis:
                response.pregard = readValue(message, pointer, EMConfig.pregard);
                break;
            case EMConfig.psurplus.obis:
                response.psurplus = readValue(message, pointer, EMConfig.psurplus);
                break;
            case EMConfig.pregardcounter.obis:
                response.pregardcounter = readValue(message, pointer, EMConfig.pregardcounter);
                break;
            case EMConfig.psurpluscounter.obis:
                response.psurpluscounter = readValue(message, pointer, EMConfig.psurpluscounter);
                break;
            case EMConfig.frequency.obis:
                response.frequency = readValue(message, pointer, EMConfig.frequency);
                break;
            case EMConfig.pregardL1.obis:
                response.pregardL1 = readValue(message, pointer, EMConfig.pregardL1);
                break;
            case EMConfig.psurplusL1.obis:
                response.psurplusL1 = readValue(message, pointer, EMConfig.psurplusL1);
                break;
            case EMConfig.currentL1.obis:
                response.currentL1 = readValue(message, pointer, EMConfig.currentL1);
                break;
            case EMConfig.voltageL1.obis:
                response.voltageL1 = readValue(message, pointer, EMConfig.voltageL1);
                break;
            case EMConfig.pregardL2.obis:
                response.pregardL2 = readValue(message, pointer, EMConfig.pregardL2);
                break;
            case EMConfig.psurplusL2.obis:
                response.psurplusL2 = readValue(message, pointer, EMConfig.psurplusL2);
                break;
            case EMConfig.currentL2.obis:
                response.currentL2 = readValue(message, pointer, EMConfig.currentL2);
                break;
            case EMConfig.voltageL2.obis:
                response.voltageL2 = readValue(message, pointer, EMConfig.voltageL2);
                break;
            case EMConfig.pregardL3.obis:
                response.pregardL3 = readValue(message, pointer, EMConfig.pregardL3);
                break;
            case EMConfig.psurplusL3.obis:
                response.psurplusL3 = readValue(message, pointer, EMConfig.psurplusL3);
                break;
            case EMConfig.currentL3.obis:
                response.currentL3 = readValue(message, pointer, EMConfig.currentL3);
                break;
            case EMConfig.voltageL3.obis:
                response.voltageL3 = readValue(message, pointer, EMConfig.voltageL3);
                break;
            case EMConfig.swVersion.obis:
                response.swVersion = readSWVersion(message, pointer);
                break;
            default:
            //Do nothing
        }

        pointer = pointer + 3;
    }
}

function readSerial(message, field) {
    let serial = null;
    if (message.length > (field.offset + field.length)) {
        serial = message.readUInt32BE(field.offset);
    }
    return serial;
}

function readSWVersion(message, pointer) {
    let value = message.readUInt32BE(pointer + obis_dword_length);
    let b0 = value & 0xff;
    let b1 = (value >>> 8) & 0xff;
    let b2 = (value >>> 16) & 0xff;
    let b3 = (value >>> 24) & 0xff;
    return `${b3}.${utility.pad(b2, 2)}.${b1}.${String.fromCharCode(b0)}`;
}

function readValue(message, pointer, field) {
    let value = 0;
    if (field.length === 4) {
        value = message.readUInt32BE(pointer + obis_dword_length);
    } else if (field.length === 8) {
        value = message.readBigUInt64BE(pointer + obis_dword_length);
    }
    value = Number(value) * field.factor;
    return parseFloat(value.toFixed(field.decimals));
}

function decodeObis(val) {
    let b0 = val & 0xff;
    let b1 = (val >>> 8) & 0xff;
    let b2 = (val >>> 16) & 0xff;
    let b3 = (val >>> 24) & 0xff;
    //Spec says value should be 1, but reading contains 0
    if (b3 === 0) {
        b3 = 1;
    }
    return `${b3}:${b2}.${b1}.${b0}`;
}
