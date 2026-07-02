import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Layout from './pages/Layout'

function AppContent() {
  const { user, comercio, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: '12px'
      }}>
        <div style={{ fontSize: '40px' }}>📈</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Stock IA</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargando...</div>
      </div>
    )
  }

  if (!user) return <Login />
  if (!comercio) return <Onboarding />
  return <Layout />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
