/**
 * Shared types for network protocol between client and server
 */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface BallSnapshot {
    id: number;
    pos: Vec3;
    vel: Vec3;
    rvel: Vec3;
    state: "Stationary" | "Rolling" | "Sliding" | "Falling" | "InPocket";
}
export interface OutcomeSnapshot {
    type: "collision" | "cushion" | "pot";
    ballId: number;
    ballId2?: number;
    speed: number;
}
export interface TableSnapshot {
    timestamp: number;
    serverTick: number;
    balls: BallSnapshot[];
    isStationary: boolean;
    outcomes: OutcomeSnapshot[];
}
export interface AimInput {
    angle: number;
    power: number;
    offset: Vec3;
    pos: Vec3;
}
export interface ClientEvents {
    join: (data: {
        roomId: string;
        clientId: string;
        playerName: string;
    }) => void;
    hit: (data: {
        aim: AimInput;
        sequence: number;
    }) => void;
    placeBall: (data: {
        pos: Vec3;
        sequence: number;
    }) => void;
    requestState: () => void;
    chat: (data: {
        message: string;
    }) => void;
}
export interface ServerEvents {
    welcome: (data: {
        roomId: string;
        clientId: string;
        initialState: TableSnapshot;
        serverTime: number;
    }) => void;
    snapshot: (data: TableSnapshot) => void;
    shotAccepted: (data: {
        sequence: number;
        serverTick: number;
    }) => void;
    shotRejected: (data: {
        sequence: number;
        reason: string;
    }) => void;
    stationary: (data: {
        finalState: TableSnapshot;
    }) => void;
    playerJoined: (data: {
        clientId: string;
        playerName: string;
    }) => void;
    playerLeft: (data: {
        clientId: string;
    }) => void;
    chat: (data: {
        clientId: string;
        playerName: string;
        message: string;
    }) => void;
    error: (data: {
        message: string;
    }) => void;
}
export interface RoomState {
    roomId: string;
    players: Map<string, PlayerState>;
    tableState: TableSnapshot;
    isSimulating: boolean;
    currentTurn: string | null;
    serverTick: number;
}
export interface PlayerState {
    clientId: string;
    playerName: string;
    socketId: string;
    lastPing: number;
}
//# sourceMappingURL=protocol.d.ts.map