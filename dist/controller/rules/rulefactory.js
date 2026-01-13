"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleFactory = void 0;
var eightball_1 = require("./eightball");
var fourteenone_1 = require("./fourteenone");
var nineball_1 = require("./nineball");
var snooker_1 = require("./snooker");
var threecushion_1 = require("./threecushion");
var RuleFactory = /** @class */ (function () {
    function RuleFactory() {
    }
    RuleFactory.create = function (ruletype, container) {
        switch (ruletype) {
            case "eightball":
                return new eightball_1.EightBall(container);
            case "threecushion":
                return new threecushion_1.ThreeCushion(container);
            case "fourteenone":
                return new fourteenone_1.FourteenOne(container);
            case "snooker":
                return new snooker_1.Snooker(container);
            default:
                return new nineball_1.NineBall(container);
        }
    };
    return RuleFactory;
}());
exports.RuleFactory = RuleFactory;
//# sourceMappingURL=rulefactory.js.map