import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import AdminHome from './pages/AdminHome'
import AdminMembers from './pages/AdminMembers'
import AdminNews from './pages/AdminNews'
import AdminEvents from './pages/AdminEvents'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}> 
          <Route index element={<AdminHome />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="events" element={<AdminEvents />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
