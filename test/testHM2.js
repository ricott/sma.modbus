'use strict';

var modbus = require('jsmodbus');
var net = require('net');
const decodeData = require('../lib/decodeData.js');

let socket = new net.Socket();
let client = new modbus.client.TCP(socket, 2, 5000);
let options = {
    host: '192.168.200.241',
    port: 502,
};

socket.on('connect', function () {
    console.log(`Client connected on IP '${options.host}'`);
    Promise.all([

        client.readHoldingRegisters(30865, 2)

    ]).then((results) => {

        console.log(results[0].response);
        console.log(decodeData.decodeU32(results[0].response._body._valuesAsArray, 0, 0));

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



