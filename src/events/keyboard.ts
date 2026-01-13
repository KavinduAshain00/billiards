import { Input } from "./input"
import interact from "interactjs"

/**
 * Input System for Billiards
 * 
 * Handles keyboard and mouse/touch input for cue control:
 * - Keyboard: Arrow keys for fine control, Space for power/shoot
 * - Mouse/Touch drag: 
 *   - Horizontal (X): Rotate cue aim direction
 *   - Vertical (Y): Adjust shot power (drag up = more power)
 * 
 * The input produces events with elapsed time (t) for smooth, frame-rate independent control.
 */
export class Keyboard {
  pressed = {}
  released = {}
  
  // Accumulated mouse movement for current frame
  private dragX: number = 0
  private dragY: number = 0
  private isDragging: boolean = false

  getEvents() {
    const keys = Object.keys(this.pressed)
      .filter((key) => !/Shift/.test(key))
      .filter((key) => !/Control/.test(key))
    const shift = Object.keys(this.pressed).some((key) => /Shift/.test(key))
    const control = Object.keys(this.pressed).some((key) => /Control/.test(key))
    const result: Input[] = []

    keys.forEach((k) => {
      const t = performance.now() - this.pressed[k]
      result.push(new Input(control ? t / 3 : t, shift ? "Shift" + k : k))
      if (k != "Space") {
        this.pressed[k] = performance.now()
      }
    })

    Object.keys(this.released).forEach((key) =>
      result.push(new Input(this.released[key], key + "Up"))
    )
    
    // Process accumulated drag movements
    if (this.isDragging) {
      // X movement: cue rotation (horizontal drag)
      if (Math.abs(this.dragX) > 1.0) {
        result.push(new Input(this.dragX, "dragRotate"))
      }
      // Y movement: power adjustment (vertical drag)
      if (Math.abs(this.dragY) > 1.0) {
        result.push(new Input(this.dragY, "dragPower"))
      }
      // Reset accumulated drag
      this.dragX = 0
      this.dragY = 0
    }

    this.released = {}
    return result
  }

  constructor(element: HTMLCanvasElement) {
    this.addHandlers(element)
    if (!/Android|iPhone/i.test(navigator.userAgent)) {
      element.contentEditable = "true"
    }
  }

  keydown = (e) => {
    if (this.pressed[e.code] == null) {
      this.pressed[e.code] = performance.now()
    }
    e.stopImmediatePropagation()
    if (e.key !== "F12") {
      e.preventDefault()
    }
  }

  keyup = (e) => {
    this.released[e.code] = performance.now() - this.pressed[e.code]
    delete this.pressed[e.code]
    e.stopImmediatePropagation()
    if (e.key !== "F12") {
      e.preventDefault()
    }
  }

  /**
   * Handle mouse/touch drag events
   * Maps screen coordinates to game controls:
   * - Drag left/right: Rotate cue
   * - Drag up/down: Adjust power
   */
  private onDragMove = (e) => {
    this.isDragging = true
    
    // Sensitivity modifiers (reduced for smoother control)
    const topHalf = e.client.y < e.rect.height / 2
    const finePrecision = topHalf || e.ctrlKey
    // Decreased overall sensitivity: default 0.5, fine precision 0.25
    const sensitivity = finePrecision ? 0.25 : 0.5
    
    // Accumulate drag movement
    // X: horizontal drag for rotation
    this.dragX += e.dx * sensitivity
    // Y: vertical drag for power (inverted: drag up = negative dy = increase power)
    this.dragY += -e.dy * sensitivity
  }
  
  private onDragEnd = () => {
    this.isDragging = false
  }

  private addHandlers(element: HTMLCanvasElement) {
    element.addEventListener("keydown", this.keydown)
    element.addEventListener("keyup", this.keyup)
    element.focus()

    interact(element).draggable({
      listeners: {
        move: this.onDragMove,
        end: this.onDragEnd,
      },
    })
    
    interact(element).gesturable({
      onmove: (e) => {
        // Gestures (pinch/rotate) - reduce sensitivity
        const gestureEvent = { ...e, dx: e.dx / 3, dy: e.dy / 3 }
        this.onDragMove(gestureEvent)
      },
      onend: this.onDragEnd,
    })
  }
}
