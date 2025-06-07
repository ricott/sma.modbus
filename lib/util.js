'use strict';

const net = require('net');
const modbus = require('jsmodbus');

exports.pad = function (num, size) {
  return String(num).padStart(size, '0');
}

exports.validateIPaddress = function (ipaddress) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
    return (true)
  } else {
    return (false)
  }
}

exports.isModbusAvailable = function (host, port, logger = null) {
  // Default logger function if none provided
  const log = logger || ((level, message) => console.log(message));
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const client = new modbus.client.TCP(socket, 3, 5000);
    const options = { host, port };

    socket.setTimeout(5000);

    socket.on('connect', function () {
      log('INFO', `Validator: Connected to ${host}:${port}, testing Modbus communication...`);

      Promise.all([
        client.readHoldingRegisters(30053, 2)
      ]).then((results) => {
        log('INFO', `Validator: Modbus communication successful! Device responded with data.`);
        socket.destroy();
        resolve(true);
      }).catch((err) => {
        log('ERROR', `Validator: Modbus read failed: ${err.message}`);
        socket.destroy();
        resolve(false);
      });
    });

    socket.on('error', function (err) {
      log('ERROR', `Validator: Modbus connection to ${host}:${port} failed: ${err.message}`);
      resolve(false);
    });

    socket.on('timeout', function () {
      log('WARN', `Validator: Modbus connection to ${host}:${port} timed out`);
      socket.destroy();
      resolve(false);
    });

    socket.on('close', function () {
      log('DEBUG', `Validator: Connection to ${host}:${port} closed`);
    });

    log('INFO', `Validator: Attempting Modbus connection to ${host}:${port}...`);
    socket.connect(options);
  });
}

// Function to fetch values from modbus
exports.modbusReading = async function (client, registryId, deviceType, errorEmitter) {
  try {
    const result = await client.readHoldingRegisters(registryId, 2);
    return result.response._body._valuesAsArray;
  } catch (err) {
    console.log(err);
    errorEmitter.emit('error', new Error(`Failed to read '${registryId}' for device type '${deviceType}'`));
    return [0, 0];
  }
}

// Iterates all modbus registries and returns their value
exports.readModbus = async function (client, modbusRegistries, deviceType, errorEmitter) {
  const requests = modbusRegistries.map((registryId) => {
    return exports.modbusReading(client, registryId, deviceType, errorEmitter)
      .then((reading) => {
        return reading;
      });
  });
  return Promise.all(requests); // Waiting for all the readings to get resolved.
}