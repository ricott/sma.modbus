/// <reference types="node" />
import { BooleanArray, Byte } from './constants';
declare class BufferUtils {
    static bufferShift(startAddress: number, endAddress: number, outputs: Buffer): Buffer;
    static firstByte(startAddress: Byte, originalByte: Byte, outputByte: Byte): number;
    static lastByte(endAddress: number, originalByte: Byte, outputByte: Byte): number;
    static bufferToArrayStatus(buffer: Buffer): BooleanArray;
    static arrayStatusToBuffer(array: BooleanArray): Buffer;
}
export = BufferUtils;
//# sourceMappingURL=buffer-utils.d.ts.map