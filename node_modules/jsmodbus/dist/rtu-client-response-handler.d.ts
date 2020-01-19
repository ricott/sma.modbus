/// <reference types="node" />
import ModbusClientResponseHandler from './client-response-handler.js';
import ModbusRTUResponse from './rtu-response.js';
export default class ModbusRTUClientResponseHandler extends ModbusClientResponseHandler<ModbusRTUResponse> {
    protected _messages: ModbusRTUResponse[];
    constructor();
    handleData(data: Buffer): void;
    shift(): ModbusRTUResponse<import("./response/response-body.js").default> | undefined;
}
//# sourceMappingURL=rtu-client-response-handler.d.ts.map