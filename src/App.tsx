import { Route, Routes } from "react-router-dom"
import Home from "@/pages/Home"
import ResultTwoSteps from "@/pages/ResultTwoSteps"
import ResultGraphical from "@/pages/ResultGraphical"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/optimization/two_steps/:id" element={<ResultTwoSteps />} />
      <Route path="/optimization/graphical/:id" element={<ResultGraphical />} />
    </Routes>
  )
}

export default App
