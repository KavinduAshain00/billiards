/**
 * Waiting Popup UI for multiplayer game
 * Shows "Waiting for opponent" with countdown timer
 */

export class WaitingPopup {
  private overlay: HTMLDivElement | null = null
  private popup: HTMLDivElement | null = null
  private timerElement: HTMLSpanElement | null = null
  private messageElement: HTMLDivElement | null = null
  private playersElement: HTMLDivElement | null = null
  private isVisible: boolean = false

  constructor() {
    this.createElements()
  }

  private createElements(): void {
    // Create overlay
    this.overlay = document.createElement("div")
    this.overlay.id = "waitingOverlay"
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `

    // Create popup container
    this.popup = document.createElement("div")
    this.popup.id = "waitingPopup"
    this.popup.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      padding: 40px 50px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(100, 200, 255, 0.1);
      border: 1px solid rgba(100, 200, 255, 0.2);
      min-width: 350px;
      animation: popupSlideIn 0.3s ease-out;
    `

    // Add keyframe animation
    const style = document.createElement("style")
    style.textContent = `
      @keyframes popupSlideIn {
        from {
          transform: translateY(-30px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)

    // Title with spinner
    const titleContainer = document.createElement("div")
    titleContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-bottom: 20px;
    `

    const spinner = document.createElement("div")
    spinner.style.cssText = `
      width: 24px;
      height: 24px;
      border: 3px solid rgba(100, 200, 255, 0.3);
      border-top-color: #64c8ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `

    const title = document.createElement("h2")
    title.textContent = "Waiting for Opponent"
    title.style.cssText = `
      color: #fff;
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    `

    titleContainer.appendChild(spinner)
    titleContainer.appendChild(title)
    this.popup.appendChild(titleContainer)

    // Players list
    this.playersElement = document.createElement("div")
    this.playersElement.id = "waitingPlayers"
    this.playersElement.style.cssText = `
      margin: 20px 0;
      padding: 15px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
    `
    this.popup.appendChild(this.playersElement)

    // Timer display
    const timerContainer = document.createElement("div")
    timerContainer.style.cssText = `
      margin: 25px 0;
    `

    const timerLabel = document.createElement("div")
    timerLabel.textContent = "Time remaining"
    timerLabel.style.cssText = `
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      margin-bottom: 8px;
    `

    this.timerElement = document.createElement("span")
    this.timerElement.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: #64c8ff;
      text-shadow: 0 0 20px rgba(100, 200, 255, 0.5);
    `
    this.timerElement.textContent = "60"

    const timerUnit = document.createElement("span")
    timerUnit.textContent = " seconds"
    timerUnit.style.cssText = `
      font-size: 16px;
      color: rgba(255, 255, 255, 0.6);
    `

    timerContainer.appendChild(timerLabel)
    timerContainer.appendChild(this.timerElement)
    timerContainer.appendChild(timerUnit)
    this.popup.appendChild(timerContainer)

    // Message area
    this.messageElement = document.createElement("div")
    this.messageElement.style.cssText = `
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      margin-top: 15px;
      animation: pulse 2s ease-in-out infinite;
    `
    this.messageElement.textContent = "Share the game link with your opponent..."
    this.popup.appendChild(this.messageElement)

    this.overlay.appendChild(this.popup)
    document.body.appendChild(this.overlay)
  }

  /**
   * Show the waiting popup
   */
  show(): void {
    if (this.overlay && !this.isVisible) {
      this.overlay.style.display = "flex"
      this.isVisible = true
    }
  }

  /**
   * Hide the waiting popup
   */
  hide(): void {
    if (this.overlay && this.isVisible) {
      this.overlay.style.display = "none"
      this.isVisible = false
    }
  }

  /**
   * Update the countdown timer
   */
  updateTimer(seconds: number): void {
    if (this.timerElement) {
      this.timerElement.textContent = seconds.toString()
      
      // Change color when time is low
      if (seconds <= 10) {
        this.timerElement.style.color = "#ff6464"
        this.timerElement.style.textShadow = "0 0 20px rgba(255, 100, 100, 0.5)"
      } else if (seconds <= 30) {
        this.timerElement.style.color = "#ffcc64"
        this.timerElement.style.textShadow = "0 0 20px rgba(255, 200, 100, 0.5)"
      } else {
        this.timerElement.style.color = "#64c8ff"
        this.timerElement.style.textShadow = "0 0 20px rgba(100, 200, 255, 0.5)"
      }
    }
  }

  /**
   * Update the players list
   */
  updatePlayers(players: Array<{ clientId: string; playerName: string }>): void {
    if (!this.playersElement) return

    this.playersElement.innerHTML = ""

    const header = document.createElement("div")
    header.textContent = `Players (${players.length}/2)`
    header.style.cssText = `
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `
    this.playersElement.appendChild(header)

    players.forEach((player, index) => {
      const playerDiv = document.createElement("div")
      playerDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        margin: 5px 0;
        background: rgba(100, 200, 255, 0.1);
        border-radius: 8px;
        border-left: 3px solid ${index === 0 ? "#64c8ff" : "#64ff96"};
      `

      const avatar = document.createElement("div")
      avatar.textContent = player.playerName.charAt(0).toUpperCase()
      avatar.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${index === 0 ? "linear-gradient(135deg, #64c8ff, #6496ff)" : "linear-gradient(135deg, #64ff96, #64ffc8)"};
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #1a1a2e;
      `

      const name = document.createElement("span")
      name.textContent = player.playerName
      name.style.cssText = `
        color: #fff;
        font-weight: 500;
      `

      const status = document.createElement("span")
      status.textContent = "Ready"
      status.style.cssText = `
        margin-left: auto;
        color: #64ff96;
        font-size: 12px;
      `

      playerDiv.appendChild(avatar)
      playerDiv.appendChild(name)
      playerDiv.appendChild(status)
      this.playersElement.appendChild(playerDiv)
    })

    // Show waiting slot if only 1 player
    if (players.length < 2) {
      const waitingSlot = document.createElement("div")
      waitingSlot.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        margin: 5px 0;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border-left: 3px solid rgba(255, 255, 255, 0.2);
        border-style: dashed;
      `

      const avatar = document.createElement("div")
      avatar.textContent = "?"
      avatar.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.4);
      `

      const name = document.createElement("span")
      name.textContent = "Waiting for opponent..."
      name.style.cssText = `
        color: rgba(255, 255, 255, 0.4);
        font-style: italic;
      `

      waitingSlot.appendChild(avatar)
      waitingSlot.appendChild(name)
      this.playersElement.appendChild(waitingSlot)
    }
  }

  /**
   * Update the message text
   */
  setMessage(message: string): void {
    if (this.messageElement) {
      this.messageElement.textContent = message
    }
  }

  /**
   * Show game starting transition
   */
  showGameStarting(): void {
    if (!this.popup) return

    this.popup.innerHTML = ""

    const title = document.createElement("h2")
    title.textContent = "🎱 Game Starting!"
    title.style.cssText = `
      color: #64ff96;
      font-size: 28px;
      margin-bottom: 20px;
    `

    const message = document.createElement("div")
    message.textContent = "Both players connected. Get ready to play!"
    message.style.cssText = `
      color: rgba(255, 255, 255, 0.8);
      font-size: 16px;
    `

    this.popup.appendChild(title)
    this.popup.appendChild(message)

    // Auto-hide after 2 seconds
    setTimeout(() => this.hide(), 2000)
  }

  /**
   * Show timeout message
   */
  showTimeout(message: string): void {
    if (!this.popup) return

    this.popup.innerHTML = ""

    const title = document.createElement("h2")
    title.textContent = "⏰ Time's Up"
    title.style.cssText = `
      color: #ff6464;
      font-size: 28px;
      margin-bottom: 20px;
    `

    const msg = document.createElement("div")
    msg.textContent = message
    msg.style.cssText = `
      color: rgba(255, 255, 255, 0.8);
      font-size: 16px;
      margin-bottom: 20px;
    `

    const button = document.createElement("button")
    button.textContent = "Return to Lobby"
    button.style.cssText = `
      background: linear-gradient(135deg, #64c8ff, #6496ff);
      border: none;
      padding: 12px 30px;
      border-radius: 25px;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    `
    button.onclick = () => {
      window.location.href = "/"
    }
    button.onmouseover = () => {
      button.style.transform = "scale(1.05)"
    }
    button.onmouseout = () => {
      button.style.transform = "scale(1)"
    }

    this.popup.appendChild(title)
    this.popup.appendChild(msg)
    this.popup.appendChild(button)
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.overlay = null
    this.popup = null
    this.timerElement = null
    this.messageElement = null
    this.playersElement = null
  }
}
