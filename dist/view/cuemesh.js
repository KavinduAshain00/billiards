"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CueMesh = void 0;
var constants_1 = require("../model/physics/constants");
var utils_1 = require("../utils/utils");
var three_1 = require("three");
var CueMesh = /** @class */ (function () {
    function CueMesh() {
    }
    CueMesh.indicateValid = function (valid) {
        CueMesh.placermaterial.color.setHex(valid ? 0xccffcc : 0xff0000);
    };
    CueMesh.createHelper = function () {
        var geometry = new three_1.CylinderGeometry(constants_1.R, constants_1.R, (constants_1.R * 30) / 0.5, 12, 1, true);
        var mesh = new three_1.Mesh(geometry, this.helpermaterial);
        mesh.geometry
            .applyMatrix4(new three_1.Matrix4().identity().makeRotationAxis(utils_1.up, -Math.PI / 2))
            .applyMatrix4(new three_1.Matrix4()
            .identity()
            .makeTranslation((constants_1.R * 15) / 0.5, 0, (-constants_1.R * 0.01) / 0.5));
        mesh.visible = false;
        mesh.renderOrder = -1;
        mesh.material.depthTest = false;
        return mesh;
    };
    CueMesh.createPlacer = function () {
        var geometry = new three_1.CylinderGeometry((constants_1.R * 0.01) / 0.5, constants_1.R, constants_1.R, 4);
        var mesh = new three_1.Mesh(geometry, CueMesh.placermaterial);
        mesh.geometry
            .applyMatrix4(new three_1.Matrix4()
            .identity()
            .makeRotationAxis(new three_1.Vector3(1, 0, 0), -Math.PI / 2))
            .applyMatrix4(new three_1.Matrix4().identity().makeTranslation(0, 0, (constants_1.R * 0.7) / 0.5));
        mesh.visible = false;
        return mesh;
    };
    CueMesh.createCue = function (tip, but, length) {
        var geometry = new three_1.CylinderGeometry(tip, but, length, 11);
        var mesh = new three_1.Mesh(geometry, CueMesh.material);
        mesh.castShadow = false;
        var tilt = 0.17;
        mesh.geometry
            .applyMatrix4(new three_1.Matrix4()
            .identity()
            .makeRotationAxis(new three_1.Vector3(1.0, 0.0, 0.0), -tilt))
            .applyMatrix4(new three_1.Matrix4().identity().makeRotationAxis(utils_1.up, -Math.PI / 2))
            .applyMatrix4(new three_1.Matrix4()
            .identity()
            .makeTranslation(-length / 2 - constants_1.R, 0, (length / 2) * Math.sin(tilt) + constants_1.R * 0.25));
        return mesh;
    };
    CueMesh.material = new three_1.MeshPhongMaterial({
        color: 0x885577,
        wireframe: false,
        flatShading: false,
    });
    CueMesh.placermaterial = new three_1.MeshPhongMaterial({
        color: 0xccffcc,
        wireframe: false,
        flatShading: false,
        transparent: true,
        opacity: 0.5,
    });
    CueMesh.helpermaterial = new three_1.ShaderMaterial({
        uniforms: {
            lightDirection: { value: new three_1.Vector3(0, 0, 1) },
        },
        vertexShader: "\n      varying vec2 vUv;\n      varying vec3 vNormal;  \n      void main() {\n        vNormal = normal;\n        vUv = uv;\n        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);\n      }\n    ",
        fragmentShader: "\n      varying vec2 vUv;\n      varying vec3 vNormal;\n      uniform vec3 lightDirection;\n      void main() {\n        float intensity = dot(vNormal, lightDirection);\n        vec3 color = vec3(1.0, 1.0, 1.0);\n        vec3 finalColor = color * intensity;\n        gl_FragColor = vec4(finalColor, 0.05 * (1.0-vUv.y));\n      }\n    ",
        wireframe: false,
        transparent: true,
    });
    return CueMesh;
}());
exports.CueMesh = CueMesh;
//# sourceMappingURL=cuemesh.js.map