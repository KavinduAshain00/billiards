"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealPosition = void 0;
var three_1 = require("three");
var RealPosition = /** @class */ (function () {
    function RealPosition(shotsData) {
        var _this = this;
        this.shots = shotsData.map(function (shot) { return _this.interpolateAllBalls(shot); });
    }
    RealPosition.prototype.interpolateUntilMove = function (data, delta, epsilon) {
        if (delta === void 0) { delta = 0.3; }
        if (epsilon === void 0) { epsilon = 0.00001; }
        if (data.t.length > 1 && data.t[1] - data.t[0] > delta) {
            data.t.splice(1, 0, data.t[1] - epsilon);
            data.x.splice(1, 0, data.x[0]);
            data.y.splice(1, 0, data.y[0]);
        }
        return data;
    };
    RealPosition.prototype.interpolateAllBalls = function (shot) {
        var _this = this;
        shot.balls = Object.fromEntries(Object.entries(shot.balls).map(function (_a) {
            var num = _a[0], data = _a[1];
            return [
                num,
                _this.interpolateUntilMove(data),
            ];
        }));
        return shot;
    };
    RealPosition.prototype.getInterpolatedPosition = function (times, positions, targetTime) {
        if (!times || times.length === 0)
            return positions[0];
        if (targetTime <= times[0])
            return positions[0];
        if (targetTime >= times[times.length - 1])
            return positions[positions.length - 1];
        var lowIndex = 0;
        var highIndex = times.length - 1;
        while (lowIndex < highIndex - 1) {
            var midIndex = Math.floor((lowIndex + highIndex) / 2);
            if (times[midIndex] < targetTime) {
                lowIndex = midIndex;
            }
            else {
                highIndex = midIndex;
            }
        }
        var t1 = times[lowIndex];
        var t2 = times[highIndex];
        var p1 = positions[lowIndex];
        var p2 = positions[highIndex];
        var alpha = (targetTime - t1) / (t2 - t1);
        return p1 + alpha * (p2 - p1);
    };
    RealPosition.prototype.getPositionsAtTime = function (shotId, time) {
        var shot = this.shots.find(function (s) { return s.shotID === shotId; });
        var ballPositions = {};
        for (var ballNum in shot.balls) {
            var ballData = shot.balls[ballNum];
            var x = this.getInterpolatedPosition(ballData.t, ballData.x, time);
            var y = this.getInterpolatedPosition(ballData.t, ballData.y, time);
            ballPositions[ballNum] = { x: x, y: y };
        }
        return ballPositions;
    };
    RealPosition.prototype.realToSim = function (key, ballPositions) {
        return {
            x: 2.3 * (0.71 - ballPositions[key].x / 2),
            y: 2.3 * (-0.36 + ballPositions[key].y / 2),
        };
    };
    RealPosition.prototype.identifyFirstMover = function (shotData) {
        console.log(shotData);
        return shotData.balls["1"].t[1] < shotData.balls["2"].t[1] ? "1" : "2";
    };
    RealPosition.prototype.estimateDirection = function (shotData) {
        var ballPositions1 = this.getPositionsAtTime(shotData.shotID, 0);
        var ballPositions2 = this.getPositionsAtTime(shotData.shotID, 0.2);
        var firstMover = this.identifyFirstMover(shotData);
        var ball1 = ballPositions1[firstMover];
        var pos1 = new three_1.Vector3(ball1.x, ball1.y);
        var ball2 = ballPositions2[firstMover];
        var pos2 = new three_1.Vector3(ball2.x, ball2.y);
        return {
            pos1: ballPositions1,
            pos2: ballPositions2,
            firstMover: firstMover,
            speed: pos1.distanceTo(pos2) * 2,
            angle: new three_1.Vector3(-1, 0).angleTo(pos2.sub(pos1)),
        };
    };
    RealPosition.prototype.stateFrom = function (shotData) {
        var ballPositions = this.getPositionsAtTime(shotData.shotID, 0);
        var state = {
            init: [],
            shots: [],
        };
        for (var ballNum in ballPositions) {
            var pos = this.realToSim(ballNum, ballPositions);
            state.init.push(pos.x);
            state.init.push(pos.y);
        }
        var estimatedDirection = this.estimateDirection(shotData);
        console.log("estimated", estimatedDirection);
        var ball = estimatedDirection.firstMover == "1" ? 0 : 1;
        console.log(estimatedDirection);
        state.shots.push({
            type: "AIM",
            offset: { x: -0, y: 0, z: 0 },
            angle: estimatedDirection.angle,
            power: estimatedDirection.speed,
            pos: { x: state.init[ball * 2], y: state.init[ball * 2 + 1], z: 0 },
            i: ball,
        });
        return state;
    };
    return RealPosition;
}());
exports.RealPosition = RealPosition;
//# sourceMappingURL=realposition.js.map