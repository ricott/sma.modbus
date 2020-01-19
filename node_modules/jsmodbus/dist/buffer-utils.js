"use strict";
const Debug = require("debug");
const debug = Debug('buffer-utils');
class BufferUtils {
    static bufferShift(startAddress, endAddress, outputs) {
        startAddress = startAddress - 1;
        const startShift = startAddress % 8;
        const startByte = Math.floor(startAddress / 8);
        const endByte = Math.floor(endAddress / 8);
        const size = endByte - startByte + 1;
        const buffer = Buffer.allocUnsafe(size);
        buffer[0] = outputs[0] << startShift;
        debug('buffer[0] = %s ( %s << %d )', buffer[0].toString(2), outputs[0].toString(2), startShift);
        const paddedBuffer = Buffer.concat([outputs, Buffer.alloc(1)], outputs.length + 1);
        for (let i = 1; i < size; i++) {
            buffer[i] = (paddedBuffer[i] << startShift) + (paddedBuffer[i - 1] >> (8 - startShift));
            debug('buffer[%d] = %s ( %s << %d + %s >> %d)', i, buffer[i].toString(2), paddedBuffer[i].toString(2), startShift, paddedBuffer[i - 1].toString(2), 8 - startAddress);
        }
        return buffer;
    }
    static firstByte(startAddress, originalByte, outputByte) {
        startAddress = startAddress - 1;
        const startShift = startAddress % 8;
        const mask = 0xff >> (8 - startShift);
        const maskedOriginalByte = originalByte & mask;
        return outputByte + maskedOriginalByte;
    }
    static lastByte(endAddress, originalByte, outputByte) {
        const endShift = endAddress % 8;
        const mask = 0xff << endShift;
        const maskedOriginalByte = originalByte & mask;
        return outputByte + maskedOriginalByte;
    }
    static bufferToArrayStatus(buffer) {
        const statusArray = [];
        let pos;
        let curByteIdx;
        let curByte;
        if (!(buffer instanceof Buffer)) {
            return statusArray;
        }
        for (let i = 0; i < buffer.length * 8; i += 1) {
            pos = i % 8;
            curByteIdx = Math.floor(i / 8);
            curByte = buffer.readUInt8(curByteIdx);
            const value = ((curByte & Math.pow(2, pos)) > 0);
            statusArray.push(value ? 1 : 0);
        }
        return statusArray;
    }
    static arrayStatusToBuffer(array) {
        const byteCount = array instanceof Array ? Math.ceil(array.length / 8) : 0;
        const buffer = Buffer.alloc(byteCount);
        if (!(array instanceof Array)) {
            return buffer;
        }
        let byteOffset;
        let bitOffset;
        let byte;
        for (let i = 0; i < array.length; i += 1) {
            byteOffset = Math.floor(i / 8);
            bitOffset = i % 8;
            byte = buffer.readUInt8(byteOffset);
            byte += array[i] ? Math.pow(2, bitOffset) : 0;
            buffer.writeUInt8(byte, byteOffset);
        }
        return buffer;
    }
}
module.exports = BufferUtils;
