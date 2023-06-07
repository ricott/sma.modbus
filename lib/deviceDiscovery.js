'use strict';

const SMA = require('./sma.js');
const HomeyEventEmitter = require('./homeyEventEmitter.js');
var dgram = require("dgram");

//UDP datagram must be sent to the multicast address 239.12.255.254 via port 9522
const PORT = 9522;
const MULTICAST_ADDR = "239.12.255.254";
const datagram = Buffer.from('534d4100000402a0ffffffff0000002000000000', 'hex');

class Discovery extends HomeyEventEmitter {
    constructor(options) {
        super();
        if (options == null) { options = {} };
        this.options = options;
        this.deviceList = [];
        this.inverterPort = options.port;
    }

    discover() {
        var self = this;
        let socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

        socket.on("listening", function () {
            socket.addMembership(MULTICAST_ADDR);
            socket.send(datagram, 0, datagram.length, PORT, MULTICAST_ADDR, function () {
                self._logMessage('INFO', `Sending discovery datagram`);
            });
        });

        socket.on("message", function (message, rinfo) {
            self._logMessage('DEBUG', `Message from: ${rinfo.address}:${rinfo.port} - ${message}`);
            let response = Buffer.from(message).toString('hex');
            if (response.startsWith('534d4100000402a000000001000200000001')) {
                self.deviceList.push(rinfo.address);
                self._logMessage('INFO', `Found SMA device at: ${rinfo.address}`);
            }
        });

        socket.bind(PORT);
        //Wait 1.5 seconds before we collect the inverters found
        self._sleep(1500).then(() => {
            self._logMessage('INFO', `Collecting device info, found ${self.deviceList.length} devices.`);
            if (self.deviceList) {
                self.#lookupInverters(self.deviceList)
                    .then((result) => {
                        //console.log('Get result', result);
                    });
            } else {
                self.emit('deviceInfo', []);
            }
        });
    }

    async #lookupInverter(ipAddress) {
        var self = this;
        let smaSession = new SMA({
            host: ipAddress,
            port: self.inverterPort,
            autoClose: true,
            device: self.options?.device || undefined
        });

        smaSession.on('properties', result => {
            result.port = self.inverterPort;
            result.address = ipAddress;
            self.emit('deviceInfo', result);
        });

        smaSession.on('error', error => {
            let msg = `Inverter found on IP '${ipAddress}', but port '${self.inverterPort}' is wrong!`;
            self.emit('error', new Error(msg));
        });
    }

    async #lookupInverters(ipAddresses) {
        var self = this;
        const requests = ipAddresses.map((ipAddress) => {
            return self.#lookupInverter(ipAddress)
                .then((inverterInfo) => {
                    return inverterInfo;
                });
        });
        return Promise.all(requests);
    }
}
module.exports = Discovery;
