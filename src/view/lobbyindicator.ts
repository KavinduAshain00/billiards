/**
 * LobbyIndicator shows waiting UI when one player has joined
 * and is waiting for opponent to connect
 */
export class LobbyIndicator {
  private element: HTMLDivElement | null = null
  private visible: boolean = false

  constructor() {
    this.createOverlay()
  }

  private createOverlay() {
    // Create overlay element
    this.element = document.createElement('div')
    this.element.id = 'lobby-indicator'
    this.element.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.75);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `

    const content = document.createElement('div')
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      padding: 40px 60px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `

    const title = document.createElement('h2')
    title.id = 'lobby-title'
    title.textContent = 'Waiting for Opponent'
    title.style.cssText = `
      color: #fff;
      margin: 0 0 20px 0;
      font-size: 28px;
      font-weight: 600;
    `

    const spinner = document.createElement('div')
    spinner.style.cssText = `
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top: 4px solid #4CAF50;
      border-radius: 50%;
      margin: 0 auto 20px auto;
      animation: spin 1s linear infinite;
    `

    const status = document.createElement('p')
    status.id = 'lobby-status'
    status.textContent = 'Looking for an opponent to join...'
    status.style.cssText = `
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
      font-size: 16px;
    `

    const playerInfo = document.createElement('div')
    playerInfo.id = 'lobby-player-info'
    playerInfo.style.cssText = `
      margin-top: 20px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    `

    // Add CSS animation for spinner
    const style = document.createElement('style')
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      #lobby-indicator.ready .spinner {
        border-top-color: #2196F3;
      }
    `
    document.head.appendChild(style)

    spinner.className = 'spinner'
    content.appendChild(title)
    content.appendChild(spinner)
    content.appendChild(status)
    content.appendChild(playerInfo)
    this.element.appendChild(content)
    document.body.appendChild(this.element)
  }

  /**
   * Show the waiting overlay
   */
  show(playerNumber?: number, playerName?: string) {
    if (!this.element) return
    
    this.visible = true
    this.element.style.display = 'flex'
    
    const playerInfo = document.getElementById('lobby-player-info')
    if (playerInfo && playerNumber) {
      playerInfo.innerHTML = `
        <div style="color: #4CAF50; font-size: 14px; margin-bottom: 5px;">You are Player ${playerNumber}</div>
        <div style="color: rgba(255,255,255,0.5); font-size: 12px;">${playerName || 'Anonymous'}</div>
      `
    }
  }

  /**
   * Update status message
   */
  updateStatus(message: string) {
    const status = document.getElementById('lobby-status')
    if (status) {
      status.textContent = message
    }
  }

  /**
   * Show opponent found state
   */
  opponentFound(opponentName: string) {
    this.updateStatus(`${opponentName || 'Opponent'} has joined!`)
    
    const title = document.getElementById('lobby-title')
    if (title) {
      title.textContent = 'Opponent Found!'
      title.style.color = '#4CAF50'
    }

    // Hide after short delay
    setTimeout(() => {
      this.hide()
    }, 1500)
  }

  /**
   * Show game starting state
   */
  gameStarting(_firstPlayer: number, isMyTurn: boolean) {
    const title = document.getElementById('lobby-title')
    if (title) {
      title.textContent = 'Game Starting!'
      title.style.color = '#2196F3'
    }
    
    this.updateStatus(isMyTurn ? 'You break first!' : 'Opponent breaks first')
    
    // Hide after short delay
    setTimeout(() => {
      this.hide()
    }, 2000)
  }

  /**
   * Hide the overlay
   */
  hide() {
    if (!this.element) return
    
    this.visible = false
    this.element.style.display = 'none'
  }

  /**
   * Check if overlay is visible
   */
  isVisible(): boolean {
    return this.visible
  }

  /**
   * Show connection error
   */
  showError(message: string) {
    const title = document.getElementById('lobby-title')
    if (title) {
      title.textContent = 'Connection Error'
      title.style.color = '#f44336'
    }
    
    this.updateStatus(message)
  }

  /**
   * Show reconnecting state
   */
  showReconnecting() {
    if (!this.element) return
    
    this.element.style.display = 'flex'
    
    const title = document.getElementById('lobby-title')
    if (title) {
      title.textContent = 'Reconnecting...'
      title.style.color = '#FF9800'
    }
    
    this.updateStatus('Attempting to reconnect to the game...')
  }

  /**
   * Clean up the overlay element
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
      this.element = null
    }
  }
}
