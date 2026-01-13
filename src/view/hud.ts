export class Hud {
  // Generic HUD base – no-op default implementations
  updateBreak(_: number) {}
  updateGroups(_: string | null) {}
}

export class SnookerHud extends Hud {
  element: HTMLDivElement
  constructor() {
    super()
    this.element = this.getElement("snookerScore")
  }

  updateBreak(score: number) {
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

  updateBreak(score: number) {
    if (this.breakElement) {
      if (score > 0) {
        this.breakElement.innerHTML = `Break: ${score}`
      } else {
        this.breakElement.innerHTML = ""
      }
    }
  }

  updateGroups(group: string | null) {
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
