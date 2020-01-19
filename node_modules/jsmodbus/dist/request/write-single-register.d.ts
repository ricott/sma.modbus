/// <reference types="node" />
import ModbusRequestBody from './request-body.js';
export default class WriteSingleRegisterRequestBody extends ModbusRequestBody {
    readonly address: number;
    readonly value: number;
    readonly name: "WriteSingleRegister";
    readonly quantity: number;
    readonly count: number;
    readonly byteCount: number;
    static fromBuffer(buffer: Buffer): WriteSingleRegisterRequestBody | null;
    private _address;
    private _value;
    constructor(address: number, value: number);
    createPayload(): Buffer;
}
export declare function isWriteSingleRegisterRequestBody(x: any): x is WriteSingleRegisterRequestBody;
//# sourceMappingURL=write-single-register.d.ts.map