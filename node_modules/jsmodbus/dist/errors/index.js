"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./isInternalException"));
__export(require("./isUserRequestError"));
var exception_1 = require("../response/exception");
exports.isExceptionResponseBody = exception_1.isExceptionResponseBody;
var exception_2 = require("../request/exception");
exports.isExceptionRequestBody = exception_2.isExceptionRequestBody;
