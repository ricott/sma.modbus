'use strict';

const HomeyEventEmitter = require('./homeyEventEmitter.js');
const util = require('../util.js');
const dgram = require("dgram");

//UDP datagram must be sent to the multicast address 239.12.255.254 via port 9522
const PORT = 9522;
const MULTICAST_ADDR = "239.12.255.254";
const datagram = Buffer.from('534d4100000402a0ffffffff0000002000000000', 'hex');

class BaseDiscovery extends HomeyEventEmitter {
    constructor(options = {}) {
        super();
        this.options = options;
        this.deviceList = [];
        this.devicePort = options.port;
    }

    // Abstract method - must be implemented by subclasses
    createDevice(options) {
        throw new Error('createDevice method must be implemented by subclass');
    }

    // Abstract method - must be implemented by subclasses  
    getDeviceTypeName() {
        throw new Error('getDeviceTypeName method must be implemented by subclass');
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
            //Wait 2 seconds before we collect the devices found
            this._sleep(2000).then(() => {
                this._logMessage('INFO', `Collecting device info, found ${this.deviceList.length} devices.`);
                if (this.deviceList.length > 0) {
                    this.#lookupDevices(this.deviceList)
                        .then(validDevices => {
                            resolve(validDevices);
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

    async #lookupDevices(ipAddresses) {
        const validDevices = [];
        const lookupPromises = ipAddresses.map(async ipAddress => {
            try {
                const deviceInfo = await this.#validateAndGetProperties(ipAddress);
                validDevices.push(deviceInfo);
            } catch (error) {
                // Log the error but continue with other lookups
                this._logMessage('WARN', error.message);
            }
        });

        await Promise.all(lookupPromises);
        return validDevices;
    }

    async #validateAndGetProperties(ipAddress) {
        // First, quickly validate connectivity using util function
        this._logMessage('DEBUG', `Validating connectivity to ${ipAddress}:${this.devicePort}`);
        const isAvailable = await util.isModbusAvailable(ipAddress, this.devicePort, this._logMessage.bind(this));

        if (!isAvailable) {
            throw new Error(`${this.getDeviceTypeName()} found on IP '${ipAddress}', but port '${this.devicePort}' is not reachable!`);
        }

        // If connectivity is good, get device properties
        this._logMessage('DEBUG', `Connectivity validated, getting device properties from ${ipAddress}`);

        try {
            const smaSession = this.createDevice({
                host: ipAddress,
                port: this.devicePort,
                autoClose: true,
                device: this.options.device
            });

            // Wait for properties event and use the properties from it
            const properties = await new Promise((resolve, reject) => {
                smaSession.on('properties', (result) => {
                    // Add connection details to the properties
                    result.port = this.devicePort;
                    result.address = ipAddress;
                    this._logMessage('DEBUG', `Retrieved properties for ${result.deviceType} at ${ipAddress}`);
                    resolve(result);
                });

                smaSession.on('error', (error) => {
                    reject(error);
                });
            });

            return properties;

        } catch (error) {
            this.options.device.error(error.message || String(error));
            this._logMessage('WARN', `Failed to get properties from ${ipAddress}: ${error.message}`);
            throw new Error(`${this.getDeviceTypeName()} at IP '${ipAddress}' failed to provide properties: ${error.message}`);
        }
    }
}

module.exports = BaseDiscovery;
