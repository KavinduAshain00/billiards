import { useEffect } from "react"
import { Link } from "react-router-dom"

export default function ComparePage() {
  useEffect(() => {
    // Load diagrams CSS
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "/diagrams/diagrams.css"
    document.head.appendChild(link)

    // Dynamically import the compare module
    import("../compare").catch(console.error)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return (
    <>
      <div className="diagram">
        <p>
          Physical Constants <button id="replay" type="button">replay</button>
        </p>
        <br />
        <input id="R" type="range" />
        <label htmlFor="R">R</label>
        <input id="m" type="range" />
        <label htmlFor="m">m</label>
        <input id="e" type="range" />
        <label htmlFor="e">e</label>
        <input id="mu" type="range" />
        <label htmlFor="mu">mu</label>
        <input id="muS" type="range" />
        <label htmlFor="muS">muS</label>
        <input id="muC" type="range" />
        <label htmlFor="muC">muC</label>
        <input id="rho" type="range" />
        <label htmlFor="rho">rho</label>
      </div>

      <div className="replaydiagram">
        <div
          className="topview"
          data-state="?ruletype=threecushion&state=%7B%22init%22:%5B-0.7373067090956691,-0.6966987413255495,-0.76875,0,-0.4754386917864184,0.5140828385527972%5D,%22shots%22:%5B%7B%22type%22:%22AIM%22,%22offset%22:%7B%22x%22:-0.236,%22y%22:0.185,%22z%22:0%7D,%22angle%22:-1.59,%22power%22:2.841,%22pos%22:%7B%22x%22:-0.76875,%22y%22:0,%22z%22:0%7D,%22i%22:1%7D%5D%7D"
        ></div>
        <p className="description">mathaven cushion model</p>
      </div>

      <div style={{ padding: "20px" }}>
        <Link to="/">← Back to Game</Link>
      </div>
    </>
  )
}
