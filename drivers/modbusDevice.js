'use strict';

const BaseDevice = require('./baseDevice.js');
const utilFunctions = require('../lib/util.js');
const logger = require('../lib/logger.js');

const MINIMUM_AVAILABILITY_GRACE_PERIOD_MS = 5 * 60 * 1000;

class ModbusDevice extends BaseDevice {

    #lastDataReceived = null;
    #sessionStartedAt = null;
    #availabilityWatchdog = null;
    #retryCount = 0;
    #maxRetries = 30; // Maximum number of consecutive retry attempts
    #isReconnecting = false;
    // Sliding window of recent read-error timestamps, used to detect a sustained
    // failure state and report it (once per interval) for blast-radius telemetry.
    #readErrorTimestamps = [];

    async onInit() {
        this.logMessage(`SMA device initiated`);
        this.api = null;

        this.initializeSession(
            this.getSetting('address'),
            this.getSetting('port'),
            this.getSetting('polling'),
            this.getSetting('timeout')
        );
    }

    async initializeSession(address, port, polling, timeout) {
        try {
            await this.#establishConnection(address, port, polling, timeout);
        } catch (error) {
            this.error(`Failed to initialize device connection: ${utilFunctions.formatError(error)}`);
            // Set device as unavailable with error message
            await this.setUnavailable(utilFunctions.formatError(error) || 'Connection failed');

            // Only schedule retry if this is the initial connection attempt (not
            // from a retry); retries reschedule themselves from the retry callback.
            if (!this.#isReconnecting) {
                this.#scheduleReconnection(address, port, polling, timeout);
            }
        }
    }

    // Shared happy-path connect sequence used by both the initial connect and
    // each reconnection attempt: (re)build the session, mark the device
    // available, reset retry state and (re)start the availability watchdog.
    async #establishConnection(address, port, polling, timeout) {
        // Stop availability watchdog while (re)connecting
        this.#stopAvailabilityWatchdog();
        // Reset availability state. Keep a session start timestamp so a device
        // that never produces its first valid reading is still covered by the
        // watchdog instead of remaining available forever.
        this.#lastDataReceived = null;
        this.#sessionStartedAt = Date.now();

        await this.destroySession();
        await this.setupSession(address, port, polling, timeout);

        // Connection successful, reset retry count and mark as available
        this.#retryCount = 0;
        this.#isReconnecting = false;
        await this.setAvailable();

        // Clear any pending retry timer on successful connection
        this.#clearRetryTimer();

        // Start availability monitoring after successful connection
        this.#startAvailabilityWatchdog();
    }

    #clearRetryTimer() {
        if (this._retryTimeout) {
            this.homey.clearTimeout(this._retryTimeout);
            this._retryTimeout = null;
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
        this.#clearRetryTimer();
        // Reset reconnection state
        this.#isReconnecting = false;
        this.#retryCount = 0;
        this.#sessionStartedAt = null;
        // Stop availability watchdog
        this.#stopAvailabilityWatchdog();
        this.destroySession();
    }

    // Schedules reconnection with exponential backoff
    #scheduleReconnection(address, port, polling, timeout) {
        // Don't schedule new reconnection if already reconnecting or max retries reached
        if (this.#isReconnecting) {
            return;
        }

        this.#retryCount++;
        
        if (this.#retryCount > this.#maxRetries) {
            this.logMessage(`Maximum retry attempts (${this.#maxRetries}) reached. Stopping reconnection attempts.`);
            return;
        }

        this.#isReconnecting = true;

        // Clear any existing retry timer before setting a new one
        this.#clearRetryTimer();

        // Calculate exponential backoff delay: 30s, 1m, 2m, 4m, 8m, max 10m
        const baseDelay = 30 * 1000; // 30 seconds base
        const maxDelay = 10 * 60 * 1000; // 10 minutes maximum
        const delay = Math.min(baseDelay * Math.pow(2, this.#retryCount - 1), maxDelay);

        this.logMessage(`Scheduling reconnection attempt ${this.#retryCount}/${this.#maxRetries} in ${Math.round(delay / 1000)}s`);

        this._retryTimeout = this.homey.setTimeout(async () => {
            this.logMessage(`Retry attempt ${this.#retryCount}/${this.#maxRetries}: Attempting to reconnect...`);
            // Clear the flag before the attempt so a failed reconnect can
            // reschedule itself via #scheduleReconnection.
            this.#isReconnecting = false;
            try {
                await this.#establishConnection(address, port, polling, timeout);
            } catch (err) {
                this.error(`Reconnection attempt failed: ${utilFunctions.formatError(err)}`);
                // Set device as unavailable with error message
                await this.setUnavailable(utilFunctions.formatError(err) || 'Connection failed');

                // Schedule next retry with exponential backoff
                this.#scheduleReconnection(address, port, polling, timeout);
            }
        }, delay);
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        let changeConn = false;
        let address, port, polling, timeout;
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
        if (changedKeys.indexOf("timeout") > -1) {
            this.logMessage(`Timeout value was change to '${newSettings.timeout}'`);
            changeConn = true;
            timeout = newSettings.timeout;
        }

        if (changeConn) {
            //We need to re-initialize the session since setting(s) are changed
            this.initializeSession(
                address || this.getSettings().address,
                port || this.getSettings().port,
                polling || this.getSettings().polling,
                timeout || this.getSettings().timeout
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
        const dataReferenceTime = this.#lastDataReceived || this.#sessionStartedAt;
        if (!dataReferenceTime) {
            return;
        }

        const now = Date.now();
        const polling = this.getSetting('polling') || 10;
        // Brief Modbus dropouts commonly recover on their own. Keep the device
        // available for at least five minutes while retaining its last valid
        // values; unusually long polling intervals still get two full cycles.
        const timeoutThreshold = Math.max(MINIMUM_AVAILABILITY_GRACE_PERIOD_MS, polling * 2 * 1000);
        const timeSinceLastData = now - dataReferenceTime;

        if (timeSinceLastData > timeoutThreshold) {
            if (this.getAvailable()) {
                this.logMessage(`No data received for ${Math.round(timeSinceLastData / 1000)}s, marking as unavailable and attempting reconnection`);
                await this.setUnavailable('No data received from device').catch(err => {
                    this.error(`Failed to set device unavailable: ${utilFunctions.formatError(err)}`);
                });
                
                // Trigger reconnection due to data timeout
                this.#scheduleReconnection(
                    this.getSetting('address'),
                    this.getSetting('port'),
                    this.getSetting('polling'),
                    this.getSetting('timeout')
                );
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
                // Reset retry count on successful data reception
                this.#retryCount = 0;
                this.#isReconnecting = false;
                
                // Clear any pending retry timer since we're receiving data again
                if (this._retryTimeout) {
                    this.homey.clearTimeout(this._retryTimeout);
                    this._retryTimeout = null;
                }
            } catch (err) {
                this.error(`Failed to set device available: ${utilFunctions.formatError(err)}`);
            }
        }
    }

    // Method for child classes to call when communication errors occur
    async onCommunicationError(error) {
        // Telemetry: track error rate to detect sustained Modbus failures.
        this.#recordReadErrorForTelemetry(error);

        // Only mark as unavailable for actual communication/connectivity errors
        const isCommunicationError = this.#isCommunicationError(error);

        if (isCommunicationError && this.getAvailable()) {
            const formatted = utilFunctions.formatError(error);
            this.logMessage(`Communication error occurred, marking device as unavailable and attempting reconnection: ${formatted}`);
            await this.setUnavailable(`Communication error: ${formatted || 'Unknown error'}`).catch(err => {
                this.error(`Failed to set device unavailable: ${utilFunctions.formatError(err)}`);
            });

            // Trigger reconnection due to communication error
            this.#scheduleReconnection(
                this.getSetting('address'),
                this.getSetting('port'),
                this.getSetting('polling'),
                this.getSetting('timeout')
            );
        }
    }

    // Telemetry: records a read error and, when errors arrive in bursts (a
    // sustained failure rather than an occasional glitch), reports one event per
    // device per interval so we can see across installs which inverter models and
    // Homey firmware versions are affected. The logger rate-limits and is a no-op
    // when Sentry is not configured; this must never throw.
    #recordReadErrorForTelemetry(error) {
        try {
            const now = Date.now();
            const windowMs = 10 * 60 * 1000; // 10 minutes
            const threshold = 15; // errors within the window that indicate a sustained problem

            this.#readErrorTimestamps.push(now);
            this.#readErrorTimestamps = this.#readErrorTimestamps.filter(t => now - t <= windowMs);

            if (this.#readErrorTimestamps.length >= threshold) {
                let driverId = 'unknown';
                try { driverId = this.driver.id; } catch (_) { /* ignore */ }

                logger.report(
                    `modbus-sustained-failure:${this.getData().id}`,
                    'Sustained Modbus read failures',
                    {
                        level: 'warning',
                        tags: {
                            deviceType: this.getSetting('deviceType') || 'unknown',
                            driver: driverId,
                            homeyVersion: (this.homey && this.homey.version) || 'unknown',
                            // As tags (not just extra) so you can group/filter
                            // affected devices by their timeout / polling values.
                            polling: String(this.getSetting('polling')),
                            timeout: String(this.getSetting('timeout'))
                        },
                        extra: {
                            errorsInWindow: this.#readErrorTimestamps.length,
                            windowMinutes: 10,
                            polling: this.getSetting('polling'),
                            timeoutSetting: this.getSetting('timeout'),
                            lastError: utilFunctions.formatError(error)
                        }
                    }
                );
            }
        } catch (_) {
            // Telemetry must never affect device operation.
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
