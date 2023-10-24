'use strict';

var modbus = require('jsmodbus');
var net = require('net');
const decodeData = require('../lib/decodeData.js');

let socket = new net.Socket();
let client = new modbus.client.TCP(socket, 3, 5000);
let options = {
    host: "192.168.200.249",
    port: 502,
};

let buffer = Buffer.alloc(4);
buffer.writeUInt16BE(0, 0);
buffer.writeUInt16BE(20000, 2);
console.log(buffer);

socket.on('connect', function () {
    console.log(`Client connected on IP '${options.host}'`);
    Promise.all([

        //client.writeMultipleRegisters(30233, buffer)
        // client.writeMultipleRegisters(30837, buffer)
        //client.readHoldingRegisters(30837, 2)
        //client.writeMultipleRegisters(40915, buffer)
        client.readHoldingRegisters(40915, 2)
        //client.readHoldingRegisters(41217, 2) //Makes zero export possible?
        //client.writeMultipleRegisters(41217, buffer)
        //client.readHoldingRegisters(40016, 1)

    ]).then((results) => {

        console.log(results[0].response);
        //console.log(decodeData.decodeU32(results[0].response._body._valuesAsArray, 0, 0));
        console.log(decodeData.decodeS32(results[0].response._body._valuesAsArray, 0, 0));

    }).catch((err) => {
        console.log('error', err);
    }).finally(function () {
        socket.destroy();
    });
});

socket.on('error', function (err) {
    console.log('error', err);
});

socket.on('close', function () {
    console.log(`Client closed for IP '${options.host}'`);
});

socket.connect(options);



