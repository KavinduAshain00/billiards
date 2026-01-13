import { useEffect } from "react"
import { Link } from "react-router-dom"

declare global {
  interface Window {
    Plotly: any
  }
}

export default function MathavenPage() {
  useEffect(() => {
    // Load diagrams CSS
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "/diagrams/diagrams.css"
    document.head.appendChild(link)

    // Load Plotly
    const script = document.createElement("script")
    script.src = "https://cdn.plot.ly/plotly-cartesian-3.0.0-rc.0.min.js"
    script.integrity =
      "sha384-k9BNvphELWyBtQVTUBS5YYM9SAb3H4NoA6hxg6YARuWJqdp+yp8F3mJN405LN+KC"
    script.crossOrigin = "anonymous"
    script.onload = () => {
      // Dynamically import the mathaven module after Plotly loads
      import("../mathaven").catch(console.error)
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(script)
    }
  }, [])

  return (
    <>
      <div id="mathaven-impulse" className="mathavendiagram"></div>
      <div id="mathaven-figure9-speed" className="mathavendiagram"></div>
      <div id="mathaven-figure9-angle" className="mathavendiagram"></div>
      <div id="mathaven-figure10-speed" className="mathavendiagram"></div>
      <div id="mathaven-figure10-angle" className="mathavendiagram"></div>
      <div id="collision-throw-roll" className="mathavendiagram"></div>
      <div id="collision-throw-stun" className="mathavendiagram"></div>
      <div id="collision-throw-varying-roll" className="mathavendiagram"></div>
      <div id="collision-throw-varying-side" className="mathavendiagram"></div>
      <div style={{ padding: "20px" }}>
        <Link to="/">← Back to Game</Link>
      </div>
    </>
  )
}
