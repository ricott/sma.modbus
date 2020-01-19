import MBClient from './modbus-client.js';
import ModbusRTUClientRequestHandler from './rtu-client-request-handler.js';
import ModbusRTUClientResponseHandler from './rtu-client-response-handler.js';
import * as SerialPort from 'serialport';
import ModbusRTURequest from './rtu-request.js';
export default class ModbusRTUClient extends MBClient<SerialPort, ModbusRTURequest> {
    protected _requestHandler: ModbusRTUClientRequestHandler;
    protected _responseHandler: ModbusRTUClientResponseHandler;
    constructor(socket: SerialPort, address: number, timeout?: number);
    readonly slaveId: number;
    readonly unitId: number;
}
//# sourceMappingURL=modbus-rtu-client.d.ts.map