'use strict';

const EventEmitter = require('events');

class HomeyEventEmitter extends EventEmitter {
    constructor() {
        super();
    }

    _sleep(time) {
        return new Promise((resolve) => this._setTimeout(resolve, time));
    }

    _setTimeout(func, ms) {
        if (this.options.device) {
            return this.options.device.homey.setTimeout(func, ms);
        } else {
            return setTimeout(func, ms);
        }
    }

    _setInterval(func, ms) {
        if (this.options.device) {
            return this.options.device.homey.setInterval(func, ms);
        } else {
            return setInterval(func, ms);
        }
    }

    _clearTimeout(timer) {
        if (this.options.device) {
            this.options.device.homey.clearTimeout(timer);
        } else {
            clearTimeout(timer);
        }
    }

    _clearInterval(timer) {
        if (this.options.device) {
            this.options.device.homey.clearInterval(timer);
        } else {
            clearInterval(timer);
        }
    }

    _logMessage(level, ...msg) {
        // In debug mode log everything. Otherwise log every level except DEBUG,
        // so INFO/WARN/ERROR diagnostics are always visible (previously only INFO
        // was, which silently dropped warnings and errors in normal operation).
        if (this.options.debug || level !== 'DEBUG') {
            this.#log(...msg);
        }
    }

    #log(...msg) {
        if (this.options.device) {
            this.options.device.log(...msg);
        } else {
            console.log(...msg);
        }
    }
}
module.exports = HomeyEventEmitter;
