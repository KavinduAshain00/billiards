/**
 * Disconnection Popup UI for multiplayer game
 * Shows "Opponent disconnected" with countdown timer for reconnection
 */

export class DisconnectionPopup {
  private overlay: HTMLDivElement | null = null
  private popup: HTMLDivElement | null = null
  private timerElement: HTMLSpanElement | null = null
  private messageElement: HTMLDivElement | null = null
  private playerNameElement: HTMLSpanElement | null = null
  private isVisible: boolean = false

  constructor() {
    this.createElements()
  }

  private createElements(): void {
    // Create overlay
    this.overlay = document.createElement("div")
    this.overlay.id = "disconnectionOverlay"
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10001;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `

    // Create popup container
    this.popup = document.createElement("div")
    this.popup.id = "disconnectionPopup"
    this.popup.style.cssText = `
      background: linear-gradient(135deg, #2e1a1a 0%, #3e1616 100%);
      border-radius: 16px;
      padding: 40px 50px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 100, 100, 0.1);
      border: 1px solid rgba(255, 100, 100, 0.3);
      min-width: 350px;
      animation: popupSlideIn 0.3s ease-out;
    `

    // Add keyframe animation if not already added
    if (!document.getElementById("disconnectionPopupStyles")) {
      const style = document.createElement("style")
      style.id = "disconnectionPopupStyles"
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
        @keyframes warningPulse {
          0%, 100% { 
            box-shadow: 0 0 10px rgba(255, 100, 100, 0.3);
          }
          50% { 
            box-shadow: 0 0 30px rgba(255, 100, 100, 0.6);
          }
        }
      `
      document.head.appendChild(style)
    }

    // Warning icon
    const iconContainer = document.createElement("div")
    iconContainer.style.cssText = `
      margin-bottom: 20px;
    `
    
    const warningIcon = document.createElement("div")
    warningIcon.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff6464" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `
    warningIcon.style.cssText = `
      animation: warningPulse 2s ease-in-out infinite;
      display: inline-block;
    `
    iconContainer.appendChild(warningIcon)
    this.popup.appendChild(iconContainer)

    // Title
    const title = document.createElement("h2")
    title.textContent = "Connection Lost"
    title.style.cssText = `
      color: #ff6464;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 10px 0;
    `
    this.popup.appendChild(title)

    // Player name message
    const playerMessage = document.createElement("div")
    playerMessage.style.cssText = `
      color: #fff;
      font-size: 16px;
      margin-bottom: 25px;
    `
    this.playerNameElement = document.createElement("span")
    this.playerNameElement.style.cssText = `
      color: #ffcc64;
      font-weight: 600;
    `
    playerMessage.appendChild(this.playerNameElement)
    const disconnectedText = document.createTextNode(" has disconnected")
    playerMessage.appendChild(disconnectedText)
    this.popup.appendChild(playerMessage)

    // Timer display
    const timerContainer = document.createElement("div")
    timerContainer.style.cssText = `
      margin: 25px 0;
      padding: 20px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
    `

    const timerLabel = document.createElement("div")
    timerLabel.textContent = "Waiting for reconnection"
    timerLabel.style.cssText = `
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      margin-bottom: 12px;
    `

    this.timerElement = document.createElement("span")
    this.timerElement.style.cssText = `
      font-size: 56px;
      font-weight: bold;
      color: #ff6464;
      text-shadow: 0 0 20px rgba(255, 100, 100, 0.5);
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
    this.messageElement.textContent = "Game will resume when player reconnects..."
    this.popup.appendChild(this.messageElement)

    // Info about forfeit
    const forfeitInfo = document.createElement("div")
    forfeitInfo.style.cssText = `
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    `
    forfeitInfo.textContent = "If the player doesn't reconnect in time, they will forfeit."
    this.popup.appendChild(forfeitInfo)

    this.overlay.appendChild(this.popup)
    document.body.appendChild(this.overlay)
  }

  /**
   * Show the disconnection popup with player name
   */
  show(playerName: string, secondsLeft: number = 60): void {
    if (this.overlay && !this.isVisible) {
      if (this.playerNameElement) {
        this.playerNameElement.textContent = playerName
      }
      this.updateTimer(secondsLeft)
      this.overlay.style.display = "flex"
      this.isVisible = true
    }
  }

  /**
   * Hide the disconnection popup
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
        this.timerElement.style.color = "#ff3333"
        this.timerElement.style.textShadow = "0 0 30px rgba(255, 50, 50, 0.7)"
      } else if (seconds <= 30) {
        this.timerElement.style.color = "#ff6464"
        this.timerElement.style.textShadow = "0 0 20px rgba(255, 100, 100, 0.5)"
      } else {
        this.timerElement.style.color = "#ffcc64"
        this.timerElement.style.textShadow = "0 0 20px rgba(255, 200, 100, 0.5)"
      }
    }
  }

  /**
   * Set the status message
   */
  setMessage(message: string): void {
    if (this.messageElement) {
      this.messageElement.textContent = message
    }
  }

  /**
   * Show reconnected state briefly
   */
  showReconnected(playerName: string): void {
    if (this.popup) {
      // Change style to success
      this.popup.style.background = "linear-gradient(135deg, #1a2e1a 0%, #163e16 100%)"
      this.popup.style.border = "1px solid rgba(100, 255, 100, 0.3)"
      this.popup.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(100, 255, 100, 0.1)"
    }
    
    if (this.playerNameElement) {
      this.playerNameElement.textContent = playerName
      this.playerNameElement.style.color = "#64ff96"
    }
    
    this.setMessage("Reconnected! Game resuming...")
    
    if (this.timerElement) {
      this.timerElement.textContent = "✓"
      this.timerElement.style.color = "#64ff96"
      this.timerElement.style.fontSize = "72px"
    }

    // Hide after a short delay
    setTimeout(() => {
      this.hide()
      this.resetStyle()
    }, 2000)
  }

  /**
   * Reset style back to warning state
   */
  private resetStyle(): void {
    if (this.popup) {
      this.popup.style.background = "linear-gradient(135deg, #2e1a1a 0%, #3e1616 100%)"
      this.popup.style.border = "1px solid rgba(255, 100, 100, 0.3)"
      this.popup.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 100, 100, 0.1)"
    }
    
    if (this.playerNameElement) {
      this.playerNameElement.style.color = "#ffcc64"
    }
    
    if (this.timerElement) {
      this.timerElement.style.fontSize = "56px"
    }
  }

  /**
   * Show forfeit message
   */
  showForfeit(forfeitPlayerName: string): void {
    if (this.playerNameElement) {
      this.playerNameElement.textContent = forfeitPlayerName
    }
    
    this.setMessage("Player did not reconnect in time. You win!")
    
    if (this.timerElement) {
      this.timerElement.textContent = "🏆"
      this.timerElement.style.fontSize = "72px"
      this.timerElement.style.color = "#64ff96"
    }

    // Update styling to victory
    if (this.popup) {
      this.popup.style.background = "linear-gradient(135deg, #1a2e1a 0%, #163e16 100%)"
      this.popup.style.border = "1px solid rgba(100, 255, 100, 0.3)"
    }

    // Hide after a longer delay
    setTimeout(() => {
      this.hide()
      this.resetStyle()
    }, 5000)
  }

  /**
   * Check if popup is currently visible
   */
  isShowing(): boolean {
    return this.isVisible
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
    this.playerNameElement = null
    this.isVisible = false
  }
}
