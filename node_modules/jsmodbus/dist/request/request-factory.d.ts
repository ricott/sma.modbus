/// <reference types="node" />
import ExceptionRequest from './exception.js';
import ReadCoilsRequest from './read-coils.js';
import ReadDiscreteInputsRequest from './read-discrete-inputs.js';
import ReadHoldingRegistersRequest from './read-holding-registers.js';
import ReadInputRegistersRequest from './read-input-registers.js';
import WriteMultipleCoilsResponse from './write-multiple-coils.js';
import WriteMultipleRegistersResponse from './write-multiple-registers.js';
import WriteSingleCoilRequest from './write-single-coil.js';
import WriteSingleRegisterRequest from './write-single-register.js';
export default class RequestFactory {
    static fromBuffer(buffer: Buffer): ExceptionRequest | ReadCoilsRequest | ReadDiscreteInputsRequest | ReadHoldingRegistersRequest | ReadInputRegistersRequest | WriteMultipleCoilsResponse | WriteMultipleRegistersResponse | WriteSingleCoilRequest | WriteSingleRegisterRequest | null | undefined;
}
//# sourceMappingURL=request-factory.d.ts.map