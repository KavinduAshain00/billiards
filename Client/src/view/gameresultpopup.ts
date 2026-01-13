/**
 * Game Result Popup UI for multiplayer game
 * Shows "You Win!" or "You Lose" with the reason
 */

export class GameResultPopup {
  private overlay: HTMLDivElement | null = null
  private popup: HTMLDivElement | null = null
  private titleElement: HTMLHeadingElement | null = null
  private reasonElement: HTMLDivElement | null = null
  private isVisible: boolean = false

  constructor() {
    this.createElements()
  }

  private createElements(): void {
    // Create overlay
    this.overlay = document.createElement("div")
    this.overlay.id = "gameResultOverlay"
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10002;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `

    // Create popup container
    this.popup = document.createElement("div")
    this.popup.id = "gameResultPopup"
    this.popup.style.cssText = `
      background: linear-gradient(135deg, #1a2e1a 0%, #163e16 100%);
      border-radius: 20px;
      padding: 50px 60px;
      text-align: center;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(100, 255, 100, 0.15);
      border: 2px solid rgba(100, 255, 100, 0.4);
      min-width: 400px;
      animation: resultPopupSlideIn 0.4s ease-out;
    `

    // Add keyframe animation
    if (!document.getElementById("gameResultPopupStyles")) {
      const style = document.createElement("style")
      style.id = "gameResultPopupStyles"
      style.textContent = `
        @keyframes resultPopupSlideIn {
          from {
            transform: scale(0.8) translateY(-50px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes trophyBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100px) rotate(720deg); opacity: 0; }
        }
        @keyframes sadShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `
      document.head.appendChild(style)
    }

    // Trophy/icon container
    const iconContainer = document.createElement("div")
    iconContainer.id = "gameResultIcon"
    iconContainer.style.cssText = `
      margin-bottom: 25px;
      font-size: 80px;
    `
    this.popup.appendChild(iconContainer)

    // Title (Win/Lose)
    this.titleElement = document.createElement("h1")
    this.titleElement.style.cssText = `
      font-size: 42px;
      font-weight: 700;
      margin: 0 0 15px 0;
      letter-spacing: 2px;
    `
    this.popup.appendChild(this.titleElement)

    // Reason text
    this.reasonElement = document.createElement("div")
    this.reasonElement.style.cssText = `
      color: rgba(255, 255, 255, 0.8);
      font-size: 18px;
      margin-bottom: 30px;
      line-height: 1.5;
    `
    this.popup.appendChild(this.reasonElement)

    // Play Again button
    const playAgainBtn = document.createElement("button")
    playAgainBtn.textContent = "Play Again"
    playAgainBtn.style.cssText = `
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      border: none;
      border-radius: 30px;
      color: white;
      padding: 15px 40px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      margin-right: 15px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
    `
    playAgainBtn.onmouseover = () => {
      playAgainBtn.style.transform = "scale(1.05)"
      playAgainBtn.style.boxShadow = "0 6px 20px rgba(76, 175, 80, 0.6)"
    }
    playAgainBtn.onmouseout = () => {
      playAgainBtn.style.transform = "scale(1)"
      playAgainBtn.style.boxShadow = "0 4px 15px rgba(76, 175, 80, 0.4)"
    }
    playAgainBtn.onclick = () => {
      window.location.reload()
    }
    this.popup.appendChild(playAgainBtn)

    // Exit button
    const exitBtn = document.createElement("button")
    exitBtn.textContent = "Exit"
    exitBtn.style.cssText = `
      background: transparent;
      border: 2px solid rgba(255, 255, 255, 0.5);
      border-radius: 30px;
      color: rgba(255, 255, 255, 0.8);
      padding: 15px 40px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `
    exitBtn.onmouseover = () => {
      exitBtn.style.borderColor = "rgba(255, 255, 255, 0.8)"
      exitBtn.style.color = "white"
    }
    exitBtn.onmouseout = () => {
      exitBtn.style.borderColor = "rgba(255, 255, 255, 0.5)"
      exitBtn.style.color = "rgba(255, 255, 255, 0.8)"
    }
    exitBtn.onclick = () => {
      window.close()
      // Fallback if window.close() doesn't work
      window.location.href = "about:blank"
    }
    this.popup.appendChild(exitBtn)

    this.overlay.appendChild(this.popup)
    document.body.appendChild(this.overlay)
  }

  /**
   * Show the win result
   */
  showWin(reason: string): void {
    if (!this.overlay || !this.popup || !this.titleElement || !this.reasonElement) return

    // Update styles for win
    this.popup.style.background = "linear-gradient(135deg, #1a2e1a 0%, #163e16 100%)"
    this.popup.style.borderColor = "rgba(100, 255, 100, 0.4)"
    this.popup.style.boxShadow = "0 25px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(100, 255, 100, 0.15)"

    // Trophy icon with animation
    const iconContainer = document.getElementById("gameResultIcon")
    if (iconContainer) {
      iconContainer.innerHTML = "🏆"
      iconContainer.style.animation = "trophyBounce 0.6s ease-in-out infinite"
    }

    // Title
    this.titleElement.textContent = "YOU WIN!"
    this.titleElement.style.color = "#4CAF50"
    this.titleElement.style.textShadow = "0 0 30px rgba(76, 175, 80, 0.5)"

    // Reason
    this.reasonElement.textContent = reason

    this.show()
  }

  /**
   * Show the lose result
   */
  showLose(reason: string): void {
    if (!this.overlay || !this.popup || !this.titleElement || !this.reasonElement) return

    // Update styles for lose
    this.popup.style.background = "linear-gradient(135deg, #2e1a1a 0%, #3e1616 100%)"
    this.popup.style.borderColor = "rgba(255, 100, 100, 0.4)"
    this.popup.style.boxShadow = "0 25px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(255, 100, 100, 0.15)"

    // Sad icon
    const iconContainer = document.getElementById("gameResultIcon")
    if (iconContainer) {
      iconContainer.innerHTML = "😢"
      iconContainer.style.animation = "sadShake 0.5s ease-in-out"
    }

    // Title
    this.titleElement.textContent = "YOU LOSE"
    this.titleElement.style.color = "#ff6464"
    this.titleElement.style.textShadow = "0 0 30px rgba(255, 100, 100, 0.5)"

    // Reason
    this.reasonElement.textContent = reason

    this.show()
  }

  private show(): void {
    if (!this.overlay) return
    this.overlay.style.display = "flex"
    this.isVisible = true
  }

  hide(): void {
    if (!this.overlay) return
    this.overlay.style.display = "none"
    this.isVisible = false
  }

  isShowing(): boolean {
    return this.isVisible
  }

  dispose(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.overlay = null
    this.popup = null
    this.titleElement = null
    this.reasonElement = null
  }
}
