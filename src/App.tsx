import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { LocaleProvider } from '@/i18n'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Home } from '@/pages/Home'
import { Matches } from '@/pages/Matches'
import { MatchDetail } from '@/pages/MatchDetail'
import { Admin } from '@/pages/Admin'
import { Me, Bonus } from '@/pages/Placeholders'

export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <HashRouter>
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
            <Route path="/matches/:id" element={<ProtectedRoute><MatchDetail /></ProtectedRoute>} />
            <Route path="/me" element={<ProtectedRoute><Me /></ProtectedRoute>} />
            <Route path="/bonus" element={<ProtectedRoute><Bonus /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </LocaleProvider>
  )
}
