export class Hud {
  element: HTMLDivElement
  playerYouName: HTMLDivElement | null = null
  playerOppName: HTMLDivElement | null = null
  playerYouGroup: HTMLDivElement | null = null
  playerOppGroup: HTMLDivElement | null = null
  playerYouPots: HTMLDivElement | null = null
  playerOppPots: HTMLDivElement | null = null

  constructor() {
    this.element = this.getElement("snookerScore")
    this.playerYouName = document.getElementById("playerYouName") as HTMLDivElement
    this.playerOppName = document.getElementById("playerOppName") as HTMLDivElement
    this.playerYouGroup = document.getElementById("playerYouGroup") as HTMLDivElement
    this.playerOppGroup = document.getElementById("playerOppGroup") as HTMLDivElement
    this.playerYouPots = document.getElementById("playerYouPots") as HTMLDivElement
    this.playerOppPots = document.getElementById("playerOppPots") as HTMLDivElement
  }

  updateBreak(score) {
    // Keep backwards compatible with snooker code
    if (this.element) {
      if (score > 0) {
        this.element.innerHTML = "Break</br>" + score
      } else {
        this.element.innerHTML = ""
      }
    }
    // Also update my pots display for consistency
    this.updateMyPots(score)
  }

  setPlayers(myName: string, oppName: string) {
    if (this.playerYouName) this.playerYouName.textContent = myName || "You"
    if (this.playerOppName) this.playerOppName.textContent = oppName || "Opponent"
  }

  setMyGroup(group: string) {
    if (this.playerYouGroup) this.playerYouGroup.textContent = group || ""
  }

  setOpponentGroup(group: string) {
    if (this.playerOppGroup) this.playerOppGroup.textContent = group || ""
  }

  updateMyPots(count: number) {
    if (this.playerYouPots) this.playerYouPots.textContent = String(count || 0)
  }

  updateOpponentPots(count: number) {
    if (this.playerOppPots) this.playerOppPots.textContent = String(count || 0)
  }

  updateActivePots(count: number) {
    const youPanel = document.getElementById("playerYou")
    if (youPanel && youPanel.classList.contains("active")) {
      if (this.playerYouPots) this.playerYouPots.textContent = String(count || 0)
    } else {
      if (this.playerOppPots) this.playerOppPots.textContent = String(count || 0)
    }
  }

  setCurrentTurn(isMyTurn: boolean) {
    const youPanel = document.getElementById("playerYou")
    const oppPanel = document.getElementById("playerOpp")
    if (youPanel) {
      if (isMyTurn) youPanel.classList.add("active")
      else youPanel.classList.remove("active")
    }
    if (oppPanel) {
      if (!isMyTurn) oppPanel.classList.add("active")
      else oppPanel.classList.remove("active")
    }
  }

  getElement(id): HTMLDivElement {
    return document.getElementById(id)! as HTMLDivElement
  }
}
