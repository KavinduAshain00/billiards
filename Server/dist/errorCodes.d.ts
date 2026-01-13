export declare const CODES: {
    SERVER_ERROR: {
        code: string;
        message: string;
    };
    GAME_SESSION_EXISTS: {
        code: string;
        message: string;
    };
    ROOM_NOT_FOUND: {
        code: string;
        message: string;
    };
    MISSING_GAME_SESSION_UUID: {
        code: string;
        message: string;
    };
    MISSING_GAME_TYPE: {
        code: string;
        message: string;
    };
    UNAUTHORIZED: {
        code: string;
        message: string;
    };
    INVALID_PLAYER: {
        code: string;
        message: string;
    };
    GAME_ALREADY_ENDED: {
        code: string;
        message: string;
    };
};
export declare function emitSocketError(socket: any, code: string, message: string): void;
//# sourceMappingURL=errorCodes.d.ts.map