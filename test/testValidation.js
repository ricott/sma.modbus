'use strict';

const modbus = require('jsmodbus');
const net = require('net');

const host = '192.168.200.34';
const port = 502;

const isModbusAvailable = function (host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const client = new modbus.client.TCP(socket, 3, 5000);
        const options = { host, port };

        socket.setTimeout(5000);

        socket.on('connect', function () {
            console.log(`Connected to ${host}:${port}, testing Modbus communication...`);
            
            Promise.all([
                client.readHoldingRegisters(30053, 2)
            ]).then((results) => {
                console.log(`Modbus communication successful! Device responded with data.`);
                socket.destroy();
                resolve(true);
            }).catch((err) => {
                console.log(`Modbus read failed:`, err.message);
                socket.destroy();
                resolve(false);
            });
        });

        socket.on('error', function (err) {
            console.log(`Modbus connection to ${host}:${port} failed:`, err.message);
            resolve(false);
        });

        socket.on('timeout', function () {
            console.log(`Modbus connection to ${host}:${port} timed out`);
            socket.destroy();
            resolve(false);
        });

        socket.on('close', function () {
            console.log(`Connection to ${host}:${port} closed`);
        });

        console.log(`Attempting Modbus connection to ${host}:${port}...`);
        socket.connect(options);
    });
}

isModbusAvailable(host, port).then(result => {
    console.log('Final result - Modbus device available:', result);
    process.exit(0);
});