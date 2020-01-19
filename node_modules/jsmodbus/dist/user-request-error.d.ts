import ModbusAbstractResponse from './abstract-response';
export declare type UserRequestErrorCodes = 'OutOfSync' | 'Protocol' | 'Timeout' | 'ManuallyCleared' | 'ModbusException' | 'Offline' | 'crcMismatch';
export interface IUserRequestError<Res extends ModbusAbstractResponse> {
    err: UserRequestErrorCodes;
    message: string;
    response?: Res;
}
export declare class UserRequestError<Res extends ModbusAbstractResponse> implements IUserRequestError<Res> {
    err: UserRequestErrorCodes;
    message: string;
    response?: Res;
    constructor({ err, message, response }: IUserRequestError<Res>);
}
export declare function isUserRequestError(x: any): x is UserRequestError<any>;
//# sourceMappingURL=user-request-error.d.ts.map