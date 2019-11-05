'use strict';

const dgram = require("dgram");
var EventEmitter = require('events');
var util = require('util');

//UDP datagram must be sent to the multicast address 239.12.255.254 via port 9522
const PORT = 9522;
const MULTICAST_ADDR = "239.12.255.254";

const EMConfig = {
    serialNo: {offset: 20,  length: 4, factor: 1, unit: '', decimals: 0},
    //regard = from grid
    pregard: {offset: 32,  length: 4, factor: 1/10, unit: 'Watt', decimals: 0},
    //pregardcounter: {offset: 40,  length: 8, factor: 1/3600000, unit: 'kWh', decimals: 2},
    //surplus = to grid 
    psurplus: {offset: 52,  length: 4, factor: 1/10, unit: 'Watt', decimals: 0},
    //psurpluscounter: {offset: 60,  length: 8, factor: 1/3600000, unit: 'kWh', decimals: 2},
    pregardL1: {offset: 160, length: 4, factor: 1/10, unit: 'Watt', decimals: 0},
    psurplusL1: {offset: 180, length: 4, factor: 1/10, unit: 'Watt', decimals: 0},
    currentL1: {offset: 280, length: 4, factor: 1/1000, unit: 'A', decimals: 2},
    //voltageL1: {offset: 288, length: 4, factor: 1/1000, unit: 'V', decimals: 0},
    pregardL2: {offset: 304, length: 4, factor: 1/10, unit: 'Watt', decimals: 0},
    psurplusL2:	{offset: 324, length: 4, factor: 1/10, unit: 'Watt', decimals: 0},
    currentL2: {offset: 424, length: 4, factor: 1/1000, unit: 'A', decimals: 2},
    //voltageL2: {offset: 432, length: 4, factor: 1/1000, unit: 'V', decimals: 0},
    pregardL3: {offset: 448, length: 4, factor: 1/10, unit: 'Watt', decimals: 0},
    psurplusL3: {offset: 468, length: 4, factor: 1/10, unit: 'Watt', decimals: 0},
    currentL3: {offset: 568, length: 4, factor: 1/1000, unit: 'A', decimals: 2},
    //voltageL3: {offset: 576, length: 4, factor: 1/1000, unit: 'V', decimals: 0}
}

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
  
    if (self.server) {
      self.server.close();
    }
}

EnergyMeter.prototype.setRefreshInterval = function (interval) {
    var self = this;
    self.options.refreshInterval = interval;
}

function initListenersAndConnect(self) {
    
    self.server = dgram.createSocket({ type: "udp4", reuseAddr: true });

    self.server.on("listening", function() {
        self.server.addMembership(MULTICAST_ADDR);
        self.server.setBroadcast(true);
        self.shouldBeConnected = true;
    });
    
    self.server.on("message", function (message, rinfo) {
        if (!self.connected) {
            self.connected = true;
        }
        let timestamp = Date.now();
        if (!self.options.refreshInterval || 
            timestamp > (self.lastReading + self.options.refreshInterval * 1000)) {
            //Time to accept a new multicast reading
            self.lastReading = timestamp;

            readDGMessage({serialNo: EMConfig.serialNo}, message)
            .then((serialResult) => {
                serialResult = buildResultObj(serialResult);
                if (self.options.serialNo) {
                    if (self.options.serialNo == serialResult.serialNo) {
                        //We have the right serial number, read all values
                        readDGMessage(EMConfig, message)
                        .then((values) => {
                            self.emit('readings', buildResultObj(values));
                        });          
                    }
                } else {
                    //Assume discovery query, just pass on serial number
                    self.emit('readings', serialResult);
                }
    
            });
        
        }
    });

    self.server.on('close', () => {
        self.connected = false;
        if (self.shouldBeConnected) {
            //Not supposed to be closed
            self.emit('error', new Error('Socket closed unexpectedly, restart app'));
        }
    });

    self.server.on('error', (err) => {
        self.emit('error', err);
    });

    self.server.bind(PORT);
}

// Iterates all datagram values and returns their value
const readDGMessage = async (configObj, message) => {
    const requests = Object.keys(configObj).map((config) => {
        return datagramReading(configObj[config], message)
        .then((reading) => {
        return [config, reading];
        });
    });
    return Promise.all(requests); // Waiting for all the readings to get resolved.
}

const datagramReading = async (config, message) => {
    const result = readDatagramValue(config, message);
    return result;
}

function readDatagramValue(config, message) {
    let value = 0;
    if(config.length === 8) {
        let lowbyte = BigInt(message.readUInt32BE(config.offset +4));
        let highbyte = BigInt(message.readUInt32BE(config.offset));
        value = Number(((highbyte << 32n) + lowbyte));
        value = value * config.factor;
    } else {
        value = message.readUIntBE(config.offset, config.length) * config.factor;
    }

    value = parseFloat(value.toFixed(config.decimals));
    return value;
}

function buildResultObj(resultArray) {
    let resultList = {};
    resultArray.map((key) => {
        resultList[key[0]] = key[1];
    });
    return resultList;
}


exports = module.exports = EnergyMeter;