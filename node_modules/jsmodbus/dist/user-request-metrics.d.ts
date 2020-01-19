export declare class UserRequestMetrics {
    createdAt: Date;
    startedAt: Date;
    receivedAt: Date;
    readonly transferTime: number;
    readonly waitTime: number;
    toJSON(): this & {
        transferTime: number;
    };
}
//# sourceMappingURL=user-request-metrics.d.ts.map