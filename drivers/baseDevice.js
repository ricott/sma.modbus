'use strict';

const { Device } = require('homey');
const utilFunctions = require('../lib/util.js');

class BaseDevice extends Device {

    async _handleErrorEvent(error) {
        this.error(`Houston we have a problem: ${error.message || error}`);

        const errorMessage = this._formatErrorMessage(error);
        const timeString = new Date().toLocaleString('sv-SE', {
            hour12: false,
            timeZone: this.homey.clock.getTimezone()
        });

        try {
            await this.setSettings({
                last_error: `${timeString}\n${errorMessage}`
            });
        } catch (settingsError) {
            this.error(`Failed to update error settings: ${settingsError.message || settingsError}`);
        }
    }

    _formatErrorMessage(error) {
        if (utilFunctions.isError(error)) {
            return error.stack;
        }

        try {
            return JSON.stringify(error, null, '  ');
        } catch (stringifyError) {
            this.log(`Failed to stringify error object: ${stringifyError.message || stringifyError}`);
            return 'Unknown error';
        }
    }

    async _updateProperty(key, value) {
        // Ignore unknown capabilities
        if (!this.hasCapability(key)) {
            return;
        }

        try {
            const changed = this.isCapabilityValueChanged(key, value);

            // Update capability value
            await this.setCapabilityValue(key, value);

            // Trigger device-specific events only for changed values
            if (changed) {
                await this._handlePropertyTriggers(key, value);
            }

        } catch (error) {
            this.error(`Failed to update property ${key}: ${error.message || error}`);
        }
    }

    async _handlePropertyTriggers(key, value) {
        // Placeholder method for device-specific event triggers
        // Override this method in child classes to implement custom trigger logic
        // Example:
        // if (key === 'some_capability') {
        //     await this.driver.triggerSomeEvent(this, { value });
        // }
    }

    isCapabilityValueChanged(key, value) {
        let oldValue = this.getCapabilityValue(key);
        //If oldValue===null then it is a newly added device, lets not trigger flows on that
        if (oldValue !== null && oldValue != value) {
            return true;
        } else {
            return false;
        }
    }

    updateSetting(key, value) {
        let obj = {};
        obj[key] = String(value);
        this.setSettings(obj).catch(err => {
            this.error(`Failed to update setting '${key}' with value '${value}': ${err.message || err}`);
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
                this.error(`Failed to add capability '${capability}': ${reason.message || reason}`);
            }
        }
    }

    async removeCapabilityHelper(capability) {
        if (this.hasCapability(capability)) {
            try {
                this.logMessage(`Remove existing capability '${capability}'`);
                await this.removeCapability(capability);
            } catch (reason) {
                this.error(`Failed to removed capability '${capability}': ${reason.message || reason}`);
            }
        }
    }

    async updateCapabilityOptions(capability, options) {
        if (this.hasCapability(capability)) {
            try {
                this.logMessage(`Updating capability options '${capability}'`);
                await this.setCapabilityOptions(capability, options);
            } catch (reason) {
                this.error(`Failed to update capability options for '${capability}': ${reason.message || reason}`);
            }
        }
    }
}
module.exports = BaseDevice;
