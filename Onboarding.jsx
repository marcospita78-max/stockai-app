import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const SUGERIDAS = [
  '¿Cuáles son los productos más urgentes para reponer?',
  '¿Cómo puedo liberar el capital inmovilizado?',
  '¿Qué productos debería dejar de vender?',
  'Explicame qué es la rotación de stock en palabras simples',
  '¿Cómo puedo mejorar mi margen de ganancia?',
]

export default function Asesor() {
  const { comercio } = useAuth()
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [contexto, setContexto] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    if (comercio) cargarContexto()
  }, [comercio])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function cargarContexto() {
    // Recolectar datos del comercio para el prompt
    const hoy = new Date()
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

    const [{ data: ventas }, { data: productos }, { data: alertas }] = await Promise.all([
      supabase.from('ventas').select('total').eq('comercio_id', comercio.id).gte('fecha', inicioMes),
      supabase.from('productos').select('id, nombre, precio_costo, precio_venta, stock_movimientos(tipo, cantidad)').eq('comercio_id', comercio.id).eq('activo', true),
      supabase.from('alertas').select('mensaje').eq('comercio_id', comercio.id).eq('vista', false).limit(5)
    ])

    const totalMes = (ventas || []).reduce((s, v) => s + Number(v.total), 0)

    const stockMap = {}
    const vendidoMap = {}
    ;(productos || []).forEach(p => {
      stockMap[p.id] = (p.stock_movimientos || []).reduce((sum, m) =>
        sum + (m.tipo === 'entrada' ? m.cantidad : -m.cantidad), 0)
    })

    const criticos = (productos || []).filter(p => stockMap[p.id] <= 5 && stockMap[p.id] > 0)
    const sinStock = (productos || []).filter(p => stockMap[p.id] <= 0)
    const capitalInmov = (productos || [])
      .filter(p => stockMap[p.id] > 0)
      .reduce((sum, p) => sum + (stockMap[p.id] * Number(p.precio_costo)), 0)

    const ctx = {
      nombre: comercio.nombre,
      tipo: comercio.tipo,
      localidad: comercio.localidades?.nombre,
      provincia: comercio.localidades?.provincias?.nombre,
      totalMes,
      cantProductos: (productos || []).length,
      criticos: criticos.map(p => ({ nombre: p.nombre, stock: stockMap[p.id] })),
      sinStock: sinStock.length,
      capitalInmovilizado: capitalInmov,
      alertas: (alertas || []).map(a => a.mensaje),
    }

    setContexto(ctx)

    // Mensaje de bienvenida inicial
    const bienvenida = generarBienvenida(ctx)
    setMensajes([{ rol: 'ia', texto: bienvenida }])
  }

  function generarBienvenida(ctx) {
    const partes = [`Hola, soy el asesor de **${ctx.nombre}**.`]

    if (ctx.totalMes > 0) {
      partes.push(`Este mes llevas $${Math.round(ctx.totalMes).toLocaleString('es-AR')} en ventas.`)
    }

    if (ctx.criticos.length > 0) {
      partes.push(`Tenés **${ctx.criticos.length} producto${ctx.criticos.length > 1 ? 's' : ''}** con stock crítico${ctx.criticos.length <= 2 ? ': ' + ctx.criticos.map(p => p.nombre).join(' y ') : ''}.`)
    }

    if (ctx.capitalInmovilizado > 10000) {
      partes.push(`Hay **$${Math.round(ctx.capitalInmovilizado).toLocaleString('es-AR')} inmovilizados** en productos con poco o ningún movimiento.`)
    }

    if (ctx.cantProductos === 0) {
      return 'Hola, soy tu asesor de negocio. Todavía no tenés productos cargados. Una vez que los agregues, voy a poder darte consejos concretos basados en tus datos.'
    }

    partes.push('\n¿En qué te puedo ayudar hoy?')
    return partes.join(' ')
  }

  async function enviar(texto = input) {
    if (!texto.trim() || cargando || !contexto) return
    const pregunta = texto.trim()
    setInput('')
    setMensajes(prev => [...prev, { rol: 'usuario', texto: pregunta }])
    setCargando(true)

    try {
      const sistemaPrompt = `Sos el asesor de negocio de Stock IA para un ${contexto.tipo} llamado "${contexto.nombre}" ubicado en ${contexto.localidad}, ${contexto.provincia}.

DATOS ACTUALES DEL NEGOCIO:
- Ventas este mes: $${Math.round(contexto.totalMes).toLocaleString('es-AR')}
- Productos activos: ${contexto.cantProductos}
- Capital inmovilizado en stock sin movimiento: $${Math.round(contexto.capitalInmovilizado).toLocaleString('es-AR')}
${contexto.criticos.length > 0 ? `- Stock crítico (≤5 unidades): ${contexto.criticos.map(p => `${p.nombre} (${p.stock} u.)`).join(', ')}` : '- Sin productos en stock crítico'}
${contexto.alertas.length > 0 ? `- Alertas activas: ${contexto.alertas.join('; ')}` : ''}

REGLAS ESTRICTAS:
- Usá lenguaje simple y argentino. Tuteá siempre.
- Nunca uses palabras como "optimizar", "sinergia", "potenciar" o "maximizar".
- Siempre mencioná números concretos cuando los tenés.
- Máximo 4 oraciones por respuesta.
- Si recomendás una acción, decí exactamente qué hacer y cuándo.
- Si no tenés datos suficientes para responder algo, decilo honestamente.
- No inventes datos que no están en el contexto.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          system: sistemaPrompt,
          messages: [{ role: 'user', content: pregunta }]
        })
      })

      const data = await res.json()
      const respuesta = data.content?.[0]?.text ?? 'No pude procesar la respuesta. Intentá de nuevo.'
      setMensajes(prev => [...prev, { rol: 'ia', texto: respuesta }])
    } catch {
      setMensajes(prev => [...prev, { rol: 'ia', texto: 'Hubo un error al conectar. Verificá tu conexión e intentá de nuevo.' }])
    }
    setCargando(false)
  }

  function renderTexto(texto) {
    // Soporte básico para **negrita**
    return texto.split('\n').map((linea, i) => {
      const partes = linea.split(/\*\*(.*?)\*\*/g)
      return (
        <span key={i}>
          {partes.map((parte, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ fontWeight: '600' }}>{parte}</strong>
              : parte
          )}
          {i < texto.split('\n').length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 54px - 62px - 32px)', gap: '12px' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ background: 'var(--accent)', color: 'white', fontSize: '10px', padding: '3px 9px', borderRadius: '10px', fontWeight: '500' }}>IA</span>
        <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>Asesor del negocio</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· Preguntá en lenguaje natural</span>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {mensajes.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.rol === 'usuario' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%',
              padding: '10px 13px',
              borderRadius: m.rol === 'usuario' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
              background: m.rol === 'usuario' ? 'var(--accent)' : 'var(--surface)',
              color: m.rol === 'usuario' ? 'white' : 'var(--text)',
              fontSize: '13px', lineHeight: '1.6',
              border: m.rol === 'ia' ? '1px solid var(--border)' : 'none',
              boxShadow: 'var(--shadow)'
            }}>
              {renderTexto(m.texto)}
            </div>
          </div>
        ))}

        {cargando && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: '14px 14px 14px 3px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              fontSize: '13px', color: 'var(--text-muted)'
            }}>
              Analizando tus datos…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Preguntas sugeridas */}
      {mensajes.length <= 1 && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', flexShrink: 0 }}>
          {SUGERIDAS.map((s, i) => (
            <button key={i} onClick={() => enviar(s)}
              style={{
                padding: '7px 12px', border: '1px solid var(--border)',
                borderRadius: '20px', background: 'var(--surface)',
                color: 'var(--text-sec)', fontSize: '12px',
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer'
              }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
          placeholder="Escribí tu pregunta..."
          disabled={cargando}
          style={{
            flex: 1, padding: '11px 14px', border: '1px solid var(--border)',
            borderRadius: '24px', fontSize: '14px', background: 'var(--surface)',
            color: 'var(--text)', outline: 'none'
          }}
        />
        <button onClick={() => enviar()}
          disabled={cargando || !input.trim()}
          style={{
            width: '44px', height: '44px', borderRadius: '50%', border: 'none',
            background: cargando || !input.trim() ? 'var(--border)' : 'var(--accent)',
            color: 'white', fontSize: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            cursor: cargando || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'background .15s', flexShrink: 0
          }}>
          ↑
        </button>
      </div>
    </div>
  )
}
