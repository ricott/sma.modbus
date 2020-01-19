"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UserRequestError {
    constructor({ err, message, response }) {
        this.err = err;
        this.message = message;
        this.response = response;
    }
}
exports.UserRequestError = UserRequestError;
function isUserRequestError(x) {
    if (x instanceof isUserRequestError) {
        return true;
    }
    if (typeof x !== 'object') {
        return false;
    }
    if (x.err === undefined || typeof x.err !== 'string') {
        return false;
    }
    if (x.message === undefined || typeof x.message !== 'string') {
        return false;
    }
    return true;
}
exports.isUserRequestError = isUserRequestError;
