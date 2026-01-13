"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Assets = void 0;
var rulefactory_1 = require("../controller/rules/rulefactory");
var gltf_1 = require("../utils/gltf");
var sound_1 = require("./sound");
var tablemesh_1 = require("./tablemesh");
var cuemesh_1 = require("./cuemesh");
var tablegeometry_1 = require("./tablegeometry");
var Assets = /** @class */ (function () {
    function Assets(ruletype) {
        this.ballModels = new Map();
        this.loadingBalls = 0;
        this.rules = rulefactory_1.RuleFactory.create(ruletype, null);
        this.rules.tableGeometry();
    }
    Assets.prototype.loadFromWeb = function (ready) {
        var _this = this;
        this.ready = ready;
        this.sound = new sound_1.Sound(true);
        (0, gltf_1.importGltf)("models/background.gltf", function (m) {
            _this.background = m.scene;
            _this.done();
        });
        (0, gltf_1.importGltf)(this.rules.asset(), function (m) {
            _this.table = m.scene;
            tablemesh_1.TableMesh.mesh = m.scene.children[0];
            _this.done();
        });
        // Load cue ball model for 8-ball
        if (this.rules.rulename === "eightball") {
            (0, gltf_1.importGltf)("pooltool_pocket/cue.glb", function (m) {
                _this.cue = m;
                cuemesh_1.CueMesh.mesh = m.scene.children[0];
                // Also store cue ball model as ball 0
                _this.ballModels.set(0, m.scene.children[0]);
                _this.done();
            });
            // Load individual ball models 1-15
            this.loadingBalls = 15;
            var _loop_1 = function (i) {
                (0, gltf_1.importGltf)("pooltool_pocket/".concat(i, ".glb"), function (m) {
                    _this.ballModels.set(i, m.scene.children[0]);
                    _this.loadingBalls--;
                    _this.done();
                });
            };
            for (var i = 1; i <= 15; i++) {
                _loop_1(i);
            }
        }
        else {
            (0, gltf_1.importGltf)("models/cue.gltf", function (m) {
                _this.cue = m;
                cuemesh_1.CueMesh.mesh = m.scene.children[0];
                _this.done();
            });
        }
    };
    Assets.prototype.creatLocal = function () {
        this.sound = new sound_1.Sound(false);
        tablemesh_1.TableMesh.mesh = new tablemesh_1.TableMesh().generateTable(tablegeometry_1.TableGeometry.hasPockets);
        this.table = tablemesh_1.TableMesh.mesh;
    };
    Assets.localAssets = function (ruletype) {
        if (ruletype === void 0) { ruletype = ""; }
        var assets = new Assets(ruletype);
        assets.creatLocal();
        return assets;
    };
    Assets.prototype.done = function () {
        var ballsReady = this.rules.rulename === "eightball" ? this.loadingBalls === 0 : true;
        if (this.background && this.table && this.cue && ballsReady) {
            this.ready();
        }
    };
    return Assets;
}());
exports.Assets = Assets;
//# sourceMappingURL=assets.js.map