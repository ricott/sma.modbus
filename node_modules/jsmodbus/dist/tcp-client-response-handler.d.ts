/// <reference types="node" />
import ModbusClientResponseHandler from './client-response-handler.js';
import ModbusTCPResponse from './tcp-response.js';
export default class ModbusTCPClientResponseHandler extends ModbusClientResponseHandler<ModbusTCPResponse> {
    protected _messages: ModbusTCPResponse[];
    constructor();
    handleData(data: Buffer): void;
}
//# sourceMappingURL=tcp-client-response-handler.d.ts.map