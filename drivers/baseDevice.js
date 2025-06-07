'use strict';

const { Device } = require('homey');

class BaseDevice extends Device {

    async onInit() {
        this.logMessage(`SMA device initiated`);
        this.api = null;

        this.initializeSession(
            this.getSetting('address'),
            this.getSetting('port'),
            this.getSetting('polling')
        );
    }

    async initializeSession(address, port, polling) {
        try {
            await this.destroySession();
            await this.setupSession(address, port, polling);
            // Connection successful, make sure device is marked as available
            await this.setAvailable();
            // Clear any existing retry timer on successful connection
            if (this._retryTimeout) {
                this.homey.clearTimeout(this._retryTimeout);
                this._retryTimeout = null;
            }
        } catch (error) {
            this.error('Failed to initialize device connection:', error);
            // Set device as unavailable with error message
            await this.setUnavailable(error.message || 'Connection failed');

            // Clear any existing retry timer before setting a new one
            if (this._retryTimeout) {
                this.homey.clearTimeout(this._retryTimeout);
            }

            // Schedule a retry after 5 minutes
            this._retryTimeout = this.homey.setTimeout(() => {
                this.logMessage('Retrying connection...');
                this.initializeSession(address, port, polling)
                    .catch(err => this.error('Retry failed:', err));
            }, 5 * 60 * 1000); // 10 minutes
        }
    }

    async destroySession() {
        if (this.api) {
            this.logMessage(`Disconnecting the device`);
            this.api.disconnect();
        }
    }

    isError(err) {
        return (err && err.stack && err.message);
    }

    async _updateProperty(key, value) {
        if (!this.hasCapability(key)) {
            return;
        }

        if (typeof value === 'undefined' || value === null) {
            this.log(`[${this.getName()}] Value for capability '${key}' is 'undefined'`);
            return;
        }

        try {
            await this.setCapabilityValue(key, value);
            await this.triggerDeviceTriggers(key, value);
        } catch (reason) {
            this.error(reason);
        }
    }

    onDeleted() {
        this.logMessage(`Deleting this SMA device from Homey.`);
        // Clear any pending retry timer
        if (this._retryTimeout) {
            this.homey.clearTimeout(this._retryTimeout);
        }
        this.destroySession();
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        let changeConn = false;
        let address, port, polling;
        if (changedKeys.indexOf("address") > -1) {
            this.logMessage(`Address value was change to '${newSettings.address}'`);
            changeConn = true;
            address = newSettings.address;
        }
        if (changedKeys.indexOf("port") > -1) {
            this.logMessage(`Port value was change to '${newSettings.port}'`);
            changeConn = true;
            port = newSettings.port;
        }
        if (changedKeys.indexOf("polling") > -1) {
            this.logMessage(`Polling value was change to '${newSettings.polling}'`);
            changeConn = true;
            polling = newSettings.polling;
        }

        if (changeConn) {
            //We need to re-initialize the session since setting(s) are changed
            this.initializeSession(
                address || this.getSettings().address,
                port || this.getSettings().port,
                polling || this.getSettings().polling
            );
        }
    }

    updateSetting(key, value) {
        let obj = {};
        obj[key] = String(value);
        this.setSettings(obj).catch(err => {
            this.error(`Failed to update setting '${key}' with value '${value}'`, err);
        });
    }

    updateSettingIfChanged(key, newValue, oldValue) {
        if (newValue != oldValue) {
            this.updateSetting(key, newValue);
        }
    }

    updateNumericSettingIfChanged(key, newValue, oldValue, suffix) {
        if (!isNaN(newValue)) {
            this.updateSettingIfChanged(key, `${newValue}${suffix}`, `${oldValue}${suffix}`);
        }
    }

    logMessage(message) {
        this.log(`[${this.getName()}] ${message}`);
    }

    async addCapabilityHelper(capability) {
        if (!this.hasCapability(capability)) {
            try {
                this.logMessage(`Adding missing capability '${capability}'`);
                await this.addCapability(capability);
            } catch (reason) {
                this.error(`Failed to add capability '${capability}'`);
                this.error(reason);
            }
        }
    }

    async removeCapabilityHelper(capability) {
        if (this.hasCapability(capability)) {
            try {
                this.logMessage(`Remove existing capability '${capability}'`);
                await this.removeCapability(capability);
            } catch (reason) {
                this.error(`Failed to removed capability '${capability}'`);
                this.error(reason);
            }
        }
    }

    async updateCapabilityOptions(capability, options) {
        if (this.hasCapability(capability)) {
            try {
                this.logMessage(`Updating capability options '${capability}'`);
                await this.setCapabilityOptions(capability, options);
            } catch (reason) {
                this.error(`Failed to update capability options for '${capability}'`);
                this.error(reason);
            }
        }
    }
}
module.exports = BaseDevice;
