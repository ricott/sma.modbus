"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UserRequestMetrics {
    constructor() {
        this.createdAt = new Date();
        this.startedAt = new Date();
        this.receivedAt = new Date();
    }
    get transferTime() {
        return this.receivedAt.getTime() - this.startedAt.getTime();
    }
    get waitTime() {
        return this.startedAt.getTime() - this.createdAt.getTime();
    }
    toJSON() {
        return Object.assign({}, this, { transferTime: this.transferTime });
    }
}
exports.UserRequestMetrics = UserRequestMetrics;
