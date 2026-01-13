/**
 * Mathaven cushion physics model - EXACT MATCH with client src/model/physics/mathaven.ts
 */
export declare class Mathaven {
    private readonly M;
    private readonly R;
    private readonly ee;
    private readonly μs;
    private readonly μw;
    vx: number;
    vy: number;
    ωx: number;
    ωy: number;
    ωz: number;
    constructor(M: number, R: number, ee: number, μs: number, μw: number);
    private get I();
    solve(v0x: number, v0y: number, ω0x: number, ω0y: number, ω0z: number): void;
}
//# sourceMappingURL=mathaven.d.ts.map