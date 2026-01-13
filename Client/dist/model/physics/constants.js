"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosθ = exports.sinθ = exports.I = exports.Mxy = exports.Mz = exports.μw = exports.μs = exports.ee = exports.e = exports.R = exports.m = exports.rho = exports.muC = exports.muS = exports.mu = exports.g = void 0;
exports.setR = setR;
exports.setm = setm;
exports.setmu = setmu;
exports.setrho = setrho;
exports.setmuS = setmuS;
exports.sete = sete;
exports.setmuC = setmuC;
exports.setμs = setμs;
exports.setμw = setμw;
exports.setee = setee;
exports.g = 9.8;
exports.mu = 0.00985;
exports.muS = 0.16;
exports.muC = 0.85;
exports.rho = 0.034;
exports.m = 0.23;
exports.R = 0.03275;
exports.e = 0.86;
// Mathaven specific
// Coefficient of restitution
exports.ee = 0.98;
// Coefficient of sliding friction (table)
exports.μs = 0.212;
// Coefficient of sliding friction (cushion)
exports.μw = 0.14;
// Fixed angle of cushion contact point above ball center
exports.sinθ = 2 / 5;
// Fixed angle of cushion contact point above ball center
exports.cosθ = Math.sqrt(21) / 5;
refresh();
function refresh() {
    exports.Mz = ((exports.mu * exports.m * exports.g * 2) / 3) * exports.rho;
    exports.Mxy = (7 / (5 * Math.sqrt(2))) * exports.R * exports.mu * exports.m * exports.g;
    exports.I = (2 / 5) * exports.m * exports.R * exports.R;
}
function setR(val) {
    exports.R = val;
    refresh();
}
function setm(val) {
    exports.m = val;
    refresh();
}
function setmu(val) {
    exports.mu = val;
    refresh();
}
function setrho(val) {
    exports.rho = val;
    refresh();
}
function setmuS(val) {
    exports.muS = val;
}
function sete(val) {
    exports.e = val;
}
function setmuC(val) {
    exports.muC = val;
}
function setμs(val) {
    exports.μs = val;
}
function setμw(val) {
    exports.μw = val;
}
function setee(val) {
    exports.ee = val;
}
//# sourceMappingURL=constants.js.map