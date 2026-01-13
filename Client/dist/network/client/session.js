"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
var Session = /** @class */ (function () {
    function Session(clientId, username, tableId, spectator) {
        this.clientId = clientId;
        this.username = username;
        this.tableId = tableId;
        this.spectator = spectator;
    }
    Session.getInstance = function () {
        if (!Session.instance) {
            throw new Error("Session not initialized");
        }
        return Session.instance;
    };
    Session.isSpectator = function () {
        return Session.instance !== undefined && Session.getInstance().spectator;
    };
    Session.reset = function () {
        Session.instance = undefined;
    };
    Session.init = function (clientId, username, tableId, spectator) {
        Session.instance = new Session(clientId, username, tableId, spectator);
    };
    return Session;
}());
exports.Session = Session;
//# sourceMappingURL=session.js.map