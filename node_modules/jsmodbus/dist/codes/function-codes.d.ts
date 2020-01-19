export declare enum FC {
    READ_COIL = 1,
    READ_DISCRETE_INPUT = 2,
    READ_HOLDING_REGISTERS = 3,
    READ_INPUT_REGISTERS = 4,
    WRITE_SINGLE_COIL = 5,
    WRITE_SINGLE_HOLDING_REGISTER = 6,
    WRITE_MULTIPLE_COILS = 15,
    WRITE_MULTIPLE_HOLDING_REGISTERS = 16
}
export declare function isFunctionCode(x: number): x is FunctionCode;
export declare type FunctionCode = 1 | 2 | 3 | 4 | 5 | 6 | 15 | 16;
//# sourceMappingURL=function-codes.d.ts.map