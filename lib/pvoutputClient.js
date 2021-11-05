'use strict';

const http = require('http.min');
const util = require('util');
const EventEmitter = require('events');
const utility = require('./util.js');

const status_url = 'https://pvoutput.org/service/r2/addstatus.jsp';
const system_url = 'https://pvoutput.org/service/r2/getsystem.jsp';

function PVOutputClient(options) {
    var self = this;
    EventEmitter.call(self);
    self.options = options;
}
util.inherits(PVOutputClient, EventEmitter);

PVOutputClient.prototype.publishStatus = function (timezone, values) {
    var self = this;

    const timestamp = new Date();
    const date = `${timestamp.getFullYear()}${utility.pad(timestamp.getMonth() + 1, 2)}${utility.pad(timestamp.getDate(), 2)}`;
    //https://github.com/athombv/homey-apps-sdk-issues/issues/169
    const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });
    
    let options = {
        uri: status_url,
        timeout: 5000,
        form: {
            d: date,
            t: time,
            v1: values.yield,
            v2: values.power,
            v6: values.voltage
        },
        headers: {
            'X-Pvoutput-Apikey': self.options.apikey,
            'X-Pvoutput-SystemId': self.options.systemId
        }
    };

    return http.post(options)
        .then(function (result) {
            return {
                statusCode: result.response.statusCode,
                response: result.data
            }
        })
        .catch(reason => {
            return {
                statusCode: 999,
                response: reason
            }
        });
}

PVOutputClient.prototype.getSystem = function () {
    var self = this;

    let options = {
        uri: system_url,
        timeout: 5000,
        headers: {
            'X-Pvoutput-Apikey': self.options.apikey,
            'X-Pvoutput-SystemId': self.options.systemId
        }
    };

    return http.get(options)
        .then(function (result) {
            if (result.response.statusCode === 200) {
                let response = result.data.split(',');
                let name = 'PVOutput';
                if (response[0].length > 0) {
                    name = response[0];
                }

                if (response[1].length > 0) {
                    name = `${name} / ${Number(response[1] / 1000).toFixed(2)}kWp`;
                }

                return {
                    statusCode: result.response.statusCode,
                    name: name
                }
            } else {
                return {
                    statusCode: result.response.statusCode,
                    response: result.data
                }
            }
        })
        .catch(reason => {
            return {
                statusCode: 999,
                response: reason
            }
        });
}

exports = module.exports = PVOutputClient;