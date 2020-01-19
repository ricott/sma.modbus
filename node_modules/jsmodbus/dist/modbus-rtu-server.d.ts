import ModbusServer, { IModbusServerOptions } from './modbus-server.js';
import * as SerialPort from 'serialport';
export default class ModbusRTUServer extends ModbusServer {
    _socket: any;
    emit: any;
    constructor(socket: SerialPort, options?: Partial<IModbusServerOptions>);
}
//# sourceMappingURL=modbus-rtu-server.d.ts.map