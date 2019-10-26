'use strict';

const energyType = require('./energyType.js');
const dgram = require("dgram");
var EventEmitter = require('events');
var util = require('util');

//UDP datagram must be sent to the multicast address 239.12.255.254 via port 9522
const PORT = 9522;
const MULTICAST_ADDR = "239.12.255.254";

function EnergyMeter(options) {
    var self = this;
    EventEmitter.call(self);
    self.options = options;
    self.shouldBeConnected = false;
    self.connected = false;
    self.lastReading = Date.now();

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

function initListenersAndConnect(self) {
    
    self.server = dgram.createSocket({ type: "udp4", reuseAddr: true });

    self.server.on("listening", function() {
        server.addMembership(MULTICAST_ADDR);
        server.setBroadcast(true);
        self.shouldBeConnected = true;
    });
    
    self.server.on("message", function(message, rinfo) {
        if (!self.connected) {
            self.connected = true;
        }
        let timestamp = Date.now();
        //if (self.lastReading + self.options.refreshInterval * 1000 > timestamp) {
            //Time to accept a new multicast reading
            self.lastReading = timestamp;
            let serialResult = energyType.readSerialNumber(message);
            if (self.options.serialNo) {
                if (self.options.serialNo === serialResult.serialNo) {
                    //We have the right serial number, read all values
                    let values = energyType.readDatagramValues(message);
                    self.emit('readings', values);
                }
            } else {
                //Assume discovery query, just pass on serial number
                self.emit('readings', serialResult);
            }

        //}
    });

    self.server.on('close', () => {
        self.connected = false;
        if (self.shouldBeConnected) {
            //Not supposed to be closed
            //TODO restart?
        }
    });

    self.server.on('error', (err) => {
        self.emit('error', err);
    });

    self.server.bind(PORT);
}

exports = module.exports = EnergyMeter;