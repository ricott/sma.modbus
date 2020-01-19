"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var FC;
(function (FC) {
    FC[FC["READ_COIL"] = 1] = "READ_COIL";
    FC[FC["READ_DISCRETE_INPUT"] = 2] = "READ_DISCRETE_INPUT";
    FC[FC["READ_HOLDING_REGISTERS"] = 3] = "READ_HOLDING_REGISTERS";
    FC[FC["READ_INPUT_REGISTERS"] = 4] = "READ_INPUT_REGISTERS";
    FC[FC["WRITE_SINGLE_COIL"] = 5] = "WRITE_SINGLE_COIL";
    FC[FC["WRITE_SINGLE_HOLDING_REGISTER"] = 6] = "WRITE_SINGLE_HOLDING_REGISTER";
    FC[FC["WRITE_MULTIPLE_COILS"] = 15] = "WRITE_MULTIPLE_COILS";
    FC[FC["WRITE_MULTIPLE_HOLDING_REGISTERS"] = 16] = "WRITE_MULTIPLE_HOLDING_REGISTERS";
})(FC = exports.FC || (exports.FC = {}));
function isFunctionCode(x) {
    if (FC[x] === undefined) {
        return false;
    }
    else {
        return true;
    }
}
exports.isFunctionCode = isFunctionCode;
