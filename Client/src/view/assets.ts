import { Mesh } from "three"
import { RuleFactory } from "../controller/rules/rulefactory"
import { importGltf } from "../utils/gltf"
import { Rules } from "../controller/rules/rules"
import { Sound } from "./sound"
import { TableMesh } from "./tablemesh"
import { CueMesh } from "./cuemesh"
import { TableGeometry } from "./tablegeometry"

export class Assets {
  ready
  rules: Rules
  background: Mesh
  table: Mesh
  cue: Mesh
  ballModels: Map<number, Mesh> = new Map()
  loadingBalls = 0

  sound: Sound

  constructor(ruletype) {
    this.rules = RuleFactory.create(ruletype, null)
    this.rules.tableGeometry()
  }

  loadFromWeb(ready) {
    this.ready = ready
    this.sound = new Sound(true)
    importGltf("models/background.gltf", (m) => {
      this.background = m.scene
      this.done()
    })
    importGltf(this.rules.asset(), (m) => {
      this.table = m.scene
      TableMesh.mesh = m.scene.children[0]
      this.done()
    })
    
    // Load cue ball model for 8-ball
    if (this.rules.rulename === "eightball") {
      importGltf("pooltool_pocket/cue.glb", (m) => {
        this.cue = m
        CueMesh.mesh = m.scene.children[0]
        // Also store cue ball model as ball 0
        this.ballModels.set(0, m.scene.children[0] as Mesh)
        this.done()
      })
      
      // Load individual ball models 1-15
      this.loadingBalls = 15
      for (let i = 1; i <= 15; i++) {
        importGltf(`pooltool_pocket/${i}.glb`, (m) => {
          this.ballModels.set(i, m.scene.children[0] as Mesh)
          this.loadingBalls--
          this.done()
        })
      }
    } else {
      importGltf("models/cue.gltf", (m) => {
        this.cue = m
        CueMesh.mesh = m.scene.children[0]
        this.done()
      })
    }
  }

  creatLocal() {
    this.sound = new Sound(false)
    TableMesh.mesh = new TableMesh().generateTable(TableGeometry.hasPockets)
    this.table = TableMesh.mesh
  }

  static localAssets(ruletype = "") {
    const assets = new Assets(ruletype)
    assets.creatLocal()
    return assets
  }

  private done() {
    const ballsReady = this.rules.rulename === "eightball" ? this.loadingBalls === 0 : true
    if (this.background && this.table && this.cue && ballsReady) {
      this.ready()
    }
  }
}
