'use strict';

const modbus = require('jsmodbus');
const net = require('net');

const host = '192.168.200.241';
const port = 502;
const unitId = 2;

const socket = new net.Socket();
const client = new modbus.client.TCP(socket, unitId, 5000);
const options = { host, port };

socket.setTimeout(5000);

socket.on('connect', function () {
  console.log(`Connected to ${host}:${port} (unitId=${unitId})`);

  client.writeSingleRegister(40016, 100)
    .then((writeRes) => {
      console.log('Write response:', writeRes.response ? 'OK' : writeRes);
    })
    .catch((err) => {
      console.log('Modbus error:', err && err.message ? err.message : err);
    })
    .finally(function () {
      socket.destroy();
    });
});

socket.on('error', function (err) {
  console.log('Socket error:', err && err.message ? err.message : err);
});

socket.on('timeout', function () {
  console.log('Socket timeout');
  socket.destroy();
});

socket.on('close', function () {
  console.log(`Connection to ${host}:${port} closed`);
});

console.log(`Connecting to ${host}:${port}...`);
socket.connect(options);


