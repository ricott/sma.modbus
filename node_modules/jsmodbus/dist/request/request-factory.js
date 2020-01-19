"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codes_1 = require("../codes");
const exception_js_1 = __importDefault(require("./exception.js"));
const read_coils_js_1 = __importDefault(require("./read-coils.js"));
const read_discrete_inputs_js_1 = __importDefault(require("./read-discrete-inputs.js"));
const read_holding_registers_js_1 = __importDefault(require("./read-holding-registers.js"));
const read_input_registers_js_1 = __importDefault(require("./read-input-registers.js"));
const write_multiple_coils_js_1 = __importDefault(require("./write-multiple-coils.js"));
const write_multiple_registers_js_1 = __importDefault(require("./write-multiple-registers.js"));
const write_single_coil_js_1 = __importDefault(require("./write-single-coil.js"));
const write_single_register_js_1 = __importDefault(require("./write-single-register.js"));
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('request-factory');
class RequestFactory {
    static fromBuffer(buffer) {
        try {
            const fc = buffer.readUInt8(0);
            debug('fc', fc, 'payload', buffer);
            if (codes_1.isFunctionCode(fc)) {
                switch (fc) {
                    case codes_1.FC.READ_COIL:
                        return read_coils_js_1.default.fromBuffer(buffer);
                    case codes_1.FC.READ_DISCRETE_INPUT:
                        return read_discrete_inputs_js_1.default.fromBuffer(buffer);
                    case codes_1.FC.READ_HOLDING_REGISTERS:
                        return read_holding_registers_js_1.default.fromBuffer(buffer);
                    case codes_1.FC.READ_INPUT_REGISTERS:
                        return read_input_registers_js_1.default.fromBuffer(buffer);
                    case codes_1.FC.WRITE_SINGLE_COIL:
                        return write_single_coil_js_1.default.fromBuffer(buffer);
                    case codes_1.FC.WRITE_SINGLE_HOLDING_REGISTER:
                        return write_single_register_js_1.default.fromBuffer(buffer);
                    case codes_1.FC.WRITE_MULTIPLE_COILS:
                        return write_multiple_coils_js_1.default.fromBuffer(buffer);
                    case codes_1.FC.WRITE_MULTIPLE_HOLDING_REGISTERS:
                        return write_multiple_registers_js_1.default.fromBuffer(buffer);
                }
            }
            if (fc <= 0x2B) {
                debug('Illegal Function (fc %d)', fc);
                return new exception_js_1.default(fc, 0x01);
            }
        }
        catch (e) {
            debug('Exception while reading function code', e);
            return null;
        }
    }
}
exports.default = RequestFactory;
