"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_request_error_1 = require("./user-request-error");
const user_request_metrics_1 = require("./user-request-metrics");
const Debug = require("debug");
const debug = Debug('user-request');
class UserRequest {
    constructor(request, timeout = 5000) {
        debug('creating new user request with timeout', timeout);
        this._request = request;
        this._timeout = timeout;
        this._metrics = new user_request_metrics_1.UserRequestMetrics();
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }
    createPayload() {
        return this._request.createPayload();
    }
    start(cb) {
        this._metrics.startedAt = new Date();
        this._timer = setTimeout(() => {
            this._reject(new user_request_error_1.UserRequestError({
                err: 'Timeout',
                message: 'Req timed out'
            }));
            cb();
        }, this._timeout);
    }
    get metrics() {
        return this._metrics;
    }
    done() {
        clearTimeout(this._timer);
    }
    get request() {
        return this._request;
    }
    get timeout() {
        return this._timeout;
    }
    get promise() {
        return this._promise;
    }
    resolve(response) {
        this._metrics.receivedAt = new Date();
        debug('request completed in %d ms (sat in cue %d ms)', this.metrics.transferTime, this.metrics.waitTime);
        return this._resolve({
            metrics: this.metrics,
            request: this._request,
            response
        });
    }
    get reject() {
        return this._reject;
    }
}
exports.default = UserRequest;
