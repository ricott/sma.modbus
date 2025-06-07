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

    _clearInterval(timer) {
        if (this.options.device) {
            this.options.device.homey.clearInterval(timer);
        } else {
            clearInterval(timer);
        }
    }

    _logMessage(level, ...msg) {
        //If debug is true then ignore level
        if (this.options.debug) {
            this.#log(...msg);
        } else if (level == 'INFO') {
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
