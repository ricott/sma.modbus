'use strict';

const net = require('net');
const modbus = require('jsmodbus');

// SMA device-type register (holding register, spans 2 words). Reading it serves
// as both the connectivity probe and the way we identify the model to select
// the correct register map.
const DEVICE_TYPE_REGISTER = 30053;
exports.DEVICE_TYPE_REGISTER = DEVICE_TYPE_REGISTER;

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

exports.isModbusAvailable = function (host, port, logger = null, timeoutMs = 5000) {
  // Default logger function if none provided
  const log = logger || ((level, message) => console.log(message));

  return new Promise((resolve) => {
    const socket = new net.Socket();
    // Disable Nagle's algorithm - Modbus TCP is a chatty request/response
    // protocol where Nagle + delayed-ACK can stall back-to-back reads.
    socket.setNoDelay(true);
    const client = new modbus.client.TCP(socket, 3, timeoutMs);
    const options = { host, port };

    socket.setTimeout(timeoutMs);

    socket.on('connect', function () {
      log('INFO', `Validator: Connected to ${host}:${port}, testing Modbus communication...`);

      Promise.all([
        client.readHoldingRegisters(DEVICE_TYPE_REGISTER, 2)
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

// jsmodbus tags every rejection with an `.err` code. These specific codes mean
// the request/response stream has gone out of sync on the shared socket: a
// request timed out (its late response is still coming), the transaction id of
// a response did not match the pending request, or the protocol/connection
// broke. Once this happens jsmodbus rejects the current request AND every other
// queued request with "rejecting because of earlier OutOfSync error", and the
// stale response left in the pipe keeps poisoning the next request every cycle.
// The only reliable recovery is to drop the socket so the OS buffer is flushed
// and a fresh client resets its transaction id counter.
const CONNECTION_POISONING_ERRORS = new Set(['Timeout', 'OutOfSync', 'Protocol', 'Offline']);

exports.isConnectionPoisoningError = function (err) {
  return !!(err && typeof err.err === 'string' && CONNECTION_POISONING_ERRORS.has(err.err));
}

// Extract the raw 16-bit word array from a jsmodbus readHoldingRegisters result.
exports.getRegisterWords = function (result) {
  return result && result.response && result.response._body
    ? result.response._body._valuesAsArray
    : undefined;
}

// Reads a single register (or multi-register value). Used both as a standalone
// read and as the per-register fallback when a coalesced range read is rejected.
// `registry` may be a plain numeric registryId (defaults to 2 registers) or a
// descriptor object { registryId, registerCount } for multi-register values (e.g. U64).
// Returns { values, poison, failed }:
//   - values: the register words, or a zero-filled array of the right length on
//     failure so the rest of the sweep still decodes (a marginal inverter that
//     times out on one register must not blank the whole sweep).
//   - poison: the failure desynchronized the request/response stream (see
//     isConnectionPoisoningError) so the caller can reset the socket once the
//     sweep finishes, avoiding an OutOfSync cascade on the next poll.
//   - failed: the read threw (as opposed to succeeding), used to track and log
//     per-register failure/recovery.
exports.modbusReading = async function (client, registry, deviceType, errorEmitter) {
  const isDescriptor = registry !== null && typeof registry === 'object';
  const registryId = isDescriptor ? registry.registryId : registry;
  const registerCount = (isDescriptor && registry.registerCount) ? registry.registerCount : 2;
  try {
    const result = await client.readHoldingRegisters(registryId, registerCount);
    return { values: exports.getRegisterWords(result), poison: false, failed: false };
  } catch (err) {
    if (errorEmitter && typeof errorEmitter._logMessage === 'function') {
      errorEmitter._logMessage('DEBUG', `Failed to read register '${registryId}': ${exports.formatError(err)}`);
    }
    if (errorEmitter && typeof errorEmitter.emit === 'function') {
      errorEmitter.emit('error', new Error(`Failed to read '${registryId}' for device type '${deviceType}'`));
    }

    return {
      values: new Array(registerCount).fill(0),
      poison: exports.isConnectionPoisoningError(err),
      failed: true
    };
  }
}

exports.isError = function (err) {
  return (err && err.stack && err.message);
}

// Robustly format any thrown / rejected value into a readable string.
// Avoids the "[object Object]" trap when:
//   - err is a plain object without .message
//   - err.message exists but is empty / non-string
//   - err is null / undefined / a primitive
//   - err contains circular references
exports.formatError = function (err) {
  if (err === null || err === undefined) {
    return 'Unknown error';
  }

  // Native Error (or anything Error-like with a usable message)
  if (err instanceof Error) {
    return err.message || err.toString() || 'Error';
  }

  // Strings / numbers / booleans
  if (typeof err !== 'object') {
    return String(err);
  }

  // jsmodbus UserRequestError shape: { err, message, request, response }
  if (typeof err.message === 'string' && err.message.length > 0) {
    if (typeof err.err === 'string' && err.err.length > 0) {
      return `${err.err}: ${err.message}`;
    }
    return err.message;
  }

  // Some libs use .code / .errno / .reason
  if (typeof err.code === 'string') {
    return err.code;
  }
  if (typeof err.reason === 'string') {
    return err.reason;
  }

  // Last resort: try JSON.stringify, guarding against circular refs
  try {
    const json = JSON.stringify(err);
    if (json && json !== '{}') {
      return json;
    }
  } catch (_) {
    // fall through
  }

  return 'Unknown error';
}