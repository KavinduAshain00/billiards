export class Hud {
  // Generic HUD base – no-op default implementations
  pingElement: HTMLDivElement | null = null

  constructor() {
    // Attempt to find ping element in DOM
    try {
      this.pingElement = document.getElementById("pingIndicator") as HTMLDivElement | null
    } catch (e) {
      this.pingElement = null
    }
  }

  updateBreak(_: number) {}
  updateGroups(_: string | null) {}

  updatePing(ms: number | null) {
    if (!this.pingElement) return
    if (ms === null || ms === undefined) {
      this.pingElement.textContent = "Ping: -- ms"
      return
    }
    this.pingElement.textContent = `Ping: ${ms} ms`
    // Color coding
    if (ms < 100) {
      this.pingElement.style.color = "#9ad3ac" // green
    } else if (ms < 200) {
      this.pingElement.style.color = "#ffd966" // yellow
    } else {
      this.pingElement.style.color = "#ff6b6b" // red
    }
  }
}

export class SnookerHud extends Hud {
  element: HTMLDivElement
  constructor() {
    super()
    this.element = this.getElement("snookerScore")
  }

  override updateBreak(score: number) {
    if (this.element) {
      if (score > 0) {
        this.element.innerHTML = "Break</br>" + score
      } else {
        this.element.innerHTML = ""
      }
    }
  }

  getElement(id): HTMLDivElement {
    return document.getElementById(id)! as HTMLDivElement
  }
}

export class EightBallHud extends Hud {
  breakElement: HTMLDivElement
  groupElement: HTMLDivElement
  constructor() {
    super()
    this.breakElement = this.getElement("eightBallBreak")
    this.groupElement = this.getElement("eightBallGroup")
    this.clear()
  }

  override updateBreak(score: number) {
    if (this.breakElement) {
      if (score > 0) {
        this.breakElement.innerHTML = `Break: ${score}`
      } else {
        this.breakElement.innerHTML = ""
      }
    }
  }

  override updateGroups(group: string | null) {
    if (!this.groupElement) return
    if (!group) {
      this.groupElement.innerHTML = "Table: Open"
    } else if (group === "solids") {
      this.groupElement.innerHTML = "You: Solids"
    } else {
      this.groupElement.innerHTML = "You: Stripes"
    }
  }

  clear() {
    this.updateBreak(0)
    this.updateGroups(null)
  }

  getElement(id): HTMLDivElement {
    return document.getElementById(id)! as HTMLDivElement
  }
}
