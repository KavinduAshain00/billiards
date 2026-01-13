import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

export default function TwoPlayerPage() {
  const [searchParams] = useSearchParams()
  const [p1Src, setP1Src] = useState("")
  const [p2Src, setP2Src] = useState("")

  useEffect(() => {
    const websocketserver = searchParams.get("websocketserver") ?? "ws://localhost:8080"
    const ruletype = searchParams.get("ruletype") ?? "nineball"
    const unique = Math.floor(Math.random() * 0xffff).toString(16)
    const baseUrl = `/?ruletype=${ruletype}&websocketserver=${websocketserver}&tableId=${unique}`

    setP1Src(`${baseUrl}&clientId=p1id&name=P1&first=true`)
    setP2Src(`${baseUrl}&clientId=p2id&name=P2`)
  }, [searchParams])

  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      <div className="box">
        <iframe
          src={p1Src}
          title="P1"
          id="P1"
          width="620"
          height="450"
          style={{ float: "left" }}
        />
      </div>
      <div className="box">
        <iframe
          src={p2Src}
          title="P2"
          id="P2"
          width="620"
          height="450"
          style={{ float: "right" }}
        />
      </div>
    </div>
  )
}
