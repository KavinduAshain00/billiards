import { useEffect } from "react"
import { Link } from "react-router-dom"

export default function DiagramsPage() {
  useEffect(() => {
    // Load diagrams CSS
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "/diagrams/diagrams.css"
    document.head.appendChild(link)

    // Dynamically import the diagrams module
    import("../diagrams").catch(console.error)

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
        <p>
          <a href="https://billiards.colostate.edu/physics_articles/Han_paper.pdf">
            Han 2005
          </a>{" "}
          predicts ball grips cushion when{" "}
          <code style={{ color: "red" }}>Pzs</code> ≤{" "}
          <code style={{ color: "blue" }}>Pze</code>.
        </p>
        <p className="small">Derived quantities</p>
        <pre id="derived" className="small"></pre>
      </div>

      <div className="diagram">
        <p className="title"></p>
        <canvas id="plot1"></canvas>
        <p className="label"></p>
      </div>

      <div className="diagram">
        <p className="title"></p>
        <canvas id="plot2"></canvas>
        <p className="label"></p>
      </div>

      <div className="diagram">
        <p className="title"></p>
        <canvas id="plot3"></canvas>
        <p className="label"></p>
        <input id="s" type="range" defaultValue="1" min="0.1" max="20" step="0.5" />
        <label htmlFor="s">speed</label>
      </div>

      <div className="diagram">
        <p className="title"></p>
        <canvas id="plot4"></canvas>
        <p className="label"></p>
      </div>

      <div className="cushion diagram" id="cushion1">
        <p></p>
        <canvas width="200" height="200"></canvas>
      </div>

      <div className="cushion diagram" id="cushion2">
        <p></p>
        <canvas width="200" height="200"></canvas>
      </div>

      <div className="cushion diagram" id="cushion3">
        <p></p>
        <canvas width="200" height="200"></canvas>
      </div>

      <div className="cushion diagram" id="cushion4">
        <p></p>
        <canvas width="200" height="200"></canvas>
      </div>

      <div className="cushion diagram" id="cushion5">
        <p></p>
        <canvas width="200" height="200"></canvas>
      </div>

      <div className="replaydiagram">
        <div
          className="topview"
          data-state="?ruletype=threecushion&state=%7B%22init%22:%5B-0.7373067090956691,-0.6966987413255495,-0.76875,0,-0.4754386917864184,0.5140828385527972%5D,%22shots%22:%5B%7B%22type%22:%22AIM%22,%22offset%22:%7B%22x%22:-0.236,%22y%22:0.185,%22z%22:0%7D,%22angle%22:-1.59,%22power%22:2.841,%22pos%22:%7B%22x%22:-0.76875,%22y%22:0,%22z%22:0%7D,%22i%22:1%7D%5D%7D"
        ></div>
        <p className="description">slow check side should slow down ball</p>
      </div>

      <div className="replaydiagram">
        <div
          className="topview"
          data-state="?ruletype=threecushion&state=%7B%22init%22%3A%5B-0.76875%2C-0.1921875%2C-0.76875%2C0%2C0.76875%2C0%5D%2C%22shots%22%3A%5B%7B%22type%22%3A%22AIM%22%2C%22offset%22%3A%7B%22x%22%3A-0.131%2C%22y%22%3A0.155%2C%22z%22%3A0%7D%2C%22angle%22%3A0.146%2C%22power%22%3A3.046%2C%22pos%22%3A%7B%22x%22%3A-0.76875%2C%22y%22%3A-0.1921875%2C%22z%22%3A0%7D%2C%22i%22%3A0%7D%5D%7D"
        ></div>
        <p className="description">break off shot</p>
      </div>

      <div className="diagram">
        Other diagrams
        <ul>
          <li>
            <a href="/diagrams/nineball.html">nine-ball</a>
          </li>
          <li>
            <a href="/diagrams/symmetry.html">symmetry</a>
          </li>
          <li>
            <a href="/diagrams/roll.html">roll</a>
          </li>
          <li>
            <a href="/diagrams/odd.html">odd behaviour</a>
          </li>
          <li>
            <a href="/diagrams/diamond.html">diamond system</a>
          </li>
        </ul>
        <Link to="/">← Back to Game</Link>
      </div>
    </>
  )
}
