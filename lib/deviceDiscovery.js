'use strict';

const SMA = require('./sma.js');
const HomeyEventEmitter = require('./homeyEventEmitter.js');
const dgram = require("dgram");

//UDP datagram must be sent to the multicast address 239.12.255.254 via port 9522
const PORT = 9522;
const MULTICAST_ADDR = "239.12.255.254";
const datagram = Buffer.from('534d4100000402a0ffffffff0000002000000000', 'hex');

class Discovery extends HomeyEventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
        this.deviceList = [];
        this.inverterPort = options.port;
    }

    discover() {
        return new Promise((resolve, reject) => {
            const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

            socket.on("listening", () => {
                socket.addMembership(MULTICAST_ADDR);
                socket.send(datagram, 0, datagram.length, PORT, MULTICAST_ADDR, () => {
                    this._logMessage('INFO', `Sending discovery datagram`);
                });
            });

            socket.on("message", (message, rinfo) => {
                this._logMessage('DEBUG', `Message from: ${rinfo.address}:${rinfo.port} - ${message}`);
                const response = Buffer.from(message).toString('hex');
                if (response.startsWith('534d4100000402a000000001000200000001')) {
                    this.deviceList.push(rinfo.address);
                    this._logMessage('INFO', `Found SMA device at: ${rinfo.address}`);
                }
            });

            socket.bind(PORT);
            //Wait 1.5 seconds before we collect the inverters found
            this._sleep(1500).then(() => {
                this._logMessage('INFO', `Collecting device info, found ${this.deviceList.length} devices.`);
                if (this.deviceList.length > 0) {
                    this.#lookupInverters(this.deviceList)
                        .then(validInverters => {
                            resolve(validInverters);
                        })
                        .catch(error => {
                            // Even if some lookups fail, we still want to return the successful ones
                            resolve([]);
                        });
                } else {
                    resolve([]);
                }
            });
        });
    }

    async #lookupInverter(ipAddress) {
        return new Promise((resolve, reject) => {
            const smaSession = new SMA({
                host: ipAddress,
                port: this.inverterPort,
                autoClose: true,
                device: this.options?.device
            });

            smaSession.on('properties', result => {
                result.port = this.inverterPort;
                result.address = ipAddress;
                resolve(result);
            });

            smaSession.on('error', error => {
                this._logMessage('WARN', `Port '${this.inverterPort}' on IP Address '${ipAddress}' is NOT reachable`);
                reject(new Error(`Inverter found on IP '${ipAddress}', but port '${this.inverterPort}' is wrong!`));
            });
        });
    }

    async #lookupInverters(ipAddresses) {
        const validInverters = [];
        const lookupPromises = ipAddresses.map(async ipAddress => {
            try {
                const inverterInfo = await this.#lookupInverter(ipAddress);
                validInverters.push(inverterInfo);
            } catch (error) {
                // Log the error but continue with other lookups
                this._logMessage('WARN', error.message);
            }
        });

        await Promise.all(lookupPromises);
        return validInverters;
    }
}

module.exports = Discovery;
