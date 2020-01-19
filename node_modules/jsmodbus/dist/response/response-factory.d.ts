/// <reference types="node" />
import ExceptionResponseBody from './exception.js';
import ReadCoilsResponseBody from './read-coils.js';
import ReadDiscreteInputsBody from './read-discrete-inputs.js';
import ReadHoldingRegistersBody from './read-holding-registers.js';
import ReadInputRegistersBody from './read-input-registers.js';
import WriteMultipleCoilsBody from './write-multiple-coils.js';
import WriteMultipleRegistersBody from './write-multiple-registers.js';
import WriteSingleCoilBody from './write-single-coil.js';
import WriteSingleRegisterBody from './write-single-register.js';
export default class ResponseFactory {
    static fromBuffer(buffer: Buffer): ExceptionResponseBody | ReadCoilsResponseBody | ReadHoldingRegistersBody | ReadInputRegistersBody | WriteMultipleCoilsBody | WriteMultipleRegistersBody | WriteSingleCoilBody | WriteSingleRegisterBody | ReadDiscreteInputsBody | null;
}
//# sourceMappingURL=response-factory.d.ts.map