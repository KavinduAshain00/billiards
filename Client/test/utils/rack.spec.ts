import { Rack } from "../../src/utils/rack"

describe("Rack.eightBall", () => {
  test("places 8-ball at the center and includes all balls", () => {
    const balls = Rack.eightBall()
    expect(balls.length).toBe(16) // cue + 15

    const numbers = balls.map((b) => b.ballmesh.ballNumber)
    // cue ball should be 0
    expect(numbers[0]).toBe(0)
    // center of triangle should be at index 1 + 3 = 4
    expect(numbers.indexOf(8)).toBe(4)

    // contains all numbers 0..15 exactly once
    const sorted = numbers.slice().sort((a, b) => a - b)
    expect(sorted).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })
})
