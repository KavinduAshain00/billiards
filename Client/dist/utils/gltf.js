"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportGltf = exportGltf;
exports.importGltf = importGltf;
exports.downloadObjectAsJson = downloadObjectAsJson;
var GLTFExporter_js_1 = require("three/examples/jsm/exporters/GLTFExporter.js");
var GLTFLoader_js_1 = require("three/examples/jsm/loaders/GLTFLoader.js");
var constants_1 = require("../model/physics/constants");
var onError = console.error;
/* istanbul ignore next */
function exportGltf(scene) {
    var exporter = new GLTFExporter_js_1.GLTFExporter();
    exporter.parse(scene, function (gltf) {
        console.log(gltf);
        downloadObjectAsJson(gltf, "scene.gltf");
    }, onError);
}
/* istanbul ignore next */
function importGltf(path, ready) {
    var loader = new GLTFLoader_js_1.GLTFLoader();
    loader.load(path, function (gltf) {
        gltf.scene.scale.set(constants_1.R / 0.5, constants_1.R / 0.5, constants_1.R / 0.5);
        gltf.scene.matrixAutoUpdate = false;
        gltf.scene.updateMatrix();
        gltf.scene.updateMatrixWorld();
        gltf.scene.name = path;
        ready(gltf);
    }, function (xhr) { return console.log(path + " " + xhr.loaded + " bytes loaded"); }, onError);
}
/* istanbul ignore next */
function downloadObjectAsJson(exportObj, exportName) {
    var downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(exportObj)));
    downloadAnchorNode.setAttribute("download", exportName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}
//# sourceMappingURL=gltf.js.map