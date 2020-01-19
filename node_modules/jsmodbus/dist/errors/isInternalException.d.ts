export declare type InternalErrorMessages = 'InvalidStartAddress' | 'InvalidQuantity' | 'InvalidArraySize' | 'InvalidBufferSize' | 'InvalidCoilsInput' | 'InvalidType_MustBeBufferOrArray' | 'InvalidValue';
export interface IInternalException extends Error {
    readonly message: InternalErrorMessages;
}
export declare function isInternalException(x: any): x is IInternalException;
//# sourceMappingURL=isInternalException.d.ts.map