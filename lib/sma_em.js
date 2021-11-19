'use strict';

const dgram = require('dgram');
const os = require('os');
var EventEmitter = require('events');
var util = require('util');
const utility = require('./util.js');

//UDP datagram must be sent to the multicast address 239.12.255.254 via port 9522
const PORT = 9522;
const MULTICAST_ADDR = "239.12.255.254";
const obis_dword_length = 4;
const energyMeterProtocolId = '6069';

const EMConfig = {
    protocolId: { offset: 16, length: 2 },
    serialNo: { offset: 20, length: 4 },
    pregard: { obis: '1:1.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    //pregardcounter: { obis: '1:1.8.0', length: 8, factor: 1/3600000, unit: 'kWh', decimals: 2 },
    psurplus: { obis: '1:2.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    //psurpluscounter: { obis: '1:2.8.0', length: 8, factor: 1/3600000, unit: 'kWh', decimals: 2 },
    frequency: { obis: '1:14.4.0', length: 4, factor: 1 / 1000, unit: 'Watt', decimals: 2 },
    pregardL1: { obis: '1:21.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    psurplusL1: { obis: '1:22.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    currentL1: { obis: '1:31.4.0', length: 4, factor: 1 / 1000, unit: 'A', decimals: 2 },
    //voltageL1: { obis: '1:32.4.0', length: 4, factor: 1/1000, unit: 'V', decimals: 0 },
    pregardL2: { obis: '1:41.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    psurplusL2: { obis: '1:42.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    currentL2: { obis: '1:51.4.0', length: 4, factor: 1 / 1000, unit: 'A', decimals: 2 },
    //voltageL2: { obis: '1:52.4.0', length: 4, factor: 1/1000, unit: 'V', decimals: 0 },
    pregardL3: { obis: '1:61.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    psurplusL3: { obis: '1:62.4.0', length: 4, factor: 1 / 10, unit: 'Watt', decimals: 0 },
    currentL3: { obis: '1:71.4.0', length: 4, factor: 1 / 1000, unit: 'A', decimals: 2 },
    //voltageL3: { obis: '1:72.4.0', length: 4, factor: 1/1000, unit: 'V', decimals: 0 }
    swVersion: { obis: '144:0.0.0', length: 4 }
};

function EnergyMeter(options) {
    var self = this;
    EventEmitter.call(self);
    self.options = options;
    self.shouldBeConnected = false;
    self.connected = false;
    self.lastReading = 0;

    initListenersAndConnect(self);
}
util.inherits(EnergyMeter, EventEmitter);

EnergyMeter.prototype.disconnect = function () {
    var self = this;
    self.shouldBeConnected = false;

    if (self.client) {
        self.client.close();
    }
}

EnergyMeter.prototype.setRefreshInterval = function (interval) {
    var self = this;
    self.options.refreshInterval = interval;
}

function initListenersAndConnect(self) {

    self.client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    self.client.on("message", function (message, rinfo) {
        if (self.options.debug) {
            console.log('Message: ', message.toString('hex'));
        }

        if (!self.connected) {
            self.connected = true;
        }
        let timestamp = Date.now();
        if (!self.options.refreshInterval ||
            timestamp > (self.lastReading + self.options.refreshInterval * 1000)) {
            //Time to accept a new multicast reading
            self.lastReading = timestamp;
            //console.log(message.toString('hex'));
            let response = {
                serialNo: 0,
                frequency: 0,
                pregard: 0,
                //pregardcounter: 0,
                psurplus: 0,
                pregardL1: 0,
                psurplusL1: 0,
                currentL1: 0,
                pregardL2: 0,
                psurplusL2: 0,
                currentL2: 0,
                pregardL3: 0,
                psurplusL3: 0,
                currentL3: 0,
                swVersion: 0
            };

            const protocolId = readProtocol(message, EMConfig.protocolId);
            if (protocolId != null && protocolId == energyMeterProtocolId) {
                //This is an UDP datagram from an energy meter
                response.serialNo = readSerial(message, EMConfig.serialNo);
                if (response.serialNo != null) {
                    if (self.options.serialNo == response.serialNo) {
                        //We have a serial, lets get all readings from datagram
                        readObisValues(message, response);
                    }
    
                    self.emit('readings', response);
                } else {
                    console.log(`Received UDP datagram that was malformed '${message.toString('hex')}'`);
                }
            }
        }
    });

    self.client.on('close', () => {
        self.connected = false;
        if (self.shouldBeConnected) {
            //Not supposed to be closed
            self.emit('error', new Error('Socket closed unexpectedly, restart app'));
        }
    });

    self.client.on('error', (err) => {
        self.emit('error', err);
    });

    // Bind socket to the multicast address on all devices except localhost
    self.client.bind(PORT, () => {
        self.shouldBeConnected = true;

        for (const dev of findIPv4IPs()) {
            console.log(`Listen via UDPv4 on Device '${dev.name}' with IP '${dev.ipaddr}' on Port '${PORT}' for Multicast IP '${MULTICAST_ADDR}'`);
            self.client.addMembership(MULTICAST_ADDR, dev.ipaddr);
        }
    });
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
            /*case EMConfig.pregardcounter.obis:
                response.pregardcounter = readValue(message, pointer, EMConfig.pregardcounter);
                break;*/
            case EMConfig.psurplus.obis:
                response.psurplus = readValue(message, pointer, EMConfig.psurplus);
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
            case EMConfig.pregardL2.obis:
                response.pregardL2 = readValue(message, pointer, EMConfig.pregardL2);
                break;
            case EMConfig.psurplusL2.obis:
                response.psurplusL2 = readValue(message, pointer, EMConfig.psurplusL2);
                break;
            case EMConfig.currentL2.obis:
                response.currentL2 = readValue(message, pointer, EMConfig.currentL2);
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

function readProtocol(message, field) {
    let protocol = null;
    if (message.length > (field.offset + field.length)) {
        protocol = message.toString('hex', field.offset, field.offset + field.length);
    }
    return protocol;
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

exports = module.exports = EnergyMeter;