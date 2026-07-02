import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Resumen() {
  const { comercio } = useAuth()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (comercio) cargarDatos()
  }, [comercio])

  async function cargarDatos() {
    setCargando(true)
    const hoy = new Date()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()
    const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString()
    const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString()

    // Ventas del mes actual
    const { data: ventasMes } = await supabase
      .from('ventas').select('total')
      .eq('comercio_id', comercio.id)
      .gte('fecha', inicioMes)

    // Ventas del mes anterior
    const { data: ventasAnt } = await supabase
      .from('ventas').select('total')
      .eq('comercio_id', comercio.id)
      .gte('fecha', inicioMesAnt).lte('fecha', finMesAnt)

    // Productos activos
    const { data: productos } = await supabase
      .from('productos').select('id, nombre, categoria_id, precio_costo')
      .eq('comercio_id', comercio.id).eq('activo', true)

    // Alertas no vistas
    const { data: alertas } = await supabase
      .from('alertas').select('*')
      .eq('comercio_id', comercio.id).eq('vista', false)
      .order('created_at', { ascending: false }).limit(3)

    // Movimientos para calcular stock actual
    const { data: movimientos } = await supabase
      .from('stock_movimientos')
      .select('producto_id, tipo, cantidad')
      .in('producto_id', (productos || []).map(p => p.id))

    // Calcular stock por producto
    const stockMap = {}
    ;(movimientos || []).forEach(m => {
      if (!stockMap[m.producto_id]) stockMap[m.producto_id] = 0
      stockMap[m.producto_id] += m.tipo === 'entrada' ? m.cantidad : -m.cantidad
    })

    // Top vendidos — items vendidos este mes
    const { data: itemsMes } = await supabase
      .from('ventas_items')
      .select('producto_id, cantidad, productos(nombre)')
      .in('producto_id', (productos || []).map(p => p.id))

    // Agrupar por producto
    const vendidosMap = {}
    ;(itemsMes || []).forEach(item => {
      if (!vendidosMap[item.producto_id]) {
        vendidosMap[item.producto_id] = { nombre: item.productos?.nombre, total: 0 }
      }
      vendidosMap[item.producto_id].total += item.cantidad
    })
    const topVendidos = Object.values(vendidosMap)
      .sort((a, b) => b.total - a.total).slice(0, 5)

    // Capital inmovilizado — productos con stock > 0 y sin ventas
    const sinVenta = (productos || []).filter(p => {
      const stock = stockMap[p.id] || 0
      const vendido = vendidosMap[p.id]?.total || 0
      return stock > 0 && vendido === 0
    })
    const capitalInmovilizado = sinVenta.reduce((sum, p) => {
      return sum + ((stockMap[p.id] || 0) * p.precio_costo)
    }, 0)

    const totalMes = (ventasMes || []).reduce((s, v) => s + Number(v.total), 0)
    const totalAnt = (ventasAnt || []).reduce((s, v) => s + Number(v.total), 0)
    const variacion = totalAnt > 0 ? ((totalMes - totalAnt) / totalAnt * 100).toFixed(1) : null

    setDatos({
      totalMes, totalAnt, variacion,
      cantProductos: (productos || []).length,
      sinMovimiento: sinVenta.length,
      capitalInmovilizado,
      topVendidos,
      alertas: alertas || [],
      stockCritico: Object.entries(stockMap).filter(([, v]) => v > 0 && v <= 5).length
    })
    setCargando(false)
  }

  if (cargando) return <Skeleton />

  const d = datos

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <MetricCard
          label="Ventas este mes"
          value={`$${Math.round(d.totalMes).toLocaleString('es-AR')}`}
          delta={d.variacion ? `${d.variacion > 0 ? '↑' : '↓'} ${Math.abs(d.variacion)}% vs mes anterior` : 'Sin datos anteriores'}
          tipo={d.variacion > 0 ? 'up' : 'dn'}
        />
        <MetricCard
          label="Capital inmovilizado"
          value={`$${Math.round(d.capitalInmovilizado).toLocaleString('es-AR')}`}
          delta={`${d.sinMovimiento} productos sin venta`}
          tipo="dn"
        />
        <MetricCard
          label="Productos activos"
          value={d.cantProductos}
          delta="en tu catálogo"
          tipo="neutral"
        />
        <MetricCard
          label="Stock crítico"
          value={d.stockCritico}
          delta="quedan ≤5 unidades"
          tipo={d.stockCritico > 0 ? 'dn' : 'up'}
        />
      </div>

      {/* Top vendidos */}
      {d.topVendidos.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
            Más vendidos este mes
          </div>
          {d.topVendidos.map((p, i) => {
            const max = d.topVendidos[0].total
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: i < d.topVendidos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '14px' }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span>
                <div style={{ width: '60px', height: '5px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(p.total / max * 100)}%`, height: '5px', background: 'var(--success)', borderRadius: '3px' }} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '38px', textAlign: 'right' }}>{p.total} u.</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Alertas recientes */}
      {d.alertas.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
            Alertas recientes
          </div>
          {d.alertas.map((a, i) => {
            const color = a.tipo === 'critica' ? 'var(--danger)' : a.tipo === 'advertencia' ? 'var(--warning)' : 'var(--accent)'
            return (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < d.alertas.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '5px' }} />
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.4' }}>{a.mensaje}</div>
                  {a.accion && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.accion}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Estado si no hay datos */}
      {d.topVendidos.length === 0 && d.alertas.length === 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '28px 20px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>Empezá cargando tus productos</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Una vez que tengas productos y ventas registradas, acá vas a ver tus estadísticas en tiempo real.
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, delta, tipo }) {
  const deltaColor = tipo === 'up' ? 'var(--success)' : tipo === 'dn' ? 'var(--danger)' : 'var(--text-muted)'
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text)', lineHeight: '1.1', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: '11px', color: deltaColor, marginTop: '4px' }}>{delta}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid var(--border)', height: '80px' }}>
            <div style={{ height: '10px', background: 'var(--border)', borderRadius: '4px', width: '60%', marginBottom: '10px' }} />
            <div style={{ height: '24px', background: 'var(--border)', borderRadius: '4px', width: '40%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
