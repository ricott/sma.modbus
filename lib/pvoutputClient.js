'use strict';

const utility = require('./util.js');

const STATUS_URL = 'https://pvoutput.org/service/r2/addstatus.jsp';
const SYSTEM_URL = 'https://pvoutput.org/service/r2/getsystem.jsp';

class PVOutputClient {
    constructor(options) {
        this.options = options;
    }

    async publishStatus(timezone, values) {
        const timestamp = new Date();
        const date = `${timestamp.getFullYear()}${utility.pad(timestamp.getMonth() + 1, 2)}${utility.pad(timestamp.getDate(), 2)}`;
        //https://github.com/athombv/homey-apps-sdk-issues/issues/169
        const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone });
        
        const formData = new URLSearchParams({
            d: date,
            t: time,
            v1: values.yield,
            v2: values.power,
            v6: values.voltage
        });

        try {
            const response = await fetch(STATUS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Pvoutput-Apikey': this.options.apikey,
                    'X-Pvoutput-SystemId': this.options.systemId
                },
                body: formData.toString(),
                signal: AbortSignal.timeout(5000)
            });

            const data = await response.text();
            return {
                statusCode: response.status,
                response: data
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                return {
                    statusCode: 408,
                    response: 'Request timeout after 5000ms'
                };
            }
            return {
                statusCode: 999,
                response: error
            };
        }
    }

    async getSystem() {
        try {
            const response = await fetch(SYSTEM_URL, {
                method: 'GET',
                headers: {
                    'X-Pvoutput-Apikey': this.options.apikey,
                    'X-Pvoutput-SystemId': this.options.systemId
                },
                signal: AbortSignal.timeout(5000)
            });

            if (response.status === 200) {
                const data = await response.text();
                const responseParts = data.split(',');
                let name = 'PVOutput';
                
                if (responseParts[0].length > 0) {
                    name = responseParts[0];
                }

                if (responseParts[1].length > 0) {
                    name = `${name} / ${Number(responseParts[1] / 1000).toFixed(2)}kWp`;
                }

                return {
                    statusCode: response.status,
                    name: name
                };
            }

            const data = await response.text();
            return {
                statusCode: response.status,
                response: data
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                return {
                    statusCode: 408,
                    response: 'Request timeout after 5000ms'
                };
            }
            return {
                statusCode: 999,
                response: error
            };
        }
    }
}

module.exports = PVOutputClient;