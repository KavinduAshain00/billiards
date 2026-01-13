import { useEffect } from "react"
import { Link } from "react-router-dom"

export default function MultiPage() {
  useEffect(() => {
    // Setup server URL for multiplayer links
    const server = window.location.origin
    const serverParam = `server=${encodeURIComponent(server)}`
    const elts = document.getElementsByClassName("addwss")
    for (const elt of elts) {
      const anchor = elt as HTMLAnchorElement
      anchor.href += `&${serverParam}`
    }
    console.log("[MultiPage] Server URL for multiplayer:", server)
  }, [])

  return (
    <div style={{ padding: "20px" }}>
      <h1>tailuge/billiards multiplayer test page</h1>
      <p>local assets (for dev)</p>
      <br />
      <h3>single player</h3>
      <ul>
        <li>
          <Link to="/">single player nineball</Link>
        </li>
        <li>
          <Link to="/?ruletype=threecushion">single player three cushion</Link>
        </li>
        <li>
          <Link to="/?ruletype=fourteenone">single player 14-1</Link>
        </li>
        <li>
          <Link to="/?ruletype=snooker">single player snooker</Link>
        </li>
      </ul>
      <h3>two player</h3>
      <ul>
        <li>
          <Link className="addwss" to="/2p?ruletype=nineball">
            two players nineball in single window
          </Link>{" "}
          for quick testing
        </li>
        <li>
          <Link className="addwss" to="/2p?ruletype=threecushion">
            two players three cushion in single window
          </Link>
        </li>
        <li>
          <Link className="addwss" to="/2p?ruletype=fourteenone">
            two players 14-1 in single window
          </Link>
        </li>
        <li>
          <Link className="addwss" to="/2p?ruletype=snooker">
            two players snooker in single window
          </Link>
        </li>
      </ul>
    </div>
  )
}
