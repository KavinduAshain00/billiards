import { Routes, Route } from "react-router-dom"
import GamePage from "./pages/GamePage"
import DiagramsPage from "./pages/DiagramsPage"
import MathavenPage from "./pages/MathavenPage"
import ComparePage from "./pages/ComparePage"
import MultiPage from "./pages/MultiPage"
import TwoPlayerPage from "./pages/TwoPlayerPage"
import EmbedPage from "./pages/EmbedPage"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GamePage />} />
      <Route path="/diagrams" element={<DiagramsPage />} />
      <Route path="/mathaven" element={<MathavenPage />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/multi" element={<MultiPage />} />
      <Route path="/2p" element={<TwoPlayerPage />} />
      <Route path="/embed" element={<EmbedPage />} />
    </Routes>
  )
}
