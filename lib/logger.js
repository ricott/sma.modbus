'use strict';

// Thin, defensive wrapper around @sentry/node.
//
// Design goals:
//  - Never break the app. Sentry is initialised lazily inside try/catch, and
//    every exported function is a no-op when Sentry is unavailable or the DSN
//    is not configured. A telemetry failure must never affect device operation.
//  - No global process handlers. We use `defaultIntegrations: false` so Sentry
//    does NOT install uncaughtException/unhandledRejection handlers (those can
//    exit the process) - Homey has its own crash reporting. We only send
//    explicit captures.
//  - Anonymous. No PII is sent: `sendDefaultPii` is false and `beforeSend`
//    strips the hostname and any user object. Tags are limited to app version,
//    Homey firmware version, inverter model and driver.
//
// The DSN is read from env.json as `SENTRY_DSN` (exposed by Homey as
// `homey.env.SENTRY_DSN`). If it is empty/missing, telemetry stays disabled.

let Sentry = null;
let enabled = false;
let initialized = false;

// Per-key timestamp of the last sent event, for simple in-memory rate limiting.
const rateLimits = new Map();

/**
 * Initialise Sentry from the app's env.json DSN. Safe to call once from the
 * app's onInit. Returns true when telemetry is active.
 * @param {import('homey').Homey} homey
 * @returns {boolean}
 */
function init(homey) {
    if (initialized) {
        return enabled;
    }
    initialized = true;

    try {
        const dsn = homey && homey.env && homey.env.SENTRY_DSN;
        if (!dsn || typeof dsn !== 'string' || dsn.trim() === '') {
            return false; // Not configured -> disabled.
        }

        // Lazy require so a load/compat failure disables telemetry instead of
        // crashing the app.
        Sentry = require('@sentry/node');

        const appVersion = (homey.manifest && homey.manifest.version) || 'unknown';
        let homeyVersion = 'unknown';
        try {
            homeyVersion = homey.version || 'unknown';
        } catch (_) { /* ignore */ }

        Sentry.init({
            dsn: dsn.trim(),
            release: appVersion,
            environment: homeyVersion,
            // Explicit captures only; keep the footprint minimal and never touch
            // global process handlers.
            defaultIntegrations: false,
            tracesSampleRate: 0,
            sendDefaultPii: false,
            beforeSend(event) {
                try {
                    delete event.server_name; // don't leak the hostname
                    delete event.user;
                } catch (_) { /* ignore */ }
                return event;
            }
        });

        try {
            Sentry.setTags({ appVersion, homeyVersion, nodeVersion: process.version });
        } catch (_) { /* ignore */ }

        enabled = true;
        return true;
    } catch (_) {
        // Any failure (missing package, incompatible Node, bad DSN) -> disabled.
        Sentry = null;
        enabled = false;
        return false;
    }
}

function isEnabled() {
    return enabled;
}

/**
 * Report a message, rate-limited per `key`. No-op when disabled.
 * @param {string} key                 Unique key for rate limiting (e.g. per device).
 * @param {string} message             Human-readable message / issue title.
 * @param {object} [options]
 * @param {string} [options.level]     Sentry level (default 'warning').
 * @param {object} [options.tags]      Indexed tags (model, firmware, ...).
 * @param {object} [options.extra]     Additional non-indexed context.
 * @param {number} [options.minIntervalMs] Minimum ms between events for this key.
 */
function report(key, message, options = {}) {
    if (!enabled || !Sentry) {
        return;
    }
    const {
        level = 'warning',
        tags = {},
        extra = {},
        minIntervalMs = 6 * 60 * 60 * 1000 // once per 6h per key
    } = options;

    try {
        const now = Date.now();
        const last = rateLimits.get(key) || 0;
        if (now - last < minIntervalMs) {
            return;
        }
        rateLimits.set(key, now);
        Sentry.captureMessage(message, { level, tags, extra });
    } catch (_) {
        // never throw
    }
}

/**
 * Capture an exception. No-op when disabled.
 * @param {Error} error
 * @param {object} [options]
 * @param {object} [options.tags]
 * @param {object} [options.extra]
 */
function captureException(error, options = {}) {
    if (!enabled || !Sentry) {
        return;
    }
    const { tags = {}, extra = {} } = options;
    try {
        Sentry.captureException(error, { tags, extra });
    } catch (_) {
        // never throw
    }
}

/**
 * Flush pending events (call on app shutdown).
 * @param {number} [timeout]
 */
async function flush(timeout = 2000) {
    if (!enabled || !Sentry) {
        return;
    }
    try {
        await Sentry.flush(timeout);
    } catch (_) {
        // never throw
    }
}

module.exports = { init, isEnabled, report, captureException, flush };
