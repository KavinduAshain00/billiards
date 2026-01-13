import { useEffect, useRef } from "react"
import { BrowserContainer } from "../container/browsercontainer"
import { logusage } from "../utils/usage"

export default function EmbedPage() {
  const containerRef = useRef<BrowserContainer | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true
      const init = () => {
        const canvas3d = document.getElementById("viewP1") as HTMLCanvasElement
        if (canvas3d && !containerRef.current) {
          const params = new URLSearchParams(location.search)
          containerRef.current = new BrowserContainer(canvas3d, params)
          containerRef.current.start()
          logusage()
        }
      }
      setTimeout(init, 0)
    }
  }, [])

  return (
    <div id="viewP1" className="view3d" style={{ height: "100%" }}>
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
  )
}
