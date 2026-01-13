import { expect } from "chai"
import { Container } from "../../src/container/container"
import { Assets } from "../../src/view/assets"
import { EightBall } from "../../src/controller/rules/eightball"
import { Vector3 } from "three"
import { R } from "../../src/model/physics/constants"
import { TableGeometry } from "../../src/view/tablegeometry"

describe("EightBall placeBall", () => {
  let container: Container
  let rules: EightBall

  beforeEach(() => {
    Container // ensure import for types
    container = new Container(undefined, (_) => {}, Assets.localAssets("eightball"), "eightball")
    rules = container.rules as EightBall
  })

  it("restricts placement to the kitchen on the initial break", () => {
    // ensure we are on the initial break
    rules.isBreakShot = true

    const outside = new Vector3(TableGeometry.tableX, 0, 0)
    const placed = rules.placeBall(outside)

    // X must be <= -TableGeometry.X / 2 (behind head string)
    expect(placed.x).to.be.at.most(-TableGeometry.X / 2)
  })

  it("allows placing cue ball anywhere after the initial shot", () => {
    rules.isBreakShot = false

    const outside = new Vector3(TableGeometry.tableX, 0, 0)
    const placed = rules.placeBall(outside)

    // Should be clamped to the table bounds but allow positive X
    expect(placed.x).to.be.at.least(0)
    expect(placed.x).to.equal(outside.x)
  })

  it("default placeBall returns kitchen on initial break and current cue pos otherwise", () => {
    // initial break
    rules.isBreakShot = true
    const defBreak = rules.placeBall()
    expect(defBreak.x).to.be.at.most(-TableGeometry.X / 2)

    // after initial shot
    rules.isBreakShot = false
    // move cue ball to a known place
    container.table.cueball.pos.set(1.23, 4.56, 0)
    const defAfter = rules.placeBall()
    expect(defAfter.x).to.equal(container.table.cueball.pos.x)
    expect(defAfter.y).to.equal(container.table.cueball.pos.y)
  })

  it("resets cueball to rack spot when fouled (cue potted)", () => {
    rules.isBreakShot = false
    const table = container.table
    const outcome = [require("../../src/model/outcome").Outcome.pot(table.cueball, 1)]

    const controller = rules.update(outcome)
    // Should transition to PlaceBall for singleplayer
    const PlaceBallClass = require("../../src/controller/placeball").PlaceBall
    expect(controller).to.be.instanceof(PlaceBallClass)
    // cue ball must have been moved to the rack spot
    const rack = require("../../src/utils/rack").Rack
    expect(table.cueball.pos.x).to.equal(rack.spot.x)
    expect(table.cueball.pos.y).to.equal(rack.spot.y)
  })

  it("resets cueball to rack spot when fouled (illegal shot)", () => {
    rules.isBreakShot = false
    const table = container.table
    const outcome: any[] = [] // no collisions -> illegal shot

    const controller = rules.update(outcome)
    const PlaceBallClass = require("../../src/controller/placeball").PlaceBall
    expect(controller).to.be.instanceof(PlaceBallClass)
    const rack = require("../../src/utils/rack").Rack
    expect(table.cueball.pos.x).to.equal(rack.spot.x)
    expect(table.cueball.pos.y).to.equal(rack.spot.y)
  })
})
