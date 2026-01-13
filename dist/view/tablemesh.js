"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableMesh = void 0;
var three_1 = require("three");
var tablegeometry_1 = require("./tablegeometry");
var pocketgeometry_1 = require("./pocketgeometry");
var constants_1 = require("../model/physics/constants");
var TableMesh = /** @class */ (function () {
    function TableMesh() {
        this.logger = function (_) { };
        this.cloth = new three_1.MeshPhongMaterial({
            color: 0x4455b9,
            wireframe: false,
            flatShading: true,
            transparent: false,
        });
        this.cushion = new three_1.MeshPhongMaterial({
            color: 0x5465b9,
            wireframe: false,
            flatShading: true,
            transparent: false,
        });
        this.pocket = new three_1.MeshPhongMaterial({
            color: 0x445599,
            wireframe: false,
            flatShading: true,
            transparent: true,
            opacity: 0.3,
        });
    }
    TableMesh.prototype.generateTable = function (hasPockets) {
        var _this = this;
        var group = new three_1.Group();
        var light = new three_1.PointLight(0xf0f0e8, 22.0);
        light.position.set(0, 0, constants_1.R * 50);
        group.add(light);
        this.addCushions(group, hasPockets);
        if (hasPockets) {
            pocketgeometry_1.PocketGeometry.knuckles.forEach(function (k) { return _this.knuckleCylinder(k, group); });
            pocketgeometry_1.PocketGeometry.pocketCenters.forEach(function (p) {
                return _this.knuckleCylinder(p, group, _this.pocket);
            });
            var p = pocketgeometry_1.PocketGeometry.pockets.pocketNW.pocket;
            var k = pocketgeometry_1.PocketGeometry.pockets.pocketNW.knuckleNE;
            this.logger("knuckle-pocket gap = " +
                (p.pos.distanceTo(k.pos) - p.radius - k.radius));
        }
        return group;
    };
    TableMesh.prototype.knuckleCylinder = function (knuckle, scene, material) {
        if (material === void 0) { material = this.cloth; }
        var k = this.cylinder(knuckle.pos, knuckle.radius, (constants_1.R * 0.75) / 0.5, scene, material);
        k.position.setZ((-constants_1.R * 0.25) / 0.5 / 2);
    };
    TableMesh.prototype.cylinder = function (pos, radius, depth, scene, material) {
        var geometry = new three_1.CylinderGeometry(radius, radius, depth, 16);
        var mesh = new three_1.Mesh(geometry, material);
        mesh.position.copy(pos);
        mesh.geometry.applyMatrix4(new three_1.Matrix4()
            .identity()
            .makeRotationAxis(new three_1.Vector3(1, 0, 0), Math.PI / 2));
        scene.add(mesh);
        return mesh;
    };
    TableMesh.prototype.addCushions = function (scene, hasPockets) {
        var th = (constants_1.R * 10) / 0.5;
        this.plane(new three_1.Vector3(0, 0, -constants_1.R - th / 2), 2 * tablegeometry_1.TableGeometry.X, 2 * tablegeometry_1.TableGeometry.Y, th, scene, this.cloth);
        var d = (constants_1.R * 1) / 0.5;
        var h = (constants_1.R * 0.75) / 0.5;
        var e = (-constants_1.R * 0.25) / 0.5 / 2;
        var X = tablegeometry_1.TableGeometry.X;
        var Y = tablegeometry_1.TableGeometry.Y;
        var lengthN = Math.abs(pocketgeometry_1.PocketGeometry.pockets.pocketNW.knuckleNE.pos.x -
            pocketgeometry_1.PocketGeometry.pockets.pocketN.knuckleNW.pos.x);
        var lengthE = Math.abs(pocketgeometry_1.PocketGeometry.pockets.pocketNW.knuckleSW.pos.y -
            pocketgeometry_1.PocketGeometry.pockets.pocketSW.knuckleNW.pos.y);
        if (!hasPockets) {
            lengthN = 2 * tablegeometry_1.TableGeometry.Y;
            lengthE = 2 * tablegeometry_1.TableGeometry.Y + 4 * constants_1.R;
        }
        this.plane(new three_1.Vector3(X + d / 2, 0, e), d, lengthE, h, scene);
        this.plane(new three_1.Vector3(-X - d / 2, 0, e), d, lengthE, h, scene);
        this.plane(new three_1.Vector3(-X / 2, Y + d / 2, e), lengthN, d, h, scene);
        this.plane(new three_1.Vector3(-X / 2, -Y - d / 2, e), lengthN, d, h, scene);
        this.plane(new three_1.Vector3(X / 2, Y + d / 2, e), lengthN, d, h, scene);
        this.plane(new three_1.Vector3(X / 2, -Y - d / 2, e), lengthN, d, h, scene);
    };
    TableMesh.prototype.plane = function (pos, x, y, z, scene, material) {
        if (material === void 0) { material = this.cushion; }
        var geometry = new three_1.BoxGeometry(x, y, z);
        var mesh = new three_1.Mesh(geometry, material);
        mesh.receiveShadow = true;
        mesh.position.copy(pos);
        scene.add(mesh);
    };
    return TableMesh;
}());
exports.TableMesh = TableMesh;
//# sourceMappingURL=tablemesh.js.map