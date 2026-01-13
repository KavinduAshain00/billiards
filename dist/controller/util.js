"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controllerName = controllerName;
var aim_1 = require("./aim");
var watchaim_1 = require("./watchaim");
var init_1 = require("./init");
var playshot_1 = require("./playshot");
var watchshot_1 = require("./watchshot");
var replay_1 = require("./replay");
var end_1 = require("./end");
var placeball_1 = require("./placeball");
function controllerName(c) {
    if (c instanceof init_1.Init) {
        return "Init";
    }
    if (c instanceof placeball_1.PlaceBall) {
        return "PlaceBall";
    }
    if (c instanceof aim_1.Aim) {
        return "Aim";
    }
    if (c instanceof watchaim_1.WatchAim) {
        return "WatchAim";
    }
    if (c instanceof playshot_1.PlayShot) {
        return "PlayShot";
    }
    if (c instanceof watchshot_1.WatchShot) {
        return "WatchShot";
    }
    if (c instanceof replay_1.Replay) {
        return "Replay";
    }
    if (c instanceof end_1.End) {
        return "End";
    }
    return "UNKNOWN";
}
//# sourceMappingURL=util.js.map