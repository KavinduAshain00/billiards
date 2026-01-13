"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeCushion = void 0;
var aim_1 = require("../../controller/aim");
var watchaim_1 = require("../../controller/watchaim");
var watchevent_1 = require("../../events/watchevent");
var outcome_1 = require("../../model/outcome");
var constants_1 = require("../../model/physics/constants");
var table_1 = require("../../model/table");
var rack_1 = require("../../utils/rack");
var cameratop_1 = require("../../view/cameratop");
var tablegeometry_1 = require("../../view/tablegeometry");
var utils_1 = require("../../utils/utils");
var respot_1 = require("../../utils/respot");
var startaimevent_1 = require("../../events/startaimevent");
var ThreeCushion = /** @class */ (function () {
    function ThreeCushion(container) {
        this.currentBreak = 0;
        this.previousBreak = 0;
        this.score = 0;
        this.rulename = "threecushion";
        this.container = container;
    }
    ThreeCushion.prototype.startTurn = function () {
        // not used
    };
    ThreeCushion.prototype.nextCandidateBall = function () {
        return respot_1.Respot.closest(this.container.table.cueball, this.container.table.balls);
    };
    ThreeCushion.prototype.placeBall = function (_) {
        return utils_1.zero;
    };
    ThreeCushion.prototype.asset = function () {
        return "models/threecushion.min.gltf";
    };
    ThreeCushion.prototype.secondToPlay = function () {
        this.cueball = this.container.table.balls[1];
    };
    ThreeCushion.prototype.tableGeometry = function () {
        tablegeometry_1.TableGeometry.tableX = constants_1.R * 49;
        tablegeometry_1.TableGeometry.tableY = constants_1.R * 24;
        tablegeometry_1.TableGeometry.X = tablegeometry_1.TableGeometry.tableX + constants_1.R;
        tablegeometry_1.TableGeometry.Y = tablegeometry_1.TableGeometry.tableY + constants_1.R;
        tablegeometry_1.TableGeometry.hasPockets = false;
    };
    ThreeCushion.prototype.table = function () {
        this.tableGeometry();
        cameratop_1.CameraTop.zoomFactor = 0.92;
        var table = new table_1.Table(this.rack());
        this.cueball = table.cueball;
        return table;
    };
    ThreeCushion.prototype.rack = function () {
        return rack_1.Rack.three();
    };
    ThreeCushion.prototype.update = function (outcomes) {
        if (outcome_1.Outcome.isThreeCushionPoint(this.cueball, outcomes)) {
            this.container.sound.playSuccess(outcomes.length / 3);
            this.container.sendEvent(new watchevent_1.WatchEvent(this.container.table.serialise()));
            this.currentBreak++;
            this.score++;
            return new aim_1.Aim(this.container);
        }
        this.previousBreak = this.currentBreak;
        this.currentBreak = 0;
        if (this.container.isSinglePlayer) {
            this.cueball = this.otherPlayersCueBall();
            this.container.table.cue.aim.i = this.container.table.balls.indexOf(this.cueball);
            return new aim_1.Aim(this.container);
        }
        this.container.sendEvent(new startaimevent_1.StartAimEvent());
        return new watchaim_1.WatchAim(this.container);
    };
    ThreeCushion.prototype.otherPlayersCueBall = function () {
        var balls = this.container.table.balls;
        return this.cueball === balls[0] ? balls[1] : balls[0];
    };
    ThreeCushion.prototype.isPartOfBreak = function (outcome) {
        return outcome_1.Outcome.isThreeCushionPoint(this.cueball, outcome);
    };
    ThreeCushion.prototype.isEndOfGame = function (_) {
        return false;
    };
    ThreeCushion.prototype.allowsPlaceBall = function () {
        return false;
    };
    return ThreeCushion;
}());
exports.ThreeCushion = ThreeCushion;
//# sourceMappingURL=threecushion.js.map