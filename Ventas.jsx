import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Resumen from './Resumen'
import Productos from './Productos'
import Ventas from './Ventas'
import Alertas from './Alertas'
import Asesor from './Asesor'

const NAV = [
  { id: 'resumen',   icon: '📊', label: 'Resumen'  },
  { id: 'productos', icon: '📦', label: 'Productos' },
  { id: 'ventas',    icon: '💰', label: 'Ventas'    },
  { id: 'alertas',   icon: '🔔', label: 'Alertas'   },
  { id: 'asesor',    icon: '🤖', label: 'Asesor IA' },
]

export default function Layout() {
  const { comercio, signOut } = useAuth()
  const [panel, setPanel] = useState('resumen')
  const [menuAbierto, setMenuAbierto] = useState(false)

  const renderPanel = () => {
    switch (panel) {
      case 'resumen':   return <Resumen />
      case 'productos': return <Productos />
      case 'ventas':    return <Ventas />
      case 'alertas':   return <Alertas />
      case 'asesor':    return <Asesor />
      default:          return <Resumen />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 16px', height: '54px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>📈</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', lineHeight: '1.2' }}>
              Stock IA
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.2' }}>
              {comercio?.nombre}
            </div>
          </div>
        </div>

        <button onClick={() => setMenuAbierto(!menuAbierto)}
          style={{ background: 'none', border: 'none', fontSize: '20px', padding: '4px', color: 'var(--text-sec)' }}>
          ⚙️
        </button>

        {/* Menu desplegable */}
        {menuAbierto && (
          <div style={{
            position: 'fixed', top: '54px', right: '16px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '160px'
          }}>
            <div style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              {comercio?.localidades?.nombre}, {comercio?.localidades?.provincias?.nombre}
            </div>
            <button onClick={signOut} style={{
              width: '100%', padding: '12px 14px', background: 'none', border: 'none',
              textAlign: 'left', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer'
            }}>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {/* Contenido principal */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {renderPanel()}
        </div>
      </main>

      {/* Navegación inferior */}
      <nav style={{
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => { setPanel(item.id); setMenuAbierto(false) }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 4px 10px', border: 'none', background: 'none',
              color: panel === item.id ? 'var(--accent)' : 'var(--text-muted)',
              borderTop: panel === item.id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'color .15s', gap: '2px'
            }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: panel === item.id ? '500' : '400' }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
