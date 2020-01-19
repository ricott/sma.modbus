/// <reference types="node" />
import MBAbstractResponse from './abstract-response';
export default abstract class ModbusClientResponseHandler<ResType extends MBAbstractResponse = MBAbstractResponse> {
    protected _buffer: Buffer;
    protected abstract _messages: ResType[];
    constructor();
    abstract handleData(data: Buffer): void;
    shift(): ResType | undefined;
}
//# sourceMappingURL=client-response-handler.d.ts.map