export declare type ErrorCode = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 11;
export declare const ErrorMessages: {
    readonly 0x01: "ILLEGAL FUNCTION";
    readonly 0x02: "ILLEGAL DATA ADDRESS";
    readonly 0x03: "ILLEGAL DATA VALUE";
    readonly 0x04: "SLAVE DEVICE FAILURE";
    readonly 0x05: "ACKNOWLEDGE";
    readonly 0x06: "SLAVE DEVICE BUSY";
    readonly 0x08: "MEMORY PARITY ERROR";
    readonly 0x0A: "GATEWAY PATH UNAVAILABLE";
    readonly 0x0B: "GATEWAY TARGET DEVICE FAILED TO RESPOND";
};
declare type IErrorMessage = typeof ErrorMessages;
declare type ErrorMessage = IErrorMessage[ErrorCode];
export declare function errorCodeToMessage(x: number): ErrorMessage;
export declare function errorCodeToMessage(x: ErrorCode): ErrorMessage;
export declare function isErrorCode(x: any): x is ErrorCode;
export {};
//# sourceMappingURL=errors.d.ts.map