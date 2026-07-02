import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Alertas() {
  const { comercio } = useAuth()
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => {
    if (comercio) { cargarAlertas(); generarAlertas() }
  }, [comercio])

  async function generarAlertas() {
    // Verificar stock crítico
    const { data: productos } = await supabase
      .from('productos')
      .select('id, nombre, stock_movimientos(tipo, cantidad)')
      .eq('comercio_id', comercio.id).eq('activo', true)

    for (const p of (productos || [])) {
      const stock = (p.stock_movimientos || []).reduce((sum, m) =>
        sum + (m.tipo === 'entrada' ? m.cantidad : -m.cantidad), 0)

      if (stock <= 5 && stock > 0) {
        // Ver si ya existe esta alerta
        const { data: existe } = await supabase
          .from('alertas')
          .select('id')
          .eq('comercio_id', comercio.id)
          .eq('producto_id', p.id)
          .eq('tipo', 'stock_critico')
          .eq('vista', false)
          .single()

        if (!existe) {
          await supabase.from('alertas').insert({
            comercio_id: comercio.id,
            producto_id: p.id,
            tipo: 'stock_critico',
            mensaje: `${p.nombre}: quedan solo ${stock} unidades`,
            accion: 'Considerá hacer un nuevo pedido pronto'
          })
        }
      }
    }
    cargarAlertas()
  }

  async function cargarAlertas() {
    setCargando(true)
    const { data } = await supabase
      .from('alertas')
      .select('*, productos(nombre)')
      .eq('comercio_id', comercio.id)
      .order('created_at', { ascending: false })
    setAlertas(data || [])
    setCargando(false)
  }

  async function marcarVista(id) {
    await supabase.from('alertas').update({ vista: true }).eq('id', id)
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, vista: true } : a))
  }

  async function marcarTodasVistas() {
    await supabase.from('alertas').update({ vista: true }).eq('comercio_id', comercio.id)
    setAlertas(prev => prev.map(a => ({ ...a, vista: true })))
  }

  const filtradas = alertas.filter(a => {
    if (filtro === 'nuevas') return !a.vista
    if (filtro === 'vistas') return a.vista
    return true
  })

  const nuevas = alertas.filter(a => !a.vista).length

  const colorAlerta = (tipo) => {
    if (tipo === 'critica' || tipo === 'stock_critico') return 'var(--danger)'
    if (tipo === 'advertencia') return 'var(--warning)'
    return 'var(--accent)'
  }

  const bgAlerta = (tipo) => {
    if (tipo === 'critica' || tipo === 'stock_critico') return 'var(--danger-light)'
    if (tipo === 'advertencia') return 'var(--warning-light)'
    return 'var(--accent-light)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Alertas</span>
          {nuevas > 0 && (
            <span style={{ marginLeft: '8px', background: 'var(--danger)', color: 'white', fontSize: '11px', padding: '2px 7px', borderRadius: '10px', fontWeight: '500' }}>
              {nuevas} nuevas
            </span>
          )}
        </div>
        {nuevas > 0 && (
          <button onClick={marcarTodasVistas}
            style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Marcar todas como vistas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[['todas', 'Todas'], ['nuevas', 'Nuevas'], ['vistas', 'Vistas']].map(([id, label]) => (
          <button key={id} onClick={() => setFiltro(id)}
            style={{
              padding: '6px 14px', border: '1px solid var(--border)',
              borderRadius: '20px', fontSize: '12px',
              background: filtro === id ? 'var(--accent)' : 'var(--surface)',
              color: filtro === id ? 'white' : 'var(--text-sec)'
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '28px 20px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>Todo en orden</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No hay alertas pendientes</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtradas.map(a => (
            <div key={a.id}
              style={{
                background: a.vista ? 'var(--surface)' : bgAlerta(a.tipo),
                border: `1px solid ${a.vista ? 'var(--border)' : colorAlerta(a.tipo) + '44'}`,
                borderRadius: 'var(--radius)', padding: '14px',
                opacity: a.vista ? 0.7 : 1
              }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorAlerta(a.tipo), flexShrink: 0, marginTop: '5px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', lineHeight: '1.4' }}>
                    {a.mensaje}
                  </div>
                  {a.accion && (
                    <div style={{ fontSize: '12px', color: 'var(--text-sec)', marginTop: '3px' }}>{a.accion}</div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {new Date(a.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!a.vista && (
                  <button onClick={() => marcarVista(a.id)}
                    style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                    ✓
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
