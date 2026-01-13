import { useEffect, useRef } from "react"
import { BrowserContainer } from "../container/browsercontainer"
import { logusage } from "../utils/usage"

export default function GamePage() {
  const containerRef = useRef<BrowserContainer | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true
      // Wait for DOM to be ready
      const init = () => {
        const canvas3d = document.getElementById("viewP1") as HTMLCanvasElement
        if (canvas3d && !containerRef.current) {
          const params = new URLSearchParams(location.search)
          containerRef.current = new BrowserContainer(canvas3d, params)
          containerRef.current.start()
          logusage()
        }
      }
      // Small delay to ensure DOM is mounted
      setTimeout(init, 0)
    }
  }, [])

  return (
    <>
      <div id="viewP1" className="view3d">
        <div id="snookerScoreOverlay">
          <div id="snookerScore"></div>
        </div>
        <div id="eightballScoreOverlay">
          <div id="eightBallBreak"></div>
          <div id="eightBallGroup"></div>
        </div>
        <div id="pingIndicator" className="pingIndicator">
          Ping: -- ms
        </div>
      </div>
      <div className="panel">
        <button className="hitButton" id="cueHit" type="button">
          hit
        </button>
        <div className="ballContainer">
          <div id="objectBall" className="objectBall"></div>
          <div id="cueBall" className="cueBall">
            <div id="cueTip" className="cueTip"></div>
          </div>
        </div>
        <input
          className="powerSlider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          defaultValue="0.7"
          id="cuePower"
          aria-label="power slider"
        />
        <div className="chatarea">
          <div id="chatoutput" className="chatoutput">
            <a href="https://github.com/tailuge/billiards" title="Github">
              ★
            </a>
            <a
              href="https://scoreboard-tailuge.vercel.app/leaderboard.html"
              target="_blank"
              title="High Break Table"
            >
              🏆
            </a>
            <a
              href="https://scoreboard-tailuge.vercel.app/lobby"
              target="_blank"
              className="pill"
              title="Lobby"
              id="lobby"
            >
              👥
            </a>
          </div>
          <div className="outerMenu">
            <button className="menuButton" title="share" id="share" type="submit">
              ⬀
            </button>
            <button className="menuButton" title="replay" id="replay" type="submit">
              ↻
            </button>
            <button className="menuButton" title="retry" id="redo" type="submit">
              ⎌
            </button>
            <button className="menuButton" title="view" id="camera" type="submit">
              🎥
            </button>
          </div>
        </div>
      </div>
      <div className="constants" id="constants">
        <p>Physical Constants</p>
        <div className="nw">
          <input id="R" type="range" />
          <label htmlFor="R">R</label>
        </div>
        <div className="nw">
          <input id="m" type="range" />
          <label htmlFor="m">m</label>
        </div>
        <div className="nw">
          <input id="e" type="range" />
          <label htmlFor="e">e</label>
        </div>
        <div className="nw">
          <input id="mu" type="range" />
          <label htmlFor="mu">mu</label>
        </div>
        <div className="nw">
          <input id="muS" type="range" />
          <label htmlFor="muS">muS</label>
        </div>
        <div className="nw">
          <input id="muC" type="range" />
          <label htmlFor="muC">muC</label>
        </div>
        <div className="nw">
          <input id="rho" type="range" />
          <label htmlFor="rho">rho</label>
        </div>
        <div className="nw">
          <button id="network">network🗲</button>
        </div>
      </div>
    </>
  )
}
