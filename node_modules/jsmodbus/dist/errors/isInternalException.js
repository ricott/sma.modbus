"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InternalErrorMessagesArray = [
    'InvalidStartAddress',
    'InvalidQuantity',
    'InvalidArraySize',
    'InvalidBufferSize',
    'InvalidCoilsInput',
    'InvalidType_MustBeBufferOrArray',
    'InvalidValue'
];
function isInternalException(x) {
    if (typeof x !== 'object') {
        return false;
    }
    if (InternalErrorMessagesArray.includes(x.message)) {
        return true;
    }
    return false;
}
exports.isInternalException = isInternalException;
