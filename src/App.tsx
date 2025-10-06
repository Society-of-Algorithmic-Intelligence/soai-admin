import './App.css'
import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import AdminMembers from './pages/AdminMembers'
import AdminNews from './pages/AdminNews'
import AdminEvents from './pages/AdminEvents'
import Login from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AdminLayout />}> 
          <Route index element={<Navigate to="members" replace />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="events" element={<AdminEvents />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
