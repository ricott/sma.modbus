'use strict';

const BaseDevice = require('./baseDevice.js');

class ModbusDevice extends BaseDevice {

    #lastDataReceived = null;
    #availabilityWatchdog = null;

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
            // Stop availability watchdog during reconnection
            this.#stopAvailabilityWatchdog();
            // Reset availability state
            this.#lastDataReceived = null;

            await this.destroySession();
            await this.setupSession(address, port, polling);
            // Connection successful, make sure device is marked as available
            await this.setAvailable();
            // Clear any existing retry timer on successful connection
            if (this._retryTimeout) {
                this.homey.clearTimeout(this._retryTimeout);
                this._retryTimeout = null;
            }

            // Start availability monitoring after successful connection
            this.#startAvailabilityWatchdog();

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

    onDeleted() {
        this.logMessage(`Deleting this SMA device from Homey.`);
        // Clear any pending retry timer
        if (this._retryTimeout) {
            this.homey.clearTimeout(this._retryTimeout);
        }
        // Stop availability watchdog
        this.#stopAvailabilityWatchdog();
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

    // Availability tracking methods
    #startAvailabilityWatchdog() {
        this.#stopAvailabilityWatchdog();

        const polling = this.getSetting('polling') || 10;
        // Check availability every refresh interval + 50% buffer
        const watchdogInterval = (polling * 1.5) * 1000;

        this.logMessage(`Starting availability watchdog with ${watchdogInterval / 1000}s interval`);

        this.#availabilityWatchdog = this.homey.setInterval(() => {
            this.#checkDataTimeout();
        }, watchdogInterval);
    }

    #stopAvailabilityWatchdog() {
        if (this.#availabilityWatchdog) {
            this.homey.clearInterval(this.#availabilityWatchdog);
            this.#availabilityWatchdog = null;
        }
    }

    async #checkDataTimeout() {
        if (!this.#lastDataReceived) {
            return; // No data received yet, don't mark as unavailable
        }

        const now = Date.now();
        const polling = this.getSetting('polling') || 10;
        const timeoutThreshold = polling * 2 * 1000; // 2x polling interval
        const timeSinceLastData = now - this.#lastDataReceived;

        if (timeSinceLastData > timeoutThreshold) {
            if (this.getAvailable()) {
                this.logMessage(`No data received for ${Math.round(timeSinceLastData / 1000)}s, marking as unavailable`);
                await this.setUnavailable('No data received from device').catch(err => {
                    this.error('Failed to set device unavailable:', err);
                });
            }
        }
    }

    async onDataReceived() {
        this.#lastDataReceived = Date.now();

        // If device was marked as unavailable, mark it as available again
        if (!this.getAvailable()) {
            this.logMessage(`Data received, marking device as available again`);
            try {
                await this.setAvailable();
            } catch (err) {
                this.error('Failed to set device available:', err);
            }
        }
    }

    // Method for child classes to call when communication errors occur
    async onCommunicationError(error) {
        // Only mark as unavailable for actual communication/connectivity errors
        const isCommunicationError = this.#isCommunicationError(error);

        if (isCommunicationError && this.getAvailable()) {
            this.logMessage(`Communication error occurred, marking device as unavailable: ${error.message}`);
            await this.setUnavailable(`Communication error: ${error.message || 'Unknown error'}`).catch(err => {
                this.error('Failed to set device unavailable:', err);
            });
        }
    }

    // Helper method to determine if an error is communication-related
    #isCommunicationError(error) {
        if (!error || !error.message) {
            return false;
        }

        const errorMessage = error.message.toLowerCase();
        const communicationErrorPatterns = [
            'is not reachable',
            'connection failed',
            'connection refused',
            'connection reset',
            'connection timeout',
            'network is unreachable',
            'host is unreachable',
            'no route to host',
            'econnrefused',
            'etimedout',
            'econnreset',
            'ehostunreach',
            'enetunreach',
            'enotfound'
        ];

        return communicationErrorPatterns.some(pattern => errorMessage.includes(pattern));
    }
}
module.exports = ModbusDevice;
