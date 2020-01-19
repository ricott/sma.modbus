/// <reference types="node" />
import { Server, Socket } from 'net';
import ModbusServer, { IModbusServerOptions } from './modbus-server';
export default class ModbusTCPServer extends ModbusServer {
    _server: Server | ModbusServer;
    constructor(server: Server | ModbusServer, options?: Partial<IModbusServerOptions>);
    _onConnection(socket: Socket): void;
}
//# sourceMappingURL=modbus-tcp-server.d.ts.map