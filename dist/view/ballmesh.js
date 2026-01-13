"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BallMesh = void 0;
var three_1 = require("three");
var ball_1 = require("../model/ball");
var utils_1 = require("./../utils/utils");
var constants_1 = require("../model/physics/constants");
var trace_1 = require("./trace");
var BallMesh = /** @class */ (function () {
    function BallMesh(color, isStripe, ballNumber) {
        if (isStripe === void 0) { isStripe = false; }
        this.m = new three_1.Matrix4();
        this.color = new three_1.Color(color);
        this.isStripe = isStripe;
        this.ballNumber = ballNumber;
        this.initialiseMesh(color);
    }
    BallMesh.prototype.updateAll = function (ball, t) {
        this.updatePosition(ball.pos);
        this.updateArrows(ball.pos, ball.rvel, ball.state);
        if (ball.rvel.lengthSq() !== 0) {
            this.updateRotation(ball.rvel, t);
            this.trace.addTrace(ball.pos, ball.vel);
        }
    };
    BallMesh.prototype.updatePosition = function (pos) {
        this.mesh.position.copy(pos);
        this.shadow.position.copy(pos);
    };
    BallMesh.prototype.updateRotation = function (rvel, t) {
        var angle = rvel.length() * t;
        this.mesh.rotateOnWorldAxis((0, utils_1.norm)(rvel), angle);
    };
    BallMesh.prototype.updateArrows = function (pos, rvel, state) {
        this.spinAxisArrow.setLength(constants_1.R + (constants_1.R * rvel.length()) / 2, constants_1.R, constants_1.R);
        this.spinAxisArrow.position.copy(pos);
        this.spinAxisArrow.setDirection((0, utils_1.norm)(rvel));
        if (state == ball_1.State.Rolling) {
            this.spinAxisArrow.setColor(0xcc0000);
        }
        else {
            this.spinAxisArrow.setColor(0x00cc00);
        }
    };
    BallMesh.prototype.initialiseMesh = function (color) {
        // Use loaded GLB model if available for this ball number
        if (this.ballNumber !== undefined && BallMesh.ballModels.has(this.ballNumber)) {
            var modelMesh = BallMesh.ballModels.get(this.ballNumber);
            // Reuse geometry and material instead of cloning entire mesh
            if (!BallMesh.sharedGeometries.has(this.ballNumber)) {
                BallMesh.sharedGeometries.set(this.ballNumber, modelMesh.geometry);
                BallMesh.sharedMaterials.set(this.ballNumber, modelMesh.material);
            }
            var geometry = BallMesh.sharedGeometries.get(this.ballNumber);
            var material = BallMesh.sharedMaterials.get(this.ballNumber);
            this.mesh = new three_1.Mesh(geometry, material);
            this.mesh.name = "ball";
            this.mesh.scale.set(constants_1.R * 1, constants_1.R * 1, constants_1.R * 1); // Scale to match physics radius
        }
        else {
            // Fall back to generated geometry for cue ball or if model not loaded
            var geometry = new three_1.IcosahedronGeometry(constants_1.R, 1);
            var material = new three_1.MeshPhongMaterial({
                emissive: 0,
                flatShading: true,
                vertexColors: true,
                forceSinglePass: true,
                shininess: 25,
                specular: 0x555533,
            });
            this.addDots(geometry, color);
            this.mesh = new three_1.Mesh(geometry, material);
            this.mesh.name = "ball";
        }
        this.updateRotation(new three_1.Vector3().random(), 100);
        var shadowGeometry = new three_1.CircleGeometry(constants_1.R * 0.9, 9);
        shadowGeometry.applyMatrix4(new three_1.Matrix4().identity().makeTranslation(0, 0, -constants_1.R * 0.99));
        var shadowMaterial = new three_1.MeshBasicMaterial({ color: 0x111122 });
        this.shadow = new three_1.Mesh(shadowGeometry, shadowMaterial);
        this.spinAxisArrow = new three_1.ArrowHelper(utils_1.up, utils_1.zero, 2, 0x000000, 0.01, 0.01);
        this.spinAxisArrow.visible = false;
        this.trace = new trace_1.Trace(500, color);
    };
    BallMesh.prototype.addDots = function (geometry, baseColor) {
        var _this = this;
        var count = geometry.attributes.position.count;
        var color = new three_1.Color(baseColor);
        var white = new three_1.Color(0xFFFFFF);
        var red = new three_1.Color(0xaa2222);
        var black = new three_1.Color(0x000000);
        geometry.setAttribute("color", new three_1.BufferAttribute(new Float32Array(count * 3), 3));
        var verticies = geometry.attributes.color;
        var positions = geometry.attributes.position;
        for (var i = 0; i < count / 3; i++) {
            // Get the center position of this face
            var v1 = new three_1.Vector3(positions.getX(i * 3), positions.getY(i * 3), positions.getZ(i * 3));
            var v2 = new three_1.Vector3(positions.getX(i * 3 + 1), positions.getY(i * 3 + 1), positions.getZ(i * 3 + 1));
            var v3 = new three_1.Vector3(positions.getX(i * 3 + 2), positions.getY(i * 3 + 2), positions.getZ(i * 3 + 2));
            var center = new three_1.Vector3().addVectors(v1, v2).add(v3).divideScalar(3);
            if (this.isStripe) {
                // For stripes: color the top half, white the bottom half
                // Use z-coordinate to determine stripe boundary
                if (center.z > -constants_1.R * 0.3 && center.z < constants_1.R * 0.3) {
                    // Middle stripe band - use base color
                    this.colorVerticesForFace(i, verticies, this.scaleNoise(color.r), this.scaleNoise(color.g), this.scaleNoise(color.b));
                }
                else {
                    // Top and bottom - white
                    this.colorVerticesForFace(i, verticies, white.r, white.g, white.b);
                }
            }
            else {
                // Solid ball - all same color
                this.colorVerticesForFace(i, verticies, this.scaleNoise(color.r), this.scaleNoise(color.g), this.scaleNoise(color.b));
            }
        }
        // Add number dots/markers for ball identification
        if (this.ballNumber !== undefined && this.ballNumber > 0 && this.ballNumber !== 8) {
            // Add contrasting dots to represent the ball number for other balls
            // Skip 8-ball - it should be fully black with no dots
            var dots = [0, 96, 111, 156, 186, 195].slice(0, Math.min(this.ballNumber, 6));
            var dotColor_1 = this.isStripe || baseColor === 0xFFD700 ? black : red;
            dots.forEach(function (i) {
                _this.colorVerticesForFace(i / 3, verticies, dotColor_1.r, dotColor_1.g, dotColor_1.b);
            });
        }
    };
    BallMesh.prototype.addToScene = function (scene) {
        scene.add(this.mesh);
        scene.add(this.shadow);
        scene.add(this.spinAxisArrow);
        scene.add(this.trace.line);
    };
    BallMesh.prototype.colorVerticesForFace = function (face, verticies, r, g, b) {
        verticies.setXYZ(face * 3 + 0, r, g, b);
        verticies.setXYZ(face * 3 + 1, r, g, b);
        verticies.setXYZ(face * 3 + 2, r, g, b);
    };
    BallMesh.prototype.scaleNoise = function (v) {
        return (1.0 - Math.random() * 0.25) * v;
    };
    BallMesh.ballModels = new Map();
    BallMesh.sharedGeometries = new Map();
    BallMesh.sharedMaterials = new Map();
    return BallMesh;
}());
exports.BallMesh = BallMesh;
//# sourceMappingURL=ballmesh.js.map