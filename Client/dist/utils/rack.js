"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rack = void 0;
var ball_1 = require("../model/ball");
var tablegeometry_1 = require("../view/tablegeometry");
var three_1 = require("three");
var utils_1 = require("./utils");
var constants_1 = require("../model/physics/constants");
var Rack = /** @class */ (function () {
    function Rack() {
    }
    Rack.jitter = function (pos) {
        return (0, utils_1.roundVec)(pos
            .clone()
            .add(new three_1.Vector3(Rack.noise * (Math.random() - 0.5), Rack.noise * (Math.random() - 0.5), 0)));
    };
    Rack.cueBall = function (pos, ballNumber) {
        return new ball_1.Ball(Rack.jitter(pos), 0xfaebd7, false, ballNumber);
    };
    Rack.diamond = function () {
        var pos = new three_1.Vector3(tablegeometry_1.TableGeometry.tableX / 2, 0, 0);
        var diamond = [];
        diamond.push(Rack.cueBall(Rack.spot));
        diamond.push(new ball_1.Ball(Rack.jitter(pos), 0xe0de36));
        pos.add(Rack.diagonal);
        diamond.push(new ball_1.Ball(Rack.jitter(pos), 0xff9d00));
        pos.sub(Rack.across);
        diamond.push(new ball_1.Ball(Rack.jitter(pos), 0x521911));
        pos.add(Rack.diagonal);
        diamond.push(new ball_1.Ball(Rack.jitter(pos), 0x595200));
        pos.sub(Rack.across);
        diamond.push(new ball_1.Ball(Rack.jitter(pos), 0xff0000));
        pos.addScaledVector(Rack.across, 2);
        diamond.push(new ball_1.Ball(Rack.jitter(pos), 0x050505));
        pos.add(Rack.diagonal).sub(Rack.across);
        diamond.push(new ball_1.Ball(Rack.jitter(pos), 0x0a74c2));
        pos.sub(Rack.across);
        diamond.push(new ball_1.Ball(Rack.jitter(pos), 0x087300));
        pos.add(Rack.diagonal);
        diamond.push(new ball_1.Ball(Rack.jitter(pos), 0x3e009c));
        return diamond;
    };
    Rack.triangle = function () {
        var tp = Rack.trianglePositions();
        var cueball = Rack.cueBall(Rack.spot);
        var triangle = tp.map(function (p) { return new ball_1.Ball(Rack.jitter(p)); });
        triangle.unshift(cueball);
        return triangle.slice(0, 5);
    };
    Rack.fullTriangle = function () {
        var tp = Rack.trianglePositions();
        var cueball = Rack.cueBall(Rack.spot);
        var triangle = tp.map(function (p) { return new ball_1.Ball(Rack.jitter(p)); });
        triangle.unshift(cueball);
        return triangle;
    };
    Rack.eightBall = function () {
        var _a;
        var tp = Rack.trianglePositions();
        var balls = [];
        // Cue ball (id 0) - will use cue.glb model
        balls.push(Rack.cueBall(Rack.spot, 0));
        // Randomise the rack order for 8-ball, but keep the 8-ball fixed at the center (tp[3])
        var colorMap = {
            1: 0xffcc00,
            2: 0xe0de36,
            3: 0x521911,
            4: 0x595200,
            5: 0xff0000,
            6: 0x087300,
            7: 0xee7700,
            8: 0x050505,
            9: 0xff9d00,
            10: 0x3e009c,
            11: 0x0a74c2,
            12: 0xbd723a,
            13: 0xeede36,
            14: 0x0c9664,
            15: 0xffaacc,
        };
        var numbers = [];
        for (var i = 1; i <= 15; i++) {
            if (i !== 8)
                numbers.push(i);
        }
        // Fisher-Yates shuffle
        for (var i = numbers.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            _a = [numbers[j], numbers[i]], numbers[i] = _a[0], numbers[j] = _a[1];
        }
        // Assign shuffled numbers to triangle positions, keeping index 3 reserved for 8
        var assigned = [];
        var idx = 0;
        for (var i = 0; i < tp.length; i++) {
            if (i === 3) {
                assigned[i] = 8;
            }
            else {
                assigned[i] = numbers[idx++];
            }
        }
        // Create balls using the assigned numbers and the color map
        for (var i = 0; i < assigned.length; i++) {
            var n = assigned[i];
            var color = colorMap[n];
            var stripe = n > 8;
            balls.push(new ball_1.Ball(Rack.jitter(tp[i]), color, stripe, n));
        }
        return balls;
    };
    Rack.trianglePositions = function () {
        var triangle = [];
        var pos = new three_1.Vector3(tablegeometry_1.TableGeometry.X / 2, 0, 0);
        triangle.push((0, utils_1.vec)(pos));
        // row 2
        pos.add(this.diagonal);
        triangle.push((0, utils_1.vec)(pos));
        pos.sub(this.across);
        triangle.push((0, utils_1.vec)(pos));
        // row 3
        pos.add(this.diagonal);
        triangle.push((0, utils_1.vec)(pos));
        pos.sub(this.across);
        triangle.push((0, utils_1.vec)(pos));
        pos.addScaledVector(this.across, 2);
        triangle.push((0, utils_1.vec)(pos));
        // row 4
        pos.add(this.diagonal);
        triangle.push((0, utils_1.vec)(pos));
        pos.sub(this.across);
        triangle.push((0, utils_1.vec)(pos));
        pos.sub(this.across);
        triangle.push((0, utils_1.vec)(pos));
        pos.sub(this.across);
        triangle.push((0, utils_1.vec)(pos));
        // row 5
        pos.add(this.diagonal).sub(this.across);
        triangle.push((0, utils_1.vec)(pos));
        pos.add(this.across);
        triangle.push((0, utils_1.vec)(pos));
        pos.add(this.across);
        triangle.push((0, utils_1.vec)(pos));
        pos.add(this.across);
        triangle.push((0, utils_1.vec)(pos));
        pos.add(this.across);
        triangle.push((0, utils_1.vec)(pos));
        return triangle;
    };
    Rack.rerack = function (key, table) {
        var tp = Rack.trianglePositions();
        var first = tp.shift();
        table.balls
            .filter(function (b) { return b !== table.cueball; })
            .filter(function (b) { return b !== key; })
            .forEach(function (b) {
            b.pos.copy(Rack.jitter(tp.shift()));
            b.state = ball_1.State.Stationary;
        });
        if (table.overlapsAny(key.pos, key)) {
            key.pos.copy(first);
        }
        if (table.overlapsAny(table.cueball.pos)) {
            table.cueball.pos.copy(Rack.spot);
        }
    };
    Rack.three = function () {
        var threeballs = [];
        var dx = tablegeometry_1.TableGeometry.X / 2;
        var dy = tablegeometry_1.TableGeometry.Y / 4;
        threeballs.push(Rack.cueBall(Rack.jitter(new three_1.Vector3(-dx, -dy, 0))));
        threeballs.push(new ball_1.Ball(Rack.jitter(new three_1.Vector3(-dx, 0, 0)), 0xe0de36));
        threeballs.push(new ball_1.Ball(Rack.jitter(new three_1.Vector3(dx, 0, 0)), 0xff0000));
        return threeballs;
    };
    Rack.snooker = function () {
        var balls = [];
        var dy = tablegeometry_1.TableGeometry.Y / 4;
        balls.push(Rack.cueBall(Rack.jitter(new three_1.Vector3(Rack.baulk, -dy * 0.5, 0))));
        var colours = Rack.snookerColourPositions();
        balls.push(new ball_1.Ball(Rack.jitter(colours[0]), 0xeede36));
        balls.push(new ball_1.Ball(Rack.jitter(colours[1]), 0x0c9664));
        balls.push(new ball_1.Ball(Rack.jitter(colours[2]), 0xbd723a));
        balls.push(new ball_1.Ball(Rack.jitter(colours[3]), 0x0883ee));
        balls.push(new ball_1.Ball(Rack.jitter(colours[4]), 0xffaacc));
        balls.push(new ball_1.Ball(Rack.jitter(colours[5]), 0x010101));
        // change to 15 red balls
        var triangle = Rack.trianglePositions().slice(0, 15);
        triangle.forEach(function (p) {
            balls.push(new ball_1.Ball(Rack.jitter(p.add(Rack.down)), 0xee0000));
        });
        return balls;
    };
    Rack.snookerColourPositions = function () {
        var dx = tablegeometry_1.TableGeometry.X / 2;
        var black = tablegeometry_1.TableGeometry.X - (tablegeometry_1.TableGeometry.X * 2) / 11;
        var positions = [];
        positions.push(new three_1.Vector3(Rack.baulk, -Rack.sixth, 0));
        positions.push(new three_1.Vector3(Rack.baulk, Rack.sixth, 0));
        positions.push(new three_1.Vector3(Rack.baulk, 0, 0));
        positions.push(new three_1.Vector3(0, 0, 0));
        positions.push(new three_1.Vector3(dx, 0, 0));
        positions.push(new three_1.Vector3(black, 0, 0));
        return positions;
    };
    Rack.noise = constants_1.R * 0.0233;
    Rack.gap = 2 * constants_1.R + 2 * Rack.noise;
    Rack.up = new three_1.Vector3(0, 0, -1);
    Rack.spot = new three_1.Vector3(-tablegeometry_1.TableGeometry.X / 2, 0.0, 0);
    Rack.across = new three_1.Vector3(0, Rack.gap, 0);
    Rack.down = new three_1.Vector3(Rack.gap, 0, 0);
    Rack.diagonal = Rack.across
        .clone()
        .applyAxisAngle(Rack.up, (Math.PI * 1) / 3);
    Rack.sixth = (tablegeometry_1.TableGeometry.Y * 2) / 6;
    Rack.baulk = (-1.5 * tablegeometry_1.TableGeometry.X * 2) / 5;
    return Rack;
}());
exports.Rack = Rack;
//# sourceMappingURL=rack.js.map