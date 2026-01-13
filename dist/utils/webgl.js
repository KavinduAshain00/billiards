"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderer = renderer;
var three_1 = require("three");
function renderer(element) {
    if (typeof process !== "undefined") {
        return undefined;
    }
    var renderer = new three_1.WebGLRenderer({ antialias: false });
    renderer.shadowMap.enabled = false;
    renderer.autoClear = false;
    renderer.setSize(element.offsetWidth, element.offsetHeight);
    renderer.setPixelRatio(window.devicePixelRatio * 0.75);
    element.appendChild(renderer.domElement);
    return renderer;
}
//# sourceMappingURL=webgl.js.map