'use strict';

const SMA = require('./sma.js');
var EventEmitter = require('events');
var util = require('util');
var dgram = require("dgram");

//UDP datagram must be sent to the multicast address 239.12.255.254 via port 9522
const PORT = 9522;
const MULTICAST_ADDR = "239.12.255.254";
const datagram = Buffer.from('534d4100000402a0ffffffff0000002000000000', 'hex');

function Discovery(options) {
    var self = this;
    EventEmitter.call(self);
    self.inverterList = [];
    self.inverterPort = options.port;
}
util.inherits(Discovery, EventEmitter);
  
Discovery.prototype.discover = function () {
    var self = this;
    let socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    
    socket.on("listening", function() {
        socket.addMembership(MULTICAST_ADDR);
        socket.send(datagram, 0, datagram.length, PORT, MULTICAST_ADDR, function() {
            console.info(`Sending discovery datagram`);
        });
    });
    
    socket.on("message", function(message, rinfo) {
        //console.info(`Message from: ${rinfo.address}:${rinfo.port} - ${message}`);
        let response = Buffer.from(message).toString('hex');
        if (response.startsWith('534d4100000402a000000001000200000001')) {
            self.inverterList.push(rinfo.address);
            console.log(`Found inverter at: ${rinfo.address}`);
        }
    });
    
    socket.bind(PORT);
    //Wait 1 second before we collect the inverters found
    sleep(1000).then(() => {
        console.log(`Collecting inverter info, found ${self.inverterList.length} inverters.`);
        if (self.inverterList) {
            lookupInverters(self, self.inverterList)
            .then((result) => {
                //console.log('Get result', result);
            });
        } else {
            self.emit('inverterInfo', []);
        }
    });
}

const lookupInverter = async (self, ipAddress) => {
    let smaSession = new SMA({
        host: ipAddress,
        port: self.inverterPort,
        autoClose: true

    });
    
    smaSession.on('properties', result => {
        result.port = self.inverterPort;
        result.address = ipAddress;
        self.emit('inverterInfo', result);
    });

  }
  
const lookupInverters = async (self, ipAddresses) => {
    const requests = ipAddresses.map((ipAddress) => {
        return lookupInverter(self, ipAddress)
        .then((inverterInfo) => {
        return inverterInfo;
        });
    });
    return Promise.all(requests);
}

// sleep time expects milliseconds
function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

exports = module.exports = Discovery;
