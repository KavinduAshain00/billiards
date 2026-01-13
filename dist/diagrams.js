"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var physics_1 = require("./model/physics/physics");
var three_1 = require("three");
var cushionplot_1 = require("./diagram/cushionplot");
var graph_1 = require("./diagram/graph");
var rolldiagram_1 = require("./diagram/rolldiagram");
var sliders_1 = require("./view/sliders");
var diagramcontainer_1 = require("./diagram/diagramcontainer");
var constants_1 = require("./model/physics/constants");
var cue_1 = require("./view/cue");
var p1, p2, p3, p4, p5;
var linegraph1, linegraph2, linegraph3, linegraph4;
var s = 3 * constants_1.R;
document.addEventListener("DOMContentLoaded", function () {
    var replaydiagrams = document.getElementsByClassName("replaydiagram");
    for (var i = 0; i < replaydiagrams.length; i++) {
        var diagram = replaydiagrams.item(i);
        var diagramcontainer = diagramcontainer_1.DiagramContainer.fromDiamgramElement(diagram);
        diagramcontainer.start();
    }
    var rollcanvas = id("rollcanvas");
    if (rollcanvas) {
        var rolldiagram = new rolldiagram_1.RollDiagram(rollcanvas);
        rolldiagram.draw(5);
    }
    else {
        if (id("cushion1")) {
            initialisePlots();
        }
        var sliders = new sliders_1.Sliders(plotAll);
        sliders.initialiseSlider("s", s, sets, 4);
        if (id("derived")) {
            reportConstants();
        }
    }
});
function reportConstants() {
    var elt = id("derived");
    var v = new three_1.Vector3(new cue_1.Cue().maxPower, 0, 0);
    var w = (0, physics_1.cueToSpin)(new three_1.Vector3(0.5), v);
    elt.innerHTML += "Mx,My    = ".concat(constants_1.Mxy.toFixed(6), "\n");
    elt.innerHTML += "Mz       = ".concat(constants_1.Mz.toFixed(6), "\n");
    elt.innerHTML += "I        = ".concat(constants_1.I.toFixed(6), "\n");
    elt.innerHTML += "Max vel  = ".concat(v.length().toFixed(6), "\n");
    elt.innerHTML += "Max rvel = ".concat(w.length().toFixed(4), "\n");
}
function sets(v) {
    s = v;
}
function initialisePlots() {
    p1 = new cushionplot_1.CushionPlot(id("cushion1"), "stun shot");
    p2 = new cushionplot_1.CushionPlot(id("cushion2"), "running side");
    p3 = new cushionplot_1.CushionPlot(id("cushion3"), "check side");
    p4 = new cushionplot_1.CushionPlot(id("cushion4"), "varying side");
    p5 = new cushionplot_1.CushionPlot(id("cushion5"), "varying side high vel");
    linegraph1 = new graph_1.Graph("plot1", "Top spin ball played slow directly into cushion", "top/back spin w.y");
    linegraph2 = new graph_1.Graph("plot2", "Top spin ball played hard directly into cushion", "top/back spin w.y");
    linegraph3 = new graph_1.Graph("plot3", "Right hand spinning ball with varying incident angleand speed s", "Incident angle (degrees) of ball to cushion with right side");
    linegraph4 = new graph_1.Graph("plot4", "Bounce angle of ball with check side (y-axis outward angle)", "Incident angle (degrees) of ball to cushion, 0=perpendicular, 90=parallel. Blue=Han2005 Red=Blend");
    plotAll();
}
function plotAll() {
    if (p1) {
        plotCushionDiagrams();
        plotLineGraphs();
    }
}
function plotLineGraphs() {
    lineGraph1();
    lineGraph2();
    lineGraph3();
    lineGraph4();
}
function lineGraph1() {
    var x = [];
    var y1 = [];
    var y2 = [];
    for (var i = -180; i <= 180; i += 30) {
        x.push(i);
        var v = new three_1.Vector3(0.2 * constants_1.R, 0.0, 0);
        var w = new three_1.Vector3(0.0, 0.0, i * constants_1.R);
        y1.push((0, physics_1.Pze)((0, physics_1.c0)(v)));
        y2.push((0, physics_1.Pzs)((0, physics_1.s0)(v, w)));
    }
    linegraph1.plot(x, y1, y2);
}
function lineGraph2() {
    var x = [];
    var y1 = [];
    var y2 = [];
    for (var i = -180; i <= 180; i += 30) {
        x.push(i);
        var v = new three_1.Vector3(150 * constants_1.R, 0, 0);
        var w = new three_1.Vector3(0.0, i * constants_1.R, 0);
        y1.push((0, physics_1.Pze)((0, physics_1.c0)(v)));
        y2.push((0, physics_1.Pzs)((0, physics_1.s0)(v, w)));
    }
    linegraph2.plot(x, y1, y2);
}
function lineGraph3() {
    var x = [];
    var y1 = [];
    var y2 = [];
    for (var i = -80; i <= 80; i += 10) {
        x.push(i);
        var rad = (i * Math.PI) / 180;
        var v = new three_1.Vector3(Math.cos(rad) * constants_1.R, Math.sin(rad) * constants_1.R, 0);
        v.multiplyScalar(s);
        var w = new three_1.Vector3(0.0, 0, -10 * constants_1.R);
        y1.push((0, physics_1.Pze)((0, physics_1.c0)(v)));
        y2.push((0, physics_1.Pzs)((0, physics_1.s0)(v, w)));
    }
    linegraph3.plot(x, y1, y2);
}
function lineGraph4() {
    // input vs output angle on cushion
    var x = [];
    var y1 = [];
    var y2 = [];
    for (var i = 0; i <= 88; i += 2) {
        x.push(i);
        var rad = (i * Math.PI) / 180;
        var v = new three_1.Vector3(Math.cos(rad) * constants_1.R, Math.sin(rad) * constants_1.R, 0);
        var w = new three_1.Vector3(0, 0, 50 * constants_1.R);
        var deltaHan = (0, physics_1.bounceHan)(v, w);
        var outHan = v.clone().add(deltaHan.v);
        var outAngleHan = (-Math.atan2(-outHan.y, -outHan.x) * 180) / Math.PI;
        y1.push(outAngleHan);
        var deltaBlend = (0, physics_1.bounceHanBlend)(v, w);
        var outBlend = v.clone().add(deltaBlend.v);
        var outAngleBlend = (-Math.atan2(-outBlend.y, -outBlend.x) * 180) / Math.PI;
        y2.push(outAngleBlend);
    }
    linegraph4.plot(x, y1, y2);
}
function id(id) {
    return document.getElementById(id);
}
function plotCushionDiagrams() {
    function spin(w) {
        return function (_) { return svec(0, 0, w); };
    }
    var sin = function (a) { return Math.sin((a * Math.PI) / 180); };
    var cos = function (a) { return Math.cos((a * Math.PI) / 180); };
    var aimAtAngle = function (a) { return svec(cos(a), sin(a), 0); };
    p1.plot(10, 80, 10, aimAtAngle, function (_) { return svec(0, 0, 0); });
    p2.plot(10, 80, 10, aimAtAngle, spin(-40));
    p3.plot(10, 80, 10, aimAtAngle, spin(40));
    p4.plot(-6, 6, 1, function (_) { return svec(0.7, 0.7, 0); }, function (z) { return svec(0, 0, z * 6); });
    p5.plot(-6, 6, 1, function (_) { return svec(2, 2, 0); }, function (z) { return svec(0, 0, z * 6); });
}
function svec(x, y, z) {
    return new three_1.Vector3(x * constants_1.R, y * constants_1.R, z * constants_1.R);
}
//# sourceMappingURL=diagrams.js.map