import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Home } from './pages/Home.tsx'
import { PrototypesGate } from './pages/PrototypesGate.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/prototypes/*" element={<PrototypesGate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
