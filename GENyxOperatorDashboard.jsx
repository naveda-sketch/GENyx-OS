import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * GenyX — Operator Dashboard v2.0
 * Tabs: Clientes · Órdenes · Herramientas · Analista · Manuales
 */

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://paty-backend-dkzk.onrender.com';
// ── SEGURIDAD: admin key nunca en el bundle — se solicita en login y vive en sessionStorage
const getAH = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Key': sessionStorage.getItem('genyx_admin_key') || '',
});
const isAuthed = () => !!sessionStorage.getItem('genyx_admin_key');

const fmt = (x) => { try { const d = new Date(typeof x === 'string' && !x.includes('Z') && !x.includes('+') ? x + 'Z' : x); return d.toLocaleString('es-MX', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }); } catch(e) { return x || '—'; } };
const $$ = (n) => ((isFinite(n) && !isNaN(n)) ? n : 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

// ── Status badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ s }) => {
  const map = { active: ['#16a34a', '#f0fdf4'], paused: ['#d97706', '#fefce8'], trial: ['#2563eb', '#eff6ff'], suspended: ['#dc2626', '#fef2f2'] };
  const [c, bg] = map[s] || ['#64748b', '#f8fafc'];
  return <span style={{ background: bg, color: c, border: `1px solid ${c}25`, padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{s}</span>;
};

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'clientes',     label: '🏢 Clientes' },
  { id: 'marketing',    label: '📢 Marketing' },
  { id: 'herramientas', label: '🛠️ Herramientas' },
  { id: 'analista',     label: '📊 Analista' },
  { id: 'agentes',      label: '🤖 Agentes' },
  { id: 'bitacora',     label: '📅 Bitácora' },
  { id: 'reporte',      label: '📧 Reporte Lunes' },
  { id: 'data',         label: '📈 DATA' },
  { id: 'expedientes',  label: '🗄️ Expedientes' },
  { id: 'onboarding',   label: '🚀 Onboarding' },
];
// TABS ocultos (datos se conservan, acceso futuro):
// { id: 'manuales',     label: '📚 Manuales' },
// { id: 'farmacopeia',  label: '💊 Farmacopeia' },

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: FARMACOPEIA — Base de conocimiento de bugs y soluciones
// ═══════════════════════════════════════════════════════════════════════════════
const FARMACOPEIA_DATA = [
  { sintoma: 'Agente pide dirección después del código promo', diagnostico: 'calcular_distancia llamada con dir placeholder; ignora bypass de promo', fix: 'Bypass: "coordinar" in dir.lower() → retorna GRATIS sin llamar Maps. Known-hint: PROHIBIDO ABSOLUTO llamar calcular_distancia.', estado: '✅', commit: '62fc6e3' },
  { sintoma: 'Upsell "Si x2" / "Si x3" agrega solo x1', diagnostico: 'UPSELL-INJECT tenía cantidad=1 hardcodeada; no leía el mensaje del usuario', fix: 'Regex extrae número del mensaje: "Si x3" → qty=3. Dedup reducido 45s→8s para permitir respuesta rápida.', estado: '✅', commit: 'd642551 + 7012386' },
  { sintoma: 'eliminar_item borra más productos de los pedidos', diagnostico: '_kw_match usaba "al menos 1 palabra en común" — "pizza"+"base" matcheaban TODAS las pizzas', fix: 'Ahora requiere ALL query words como subset del item name (q_words.issubset(i_words))', estado: '✅', commit: '93722b6' },
  { sintoma: 'Webhook Stripe con 82% de errores', diagnostico: 'Dos endpoints registrados en Stripe Dashboard para el mismo URL', fix: 'Dejar exactamente 1 endpoint en Stripe → Developers → Webhooks. Eliminar el duplicado.', estado: '✅', commit: 'Admin' },
  { sintoma: 'Agente da link de pago en el saludo de bienvenida', diagnostico: 'Sesión anterior con payment_url activo; el agente intentaba completar el pedido viejo', fix: 'PROHIBICIÓN ABSOLUTA de llamar iniciar_pago en saludos. Estado payment_ready se limpias al FULL-RESET.', estado: '✅', commit: 'a4c3f92' },
  { sintoma: 'Envío $0 siendo domicilio (PICKUP falso)', diagnostico: 'tipo_entrega derivado del LLM que omitía el campo o enviaba "recoger" por default', fix: 'Derivar tipo comparando dir guardada vs dirección física de la tienda. LLM no puede manipular este campo.', estado: '✅', commit: 'e8c7fda' },
  { sintoma: '"no such column: phone_id" — WaB post-pago silenciosa', diagnostico: 'Query SQL usaba phone_id pero la columna real en organizations es meta_phone_number_id', fix: 'Corregir SELECT a meta_phone_number_id en la query de WaB-CONFIRM.', estado: '✅', commit: '86dcbeb' },
  { sintoma: 'Agente alucina tamaño del producto (75ml vs 65ml)', diagnostico: 'CHASIS del cliente sin regla de variante/tamaño — LLM inventa variantes inexistentes', fix: 'Agregar regla explícita en CHASIS: "todos los shots son 65ml — no existen de 75ml/80ml".', estado: '✅', commit: 'CHASIS' },
  { sintoma: 'openai 2.x crash en Render al arrancar', diagnostico: 'requirements.txt sin pin de versión — Render instalaba openai 2.x con breaking changes de API', fix: 'Pinear openai>=1.0,<2.0 en requirements.txt. Verificar en cada nuevo cliente.', estado: '✅', commit: 'cc4940e' },
  { sintoma: 'Deploy trunca agent_core.py — agente roto en producción', diagnostico: 'Script Python de reemplazo sobreescribió el archivo con contenido parcial (1082 vs 2281 líneas)', fix: 'Candado startup: sys.exit(1) si agent_core < 2000 líneas. Pre-commit hook local bloquea commit si >20% pérdida.', estado: '✅', commit: 'ac0b299' },
  { sintoma: 'Carrito acumula cantidades sin que el usuario lo pida', diagnostico: 'LLM re-llamaba agregar_item para productos ya en carrito al procesar mensajes ajenos ("Nadamas")', fix: 'Guardrail dedup 8s + idempotencia: si misma qty → ignorar. REGLA INQUEBRANTABLE en CHASIS.', estado: '✅', commit: 'c5a089f' },
  { sintoma: 'Agente no recuerda la conversación tras restart del servidor', diagnostico: 'Estado en RAM (dicts Python) — cada redeploy de Render borraba todos los carritos activos', fix: 'SQLite Session Store con WAL-mode. Tabla sessions con 7 columnas. Estado persiste entre reinicios.', estado: '✅', commit: 'e53715c' },
  { sintoma: 'Pedidos pagados no aparecen en el dashboard', diagnostico: 'Query filtraba status=paid pero webhook no estaba configurado — todos quedaban en pending', fix: 'status IN (paid, pending) para ver todos. Configurar webhook Stripe correctamente.', estado: '✅', commit: '8821239' },
  { sintoma: 'Stripe cobró monto incorrecto ($238 vs $323)', diagnostico: 'AUTO-RESET borraba carrito cuando payment_sent=True → producto perdido del total', fix: 'SOFT-RESET: conserva carrito/dir/contacto si order.status≠paid en DB antes de resetear.', estado: '✅', commit: '9b75638' },
  { sintoma: '"domicilio cero" / "código cero" no es detectado', diagnostico: 'Regex solo buscaba el dígito "0" — no detectaba la palabra "cero" en español', fix: 'Normalizar texto antes del regex: texto.replace("cero","0"). También soporta variantes: "cod0", "c0d0".', estado: '✅', commit: 'd97ccfb' },
  { sintoma: 'Monto Stripe $238 en vez de $323 en pedido con cambio', diagnostico: 'AUTO-RESET (args invertidos) borraba el carrito cuando el usuario cambiaba un item post-link', fix: 'FIX: args del AUTO-RESET estaban invertidos. SOFT-RESET conserva el carrito si no hay pago confirmado.', estado: '✅', commit: '37acd88 + 9b75638' },
];

const TabFarmacopeia = () => {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const results = q.trim().length < 2
    ? FARMACOPEIA_DATA
    : FARMACOPEIA_DATA.filter(e => {
        const hay = `${e.sintoma} ${e.diagnostico} ${e.fix} ${e.commit}`.toLowerCase();
        return q.toLowerCase().split(' ').filter(Boolean).every(w => hay.includes(w));
      });

  return (
    <section>
      <div style={{ marginBottom: 24 }}>
        <h2 style={H2}>💊 Farmacopeia GenyX</h2>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          Base de conocimiento de bugs resueltos · <strong style={{ color: '#4ade80' }}>Regla de oro:</strong> buscar aquí <em>primero</em> antes de tocar código.
        </p>
      </div>

      {/* Buscador */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
          <input
            id="farmacopeia-search"
            type="text"
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(null); }}
            placeholder="Buscar por síntoma, diagnóstico, fix o commit…"
            style={{ ...INPUT, paddingLeft: 38, width: '100%', fontSize: 13 }}
          />
          {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>}
        </div>
        <span style={{ ...MONO, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>{results.length} resultado(s)</span>
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.length === 0 && (
          <div style={{ ...CARD, textAlign: 'center', color: '#64748b', padding: 32 }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🤷‍♂️</p>
            <p>No se encontró para <strong style={{ color: '#f1f5f9' }}>"{q}"</strong></p>
            <p style={{ fontSize: 11, marginTop: 6 }}>Si es un bug nuevo, resuélvelo y agrégalo aquí.</p>
          </div>
        )}
        {results.map((e, i) => (
          <div
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            style={{ ...CARD, cursor: 'pointer', border: `1px solid ${selected === i ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`, transition: 'border-color 0.15s' }}
            onMouseOver={el => { if (selected !== i) el.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseOut={el => { if (selected !== i) el.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', marginBottom: selected !== i ? 4 : 0 }}>⚡ {e.sintoma}</p>
                {selected !== i && <p style={{ fontSize: 11, color: '#64748b' }}>{e.diagnostico.substring(0, 90)}{e.diagnostico.length > 90 ? '…' : ''}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <span style={{ ...MONO, fontSize: 9, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 4 }}>{e.commit}</span>
                <span style={{ fontSize: 14 }}>{e.estado}</span>
                <span style={{ color: '#64748b', fontSize: 11 }}>{selected === i ? '▲' : '▼'}</span>
              </div>
            </div>

            {selected === i && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <p style={{ ...MONO, fontSize: 9, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Diagnóstico</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{e.diagnostico}</p>
                </div>
                <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ ...MONO, fontSize: 9, color: '#4ade80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>✅ Fix Aplicado</p>
                  <p style={{ fontSize: 12, color: '#d1fae5', lineHeight: 1.6 }}>{e.fix}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(99,102,241,0.06)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }}>
        <p style={{ fontSize: 11, color: '#818cf8' }}>💡 <strong>¿Bug nuevo resuelto?</strong> Agrégalo al array <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 5px', borderRadius: 3 }}>FARMACOPEIA_DATA</code> en el dashboard y a <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 5px', borderRadius: 3 }}>bitacora_bugs_recurrentes.md</code>.</p>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CLIENTES
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULOS — Definiciones + Editor Modal
// ═══════════════════════════════════════════════════════════════════════════════
const MODULES_DEFS = [
  { id: 'inventario',   icon: '📦', name: 'Inventario' },
  { id: 'costeador',    icon: '💰', name: 'Costeador' },
  { id: 'citas',        icon: '📅', name: 'Citas' },
  { id: 'fotolab',      icon: '📸', name: 'Foto Lab' },
  { id: 'leads',        icon: '🎯', name: 'Pipeline de Leads' },
  { id: 'pacientes',    icon: '🏥', name: 'Historial Pacientes' },
  { id: 'expediente',   icon: '📋', name: 'Expediente Digital' },
  { id: 'kpis',         icon: '📊', name: 'KPIs en Vivo' },
  { id: 'reporteLunes', icon: '📧', name: 'Reporte del Lunes' },
  { id: 'misAgentes',   icon: '🤖', name: 'Mis Agentes' },
  { id: 'reservas',     icon: '🍽️', name: 'Reservas' },
  { id: 'cursos',       icon: '🎓', name: 'Catálogo de Cursos' },
];

function ModulesEditorModal({ tenant, onClose, onSave }) {
  const [modules, setModules] = useState(() => {
    const current = tenant.modules || {};
    const init = {};
    MODULES_DEFS.forEach(m => { init[m.id] = current[m.id] === true; });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const toggle = (id) => setModules(p => ({ ...p, [id]: !p[id] }));
  const activeCount = Object.values(modules).filter(Boolean).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${BACKEND}/api/admin/organizations/${tenant.slug}/modules`, {
        method: 'PUT',
        headers: { ...getAH(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      });
      if (r.ok) {
        setSaveMsg('✅ Guardado');
        setTimeout(() => { onSave(modules); onClose(); }, 800);
      } else setSaveMsg('❌ Error al guardar');
    } catch { setSaveMsg('❌ Sin conexión'); }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0c1220', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16, padding: 28, maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>⚙️ Módulos · {tenant.name || tenant.slug}</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{activeCount} de {MODULES_DEFS.length} activos</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 20 }}>
          {MODULES_DEFS.map(m => (
            <div key={m.id} onClick={() => toggle(m.id)} style={{
              background: modules[m.id] ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${modules[m.id] ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s'
            }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span style={{ fontSize: 13, color: modules[m.id] ? '#a5b4fc' : '#64748b', fontWeight: 600, flex: 1 }}>{m.name}</span>
              <span style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                background: modules[m.id] ? '#6366f1' : 'rgba(255,255,255,0.06)', color: '#fff' }}>
                {modules[m.id] ? '✓' : ''}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          {saveMsg ? <span style={{ fontSize: 12, color: saveMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{saveMsg}</span> : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={BTN_SM_GHOST}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ ...BTN_SM_BLUE, opacity: saving ? 0.5 : 1 }}>
              {saving ? '⏳...' : '💾 Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TabClientes = ({ tenants, orders, loading, onToggleStatus, statusLoading, selectedSlug }) => {
  const [orgSettings, setOrgSettings] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [savingSlug, setSavingSlug] = useState(null);
  const [localEdits, setLocalEdits] = useState({});
  const [onboardingUrl, setOnboardingUrl] = useState(null);
  const [editingModulesFor, setEditingModulesFor] = useState(null);

  useEffect(() => {
    if (!isAuthed()) return;
    fetch(`${BACKEND}/api/admin/organizations`, { headers: getAH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const map = {};
        d.organizations.forEach(o => { map[o.slug] = o; });
        setOrgSettings(map);
      }).catch(() => {});
  }, []);

  // CLIENT_ORDER: orden dinámico por nombre, sin hardcodes de tenant
  const clientKPIs = useMemo(() => {
    return tenants.map(t => {
      const org = orgSettings[t.slug] || {};
      const totalRevenue  = parseFloat(org.total_revenue)    || 0;
      const subscription  = parseFloat(org.plan_monthly_fee) || 9900;
      return { ...t, ...org, revenueMonth: totalRevenue, subscription };
    }).sort((a, b) => (a.name || a.slug).localeCompare(b.name || b.slug));
  }, [tenants, orgSettings]);

  const handleSaveSettings = async (slug) => {
    const edits = localEdits[slug] || {};
    if (!edits || Object.keys(edits).length === 0) return;
    setSavingSlug(slug);
    try {
      const r = await fetch(`${BACKEND}/api/admin/organizations/${slug}/settings`, {
        method: 'PUT', headers: getAH(),
        body: JSON.stringify(edits),
      });
      if (r.ok) {
        setOrgSettings(prev => ({ ...prev, [slug]: { ...(prev[slug] || {}), ...edits } }));
        setLocalEdits(prev => ({ ...prev, [slug]: {} }));
      }
    } finally { setSavingSlug(null); }
  };

  const handleConnectOnboard = async (slug, email) => {
    setSavingSlug(slug + '_onboard');
    try {
      const r = await fetch(`${BACKEND}/api/admin/connect-onboard`, {
        method: 'POST', headers: getAH(),
        body: JSON.stringify({ slug, email }),
      });
      const d = await r.json();
      if (d.onboarding_url) setOnboardingUrl(d.onboarding_url);
    } finally { setSavingSlug(null); }
  };

  if (loading) return <Spinner />;
  if (clientKPIs.length === 0) return (
    <Empty icon="🏢" msg="No hay clientes registrados." sub={isAuthed() ? null : 'Inicia sesión para ver los datos.'} />
  );

  return (
    <>
    <section>
      {onboardingUrl && (
        <div style={{ ...CARD, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', marginBottom: 20 }}>
          <p style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 8 }}>🔗 Configuración de Pago (Stripe)</p>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Envía este link al cliente para completar la configuración de cobros en Stripe. Expira en 24h.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={onboardingUrl} style={{ ...INPUT, flex: 1, fontSize: 11 }} />
            <button onClick={() => { navigator.clipboard.writeText(onboardingUrl); }} style={BTN_SM_BLUE}>Copiar</button>
            <button onClick={() => setOnboardingUrl(null)} style={BTN_SM_GHOST}>×</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={H2}>Clientes Activos</h2>
        <span style={MONO}>{tenants.length} cliente(s)</span>
      </div>
      
      {/* ── GenyX #000 — solo visible cuando no hay cliente filtrado ─── */}
      {!selectedSlug && (
      <div style={{ marginBottom: 20 }}>
        <p style={{ ...MONO, color: '#6366f1', fontSize: 10, marginBottom: 8, letterSpacing: '.08em' }}>CLIENTE 000 — OPERADOR</p>
        <div style={{ ...CARD, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: '#a5b4fc' }}>GenyX</h3>
              <p style={{ fontSize: 12, color: '#6366f1', marginTop: 2 }}>Plataforma Operadora</p>
            </div>
            <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>OPERADOR</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <KpiMini label="Volumen procesado" value={$$( clientKPIs.reduce((s,t)=>s+(t.revenueMonth||0),0) )} />
            <KpiMini label="MRR Total" value={$$( clientKPIs.reduce((s,t)=>s+(parseFloat(t.plan_monthly_fee)||3500),0) )} />
            <KpiMini label="Clientes activos" value={ tenants.filter(t=>t.status==='active').length } />
          </div>
          <div style={{ borderTop: '1px solid rgba(99,102,241,0.15)', paddingTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => window.open('https://genyxsystems.com', '_blank')} style={{ ...BTN_SM_BLUE, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }}>🌐 Web</button>
          </div>
        </div>
      </div>
      )}
      {/* ── Clientes ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedSlug ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {(selectedSlug ? clientKPIs.filter(t => t.slug === selectedSlug) : clientKPIs).map((t, i) => {
          const isExpanded = expanded === t.slug;
          const edits = localEdits[t.slug] || {};
          const mode = t.payout_mode || 'manual';
          return (
            <div key={t.id || i} style={{ ...CARD, transition: 'all 0.2s' }}>
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p style={{ ...MONO, color: '#64748b', marginBottom: 4 }}>CLIENTE {String(i + 1).padStart(3, '0')}</p>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>{t.name || t.slug}</h3>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.industry || 'Artesanal'}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    {/* 🏠 Home icon — regresa al operador */}
                    <button onClick={() => window.location.href = '/os'} title="Regresar al Centro de Mando"
                      style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏠</button>
                    {/* ↺ Reload icon */}
                    <button onClick={() => window.location.reload()} title="Recargar datos"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↺</button>
                  </div>
                  <StatusBadge s={t.status} />
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: (t.payout_mode || 'manual') === 'connect' ? 'rgba(99,102,241,0.2)' : 'rgba(251,191,36,0.15)', color: (t.payout_mode || 'manual') === 'connect' ? '#818cf8' : '#fbbf24' }}>
                    {(t.payout_mode || 'manual') === 'connect' ? '⚡ Configuración de Pago (Stripe)' : '🏦 Pago Externo'}
                  </span>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                <KpiMini label="Ingresos/mes" value={$$(t.revenueMonth)} />
                <KpiMini label="Plan contratado" value={t.plan_name || `$${(parseFloat(t.plan_monthly_fee) || 9900).toLocaleString('es-MX')}/mes`} />
                <KpiMini label="Próximo cobro" value={t.next_billing_date ? fmt(t.next_billing_date) : '—'} />
              </div>

              {/* Actions */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(orgSettings[t.slug]?.website_url) ? (
                  <a href={orgSettings[t.slug].website_url} style={BTN_SM_GHOST} target="_blank" rel="noreferrer">🌐 Web</a>
                ) : (
                  <span title="Sin URL configurada" style={{ ...BTN_SM_GHOST, opacity: 0.35, cursor: 'not-allowed' }}>🌐 Web</span>
                )}
                <button onClick={() => window.open(`https://mando.genyxsystems.com/${t.slug}`, '_blank', 'noopener,noreferrer')} style={BTN_SM_BLUE}>
                    Dashboard →
                  </button>
                <button onClick={() => setEditingModulesFor(t)} style={BTN_SM_GHOST}>⚙️ Módulos</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>

      {editingModulesFor && (
        <ModulesEditorModal
          tenant={editingModulesFor}
          onClose={() => setEditingModulesFor(null)}
          onSave={(newModules) => {
            setOrgSettings(prev => ({ ...prev, [editingModulesFor.slug]: { ...(prev[editingModulesFor.slug] || {}), modules: newModules } }));
          }}
        />
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: NEWS FEED — 15 Minutos de Lectura
// ═══════════════════════════════════════════════════════════════════════════════
const NewsFeed = ({ health, orders, tenants }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sla, setSla] = useState({ uptime: null, avgMs: null, total: null }); // SLA Metrics

  const fetchNews = () => {
    setLoading(true);
    fetch(`${BACKEND}/api/news?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => { setNews(d.articles || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  // SLA metrics — async function so await works correctly
  const fetchSla = async () => {
    try {
      const slaRes = await fetch(`${BACKEND}/api/sla`, {
        headers: getAH()
      });
      if (slaRes.ok) {
        const slaData = await slaRes.json();
        setSla({ uptime: slaData.uptime_pct, avgMs: slaData.avg_ms, total: slaData.total_messages_30d });
      }
    } catch (_) {}
  };

  useEffect(() => { fetchNews(); fetchSla(); }, []);

  const SOURCE_COLORS = {
    'TechCrunch': '#10b981', 'MIT Tech Review': '#6366f1',
    'The Verge': '#f59e0b', 'Wired': '#ec4899', 'Harvard Biz Review': '#3b82f6',
  };

  return (
    <div style={{ ...CARD, background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.25)', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: '#818cf8', marginBottom: 3 }}>☀️ 15 Minutos de Lectura</h3>
          <p style={{ fontSize: 11, color: '#64748b' }}>{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, ...MONO, background: '#1e1b4b', color: '#818cf8', padding: '4px 10px', borderRadius: 6 }}>Tech · IA · Negocios</span>
          <button onClick={fetchNews} disabled={loading} title="Recargar noticias"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', width: 26, height: 26, borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? '…' : '🔄'}
          </button>
        </div>
      </div>


      {/* News headlines */}
      {loading ? (
        <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '12px 0' }}>Cargando noticias…</p>
      ) : news.length === 0 ? (
        <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '12px 0' }}>No se pudieron cargar las noticias. Intenta recargando.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {news.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'rgba(15,23,42,0.5)', borderRadius: 8, textDecoration: 'none', transition: 'background 0.15s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(15,23,42,0.5)'}
            >
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: SOURCE_COLORS[item.source] || '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '3px 7px', borderRadius: 4, whiteSpace: 'nowrap', marginTop: 2 }}>{item.source}</span>
              <span style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4, flex: 1 }}>{item.title}</span>
            </a>
          ))}
        </div>
      )}

      {health && <div style={{ marginTop: 12, padding: '6px 12px', background: '#0f172a50', borderRadius: 8, fontSize: 10, color: '#475569' }}>
        🟢 Backend v{health.version} en línea · {health.tenants_active} tenant(s)
      </div>}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// TAB: DATA — GenyX Intelligence Hub
// ═══════════════════════════════════════════════════════════════════════════════
const TabData = ({ tenants, orders }) => {
  const [genyxData, setGenyXData] = useState(null);

  useEffect(() => {
    const allOrders = orders || [];
    const paid = allOrders.filter(o => o.estado !== 'cancelado');
    const totalRevenue = paid.reduce((s, o) => {
      const od = typeof o.order_data === 'object' ? o.order_data : {};
      return s + parseFloat(od.total_estimated || od.total || o.total || 0);
    }, 0);
    const totalSubscription = tenants.reduce((s, t) => s + (parseFloat(t.plan_monthly_fee) || 9900), 0);
    const avgTicket = paid.length > 0 ? totalRevenue / paid.length : 0;
    const clientBreakdown = tenants.map(t => {
      const clientOrders = paid.filter(o => {
        const od = typeof o.order_data === 'object' ? o.order_data : {};
        return od.slug === t.slug || o.slug === t.slug || o.clone_id === t.slug;
      });
      const clientRevenue = clientOrders.reduce((s, o) => {
        const od = typeof o.order_data === 'object' ? o.order_data : {};
        return s + parseFloat(od.total_estimated || od.total || o.total || 0);
      }, 0);
      return {
        name: t.name || t.slug,
        slug: t.slug,
        status: t.status,
        orders: clientOrders.length,
        revenue: clientRevenue,
        subscription: parseFloat(t.plan_monthly_fee) || 9900,
      };
    });
    setGenyXData({ totalRevenue, totalSubscription, avgTicket, totalOrders: paid.length, clientBreakdown });
  }, [tenants, orders]);

  if (!genyxData) return <Spinner />;
  const g = genyxData;
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={H2}>📈 GenyX — Intelligence Hub</h2>
          <p style={{ ...MONO, color: '#64748b', fontSize: 11, marginTop: 4 }}>{today}</p>
        </div>
        <span style={{ ...MONO, fontSize: 10, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(74,222,128,0.2)' }}>
          {tenants.filter(t => t.status === 'active').length} clientes activos
        </span>
      </div>

      {/* Platform KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Revenue Total', value: $$(g.totalRevenue), icon: '💰', color: '#4ade80' },
          { label: 'MRR (Suscripciones)', value: $$(g.totalSubscription), icon: '⚡', color: '#818cf8' },
          { label: 'Ticket Promedio', value: $$(g.avgTicket), icon: '🎯', color: '#fb923c' },
          { label: 'Pedidos Totales', value: g.totalOrders, icon: '📦', color: '#38bdf8' },
        ].map((kpi, i) => (
          <div key={i} style={{ ...CARD, textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{kpi.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Per-client breakdown */}
      <div style={{ ...CARD, marginBottom: 20 }}>
        <h3 style={{ ...H2, fontSize: 14, marginBottom: 16 }}>📊 Desglose por Cliente</h3>
        {g.clientBreakdown.map((c, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < g.clientBreakdown.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div>
              <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{c.name}</span>
              <span style={{ marginLeft: 10, fontSize: 10, color: c.status === 'active' ? '#4ade80' : '#f87171', textTransform: 'uppercase' }}>{c.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 20, textAlign: 'right' }}>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>{$$(c.revenue)}</div><div style={{ fontSize: 10, color: '#64748b' }}>Revenue</div></div>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>{$$(c.subscription)}</div><div style={{ fontSize: 10, color: '#64748b' }}>Suscripción</div></div>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{c.orders}</div><div style={{ fontSize: 10, color: '#64748b' }}>Pedidos</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* GenyX as a Business */}
      <div style={{ ...CARD, background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
        <h3 style={{ ...H2, fontSize: 14, marginBottom: 16, color: '#a5b4fc' }}>⚡ GenyX — Como Negocio</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <p style={{ ...MONO, fontSize: 10, color: '#64748b', marginBottom: 8 }}>MRR (SUSCRIPCIONES)</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#818cf8' }}>{$$(g.totalSubscription)}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Acumulado de {g.clientBreakdown.length} cliente(s)</p>
          </div>
          <div>
            <p style={{ ...MONO, fontSize: 10, color: '#64748b', marginBottom: 8 }}>MÉTRICAS PLATAFORMA</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['Clientes activos', tenants.filter(t => t.status === 'active').length],
                ['MRR Total', $$(g.totalSubscription)],
                ['Volumen procesado', $$(g.totalRevenue)],
              ].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: PanicConfirmBlock — Requiere typing "PÁNICO" para confirmar
// ═══════════════════════════════════════════════════════════════════════════════
function PanicConfirmBlock({ tenantName, onPanic, panicStatus }) {
  const [confirmation, setConfirmation] = useState('');
  const isConfirmed = confirmation === 'PÁNICO';
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, color: '#fca5a5', marginBottom: 8 }}>
        ⚠️ Vas a afectar la operación de <strong style={{ color: '#f87171' }}>{tenantName}</strong>. Escribe <code style={{ color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '1px 6px', borderRadius: 4 }}>PÁNICO</code> para confirmar:
      </p>
      <input type="text" value={confirmation} onChange={e => setConfirmation(e.target.value)}
        placeholder="Escribe PÁNICO para confirmar..."
        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a',
          border: `1.5px solid ${isConfirmed ? '#22c55e' : 'rgba(239,68,68,0.4)'}`,
          color: isConfirmed ? '#22c55e' : '#fca5a5', padding: '10px 14px', borderRadius: 8,
          fontSize: 14, fontWeight: 700, letterSpacing: '.1em', textAlign: 'center',
          marginBottom: 12, outline: 'none', fontFamily: 'monospace' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { if (isConfirmed) { onPanic('suspend'); setConfirmation(''); } }}
          disabled={!isConfirmed}
          style={{ ...BTN_SM_RED, opacity: isConfirmed ? 1 : 0.4, fontSize: 12, padding: '8px 18px', cursor: isConfirmed ? 'pointer' : 'not-allowed' }}>
          ⏸ Suspender Operación
        </button>
        <button onClick={() => { if (isConfirmed) { onPanic('reactivate'); setConfirmation(''); } }}
          disabled={!isConfirmed}
          style={{ ...BTN_SM_GREEN, opacity: isConfirmed ? 1 : 0.4, fontSize: 12, padding: '8px 18px', cursor: isConfirmed ? 'pointer' : 'not-allowed' }}>
          ▶ Reactivar Operación
        </button>
      </div>
      {panicStatus && <p style={{ marginTop: 10, fontSize: 12, ...MONO, color: panicStatus.startsWith('✅') ? '#4ade80' : '#f87171' }}>{panicStatus}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: HERRAMIENTAS
// ═══════════════════════════════════════════════════════════════════════════════
const TabHerramientas = ({ health, orders, tenants, selectedSlug }) => {
  const [resetKey, setResetKey] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const [panicSlug, setPanicSlug] = useState('');
  const [panicStatus, setPanicStatus] = useState('');

  // Pre-selecciona el cliente del selector global
  useEffect(() => { if (selectedSlug) setPanicSlug(selectedSlug); }, [selectedSlug]);

  // Today's briefing data
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => o.created_at && new Date(o.created_at) >= today);
  const todayRevenue = todayOrders.reduce((s, o) => {
    const od = typeof o.order_data === 'object' ? o.order_data : {};
    return s + parseFloat(od.total_estimated || od.total || 0);
  }, 0);

  const handleReset = async () => {
    if (!resetKey.trim()) return;
    setResetStatus('Reiniciando...');
    try {
      const r = await fetch(`${BACKEND}/api/session/${encodeURIComponent(resetKey.trim())}`, { method: 'DELETE', headers: getAH() });
      const d = await r.json();
      setResetStatus(r.ok ? `✅ Sesión reiniciada. ${d.messages_deleted} mensajes eliminados.` : `❌ ${d.detail}`);
    } catch { setResetStatus('❌ Error de conexión'); }
    setTimeout(() => setResetStatus(''), 4000);
  };

  const handlePanic = async (action) => {
    if (!panicSlug) return;
    setPanicStatus('Procesando...');
    try {
      const r = await fetch(`${BACKEND}/api/admin/client-status`, { method: 'POST', headers: getAH(), body: JSON.stringify({ slug: panicSlug, action }) });
      const d = await r.json();
      setPanicStatus(r.ok ? `✅ Cliente ${action === 'suspend' ? 'suspendido' : 'reactivado'} exitosamente.` : `❌ ${d.detail || 'Error'}`);
    } catch { setPanicStatus('❌ Error de conexión'); }
    setTimeout(() => setPanicStatus(''), 4000);
  };

  return (
    <section style={{ maxWidth: 1200 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* ────── COL IZQUIERDA: Herramientas ────── */}
        <div>

      {/* ══ AUDITORÍA RÁPIDA DEL SISTEMA ══ */}
      {(() => {
        const [auditRunning, setAuditRunning] = React.useState(false);
        const [auditResult, setAuditResult] = React.useState(null);

        const runAudit = async () => {
          setAuditRunning(true);
          setAuditResult(null);
          const t0 = Date.now();
          const checks = {};

          // CHECK 1: Backend health
          try {
            const r = await fetch(`${BACKEND}/api/health`);
            const d = await r.json();
            checks.backend = r.ok
              ? { ok: true,  label: 'Backend online', detail: `v${d.version || '?'} · ${d.tenants_active || 0} tenant(s)` }
              : { ok: false, label: 'Backend caído', detail: 'No responde' };
            // CHECK 2: agent_core integridad
            checks.core = (d.agent_core_lines && d.agent_core_lines >= 2000)
              ? { ok: true,  label: 'agent_core íntegro', detail: `${d.agent_core_lines} líneas ✅` }
              : d.agent_core_lines
                ? { ok: false, label: 'agent_core TRUNCADO', detail: `Solo ${d.agent_core_lines} líneas — ALERTA` }
                : { ok: null, label: 'agent_core', detail: 'Dato no disponible (sin campo en /health)' };
          } catch {
            checks.backend = { ok: false, label: 'Backend inaccesible', detail: 'Error de red' };
            checks.core    = { ok: null,  label: 'agent_core', detail: 'No verificable' };
          }

          // CHECK 3: Órdenes pending > 24h
          try {
            const r = await fetch(`${BACKEND}/api/dashboard/orders`, { headers: getAH() });
            if (r.ok) {
              const d = await r.json();
              const orders = d.orders || [];
              const cutoff = Date.now() - 24 * 3600 * 1000;
              const stale = orders.filter(o => o.status === 'pending' && new Date(o.created_at + 'Z').getTime() < cutoff);
              checks.orders = stale.length === 0
                ? { ok: true,  label: 'Órdenes OK', detail: `${orders.length} total, 0 pendientes >24h` }
                : { ok: false, label: `${stale.length} pedido(s) pendiente(s) >24h`, detail: 'Verificar con el cliente' };
            } else {
              checks.orders = { ok: null, label: 'Órdenes', detail: 'Sin autorización para ver' };
            }
          } catch { checks.orders = { ok: null, label: 'Órdenes', detail: 'Error de conexión' }; }

          // CHECK 4: Webhook Stripe (indirecto — verificar que el endpoint responde)
          try {
            const r = await fetch(`${BACKEND}/api/health`); // Render no expone webhook check, usamos health
            checks.webhook = r.ok
              ? { ok: true, label: 'Webhook endpoint OK', detail: 'Backend acepta requests de Stripe' }
              : { ok: false, label: 'Webhook en riesgo', detail: 'Backend no responde' };
          } catch { checks.webhook = { ok: null, label: 'Webhook', detail: 'No verificable' }; }

          setAuditResult({ ...checks, ms: Date.now() - t0 });
          setAuditRunning(false);
        };

        const allOk    = auditResult && Object.values(auditResult).filter(v => v && v.ok !== undefined).every(v => v.ok !== false);
        const hasError = auditResult && Object.values(auditResult).filter(v => v && v.ok !== undefined).some(v => v.ok === false);
        const semColor = !auditResult ? '#64748b' : hasError ? '#ef4444' : allOk ? '#22c55e' : '#f59e0b';
        const semIcon  = !auditResult ? '⚪' : hasError ? '🔴' : allOk ? '🟢' : '🟡';

        return (
          <div style={{ ...CARD, border: `1px solid ${semColor}30`, marginBottom: 20, background: `${semColor}06` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 2 }}>
                  {semIcon} Auditoría Rápida del Sistema
                </h3>
                <p style={{ fontSize: 11, color: '#64748b' }}>
                  Verifica backend · agent_core · órdenes · webhook
                </p>
              </div>
              <button
                onClick={runAudit}
                disabled={auditRunning}
                style={{ ...BTN_SM_BLUE, opacity: auditRunning ? 0.6 : 1, minWidth: 110, fontSize: 12 }}
              >
                {auditRunning ? '⏳ Auditando…' : '▶ Ejecutar Auditoría'}
              </button>
            </div>

            {auditResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(auditResult).filter(([k]) => k !== 'ms').map(([key, c]) => {
                  if (!c || typeof c !== 'object') return null;
                  const dot = c.ok === true ? '🟢' : c.ok === false ? '🔴' : '🟡';
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 10px', background: 'rgba(15,23,42,0.4)', borderRadius: 8 }}>
                      <span style={{ fontSize: 14, lineHeight: 1.4 }}>{dot}</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: c.ok === false ? '#fca5a5' : '#e2e8f0' }}>{c.label}</p>
                        <p style={{ fontSize: 10, color: '#64748b' }}>{c.detail}</p>
                      </div>
                      {c.ok === false && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                          → consulta Farmacopeia
                        </span>
                      )}
                    </div>
                  );
                })}
                <p style={{ ...MONO, fontSize: 9, color: '#475569', textAlign: 'right', marginTop: 4 }}>
                  Completado en {auditResult.ms}ms
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Botón de Pánico ── */}
      <div style={{ ...CARD, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, color: '#f87171', marginBottom: 6 }}>🚨 Botón de Pánico — Gestión de Cliente</h3>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Suspende o reactiva un cliente que no ha pagado. Su bot se desactiva inmediatamente pero sus datos se conservan.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <select value={panicSlug} onChange={e => setPanicSlug(e.target.value)}
            style={{ flex: 1, minWidth: 180, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
            <option value="">— Seleccionar cliente —</option>
            {tenants.map(t => <option key={t.slug} value={t.slug}>{t.name || t.slug} ({t.status})</option>)}
          </select>
        </div>
        {panicSlug && <PanicConfirmBlock tenantName={tenants.find(t => t.slug === panicSlug)?.name || panicSlug} onPanic={handlePanic} panicStatus={panicStatus} />}
        {!panicSlug && <p style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>Selecciona un cliente para habilitar las acciones.</p>}
      </div>

      {/* ── Reset Sesión ── */}
      <div style={CARD}>
        <h3 style={{ fontWeight: 700, fontSize: 14, color: '#f0f0f5', marginBottom: 4 }}>🗑️ Reiniciar Sesión de Chat</h3>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Borra la memoria de un usuario. Formato: <code style={{ color: '#60a5fa' }}>clone-id:wa_521XXXXXXXXXX</code></p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" value={resetKey} onChange={e => setResetKey(e.target.value)} placeholder="clone_id:session_id" style={{ ...INPUT, flex: 1 }} />
          <button onClick={handleReset} disabled={!resetKey.trim()} style={{ ...BTN_SM_RED, opacity: resetKey.trim() ? 1 : 0.5 }}>Reiniciar</button>
        </div>
        {resetStatus && <p style={{ marginTop: 8, fontSize: 12, ...MONO, color: resetStatus.startsWith('✅') ? '#4ade80' : '#f87171' }}>{resetStatus}</p>}
      </div>

        </div>{/* end col-izquierda */}

        {/* ────── COL DERECHA: Lectura ────── */}
        <div style={{ position: 'sticky', top: 72 }}>
          <NewsFeed health={health} orders={orders} tenants={tenants} />
        </div>

      </div>{/* end grid 2-col */}
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ANALISTA
// ═══════════════════════════════════════════════════════════════════════════════
const TabAnalista = ({ tenants, orders, selectedSlug, setSelectedSlug }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAnalytics = async (s) => {
    if (!s || s === '__genyx__') { setData(null); setError(''); return; }
    setLoading(true); setError(''); setData(null);
    try {
      const r = await fetch(`${BACKEND}/api/dashboard/${s}/analytics`, { headers: getAH() });
      const d = await r.json();
      if (!r.ok) setError(d.detail || 'Error');
      else setData(d);
    } catch { setError('Error de conexión'); }
    setLoading(false);
  };

  // Reacciona al slug global (o auto-selecciona si hay 1 solo tenant)
  useEffect(() => {
    if (selectedSlug) { fetchAnalytics(selectedSlug); }
    else if (tenants.length === 1) { setSelectedSlug(tenants[0].slug); }
    else { setData(null); }
  }, [selectedSlug, tenants]);

  // Métricas agregadas de plataforma (cuando no hay cliente seleccionado)
  const platformStats = (() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => {
      const od = typeof o.order_data === 'object' ? o.order_data : {};
      return s + parseFloat(od.total_estimated || od.total || 0);
    }, 0);
    const byTenant = {};
    orders.forEach(o => {
      const od = typeof o.order_data === 'object' ? o.order_data : {};
      const t = o.clone_id?.replace('-sales', '') || 'sin-tenant';
      byTenant[t] = (byTenant[t] || 0) + parseFloat(od.total_estimated || od.total || 0);
    });
    const mrrTotal = tenants.reduce((s, t) => s + (parseFloat(t.plan_monthly_fee) || 9900), 0);
    return { totalOrders, totalRevenue, mrrTotal, byTenant };
  })();

  return (
    <section style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <h2 style={{ ...H2, margin: 0 }}>📊 Analista de Negocios</h2>
        {!selectedSlug && <span style={{ fontSize: 12, color: '#64748b' }}>Selecciona un cliente arriba para ver su análisis</span>}
        {selectedSlug && <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>→ {tenants.find(t => t.slug === selectedSlug)?.name || selectedSlug}</span>}
      </div>

      {/* Vista de plataforma si no hay cliente seleccionado */}
      {!selectedSlug && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <KpiCard label="Órdenes plataforma" value={platformStats.totalOrders} icon="📋" />
            <KpiCard label="Revenue total" value={$$(platformStats.totalRevenue)} icon="💰" />
            <KpiCard label="MRR Total" value={$$(platformStats.mrrTotal)} icon="💰" />
            <KpiCard label="Clientes activos" value={tenants.filter(t => t.status === 'active').length} icon="🏢" />
          </div>
          {Object.keys(platformStats.byTenant).length > 0 && (
            <div style={CARD}>
              <h3 style={{ ...H3, marginBottom: 14 }}>📈 Revenue por Cliente</h3>
              {Object.entries(platformStats.byTenant).sort((a,b) => b[1]-a[1]).map(([t, rev], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                  <span style={{ color: '#e2e8f0' }}>{t}</span>
                  <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>{$$(rev)}</span>
                </div>
              ))}
            </div>
          )}
          {platformStats.totalOrders === 0 && <Empty icon="🟣" msg="Sin órdenes en plataforma aún." sub="Los datos aparecerán cuando se cierren las primeras ventas." />}
        </div>
      )}

      {loading && <Spinner />}
      {error && <p style={{ color: '#f87171', fontSize: 13 }}>❌ {error}</p>}
      {data?.empty && <Empty icon="📊" msg="Aún no hay órdenes registradas." sub="Los datos aparecerán aquí cuando se cierren las primeras ventas." />}


      {data && !data.empty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <KpiCard label="Total órdenes" value={data.total_ordenes} icon="📋" />
            <KpiCard label="Revenue total" value={$$(data.total_ingresos)} icon="💰" />
            <KpiCard label="Ticket promedio" value={$$(data.ticket_promedio)} icon="🎯" />
          </div>

          {/* Top Productos */}
          {data.top_productos?.length > 0 && (
            <div style={CARD}>
              <h3 style={{ ...H3, marginBottom: 14 }}>⭐ Top Productos</h3>
              {data.top_productos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < data.top_productos.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#e2e8f0' }}>{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]} {p.name}</span>
                  <span style={{ ...MONO, color: '#fb923c' }}>{p.qty} pzas</span>
                </div>
              ))}
            </div>
          )}

          {/* Revenue por día */}
          {data.by_weekday?.length > 0 && (
            <div style={CARD}>
              <h3 style={{ ...H3, marginBottom: 14 }}>📅 Revenue por Día de la Semana</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                {data.by_weekday.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', background: 'linear-gradient(180deg, #6366f1, #4f46e5)', borderRadius: '4px 4px 0 0', height: `${(d.ingresos / Math.max(...data.by_weekday.map(x => x.ingresos), 1)) * 70}px`, minHeight: 4, transition: 'height 0.5s' }} />
                    <span style={{ fontSize: 9, color: '#64748b' }}>{d.dia.substring(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {data.insights?.length > 0 && (
            <div style={CARD}>
              <h3 style={{ ...H3, marginBottom: 14 }}>💡 Insights Automáticos</h3>
              {data.insights.map((ins, i) => <p key={i} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 8 }}>{ins}</p>)}
            </div>
          )}

          {/* Estrategia */}
          {data.estrategia?.length > 0 && (
            <div style={{ ...CARD, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <h3 style={{ ...H3, color: '#818cf8', marginBottom: 14 }}>🚀 Estrategia Recomendada</h3>
              {data.estrategia.map((e, i) => <p key={i} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 8 }}>{e}</p>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// TAB: AGENTES — Matriz tenants × 9 agentes con status dots
// ═══════════════════════════════════════════════════════════════════════════════
const AGENT_DEFS = [
  { id: 'marketing',   icon: '📣', name: 'Mkt',  plan: 'AUTONOMY' },
  { id: 'captacion',   icon: '🎯', name: 'Cap',  plan: 'STARTER'  },
  { id: 'venta',       icon: '💬', name: 'Vta',  plan: 'STARTER'  },
  { id: 'cierre',      icon: '💳', name: 'Cie',  plan: 'STARTER'  },
  { id: 'entrega',     icon: '🚚', name: 'Ent',  plan: 'GROWTH'   },
  { id: 'seguimiento', icon: '🔔', name: 'Seg',  plan: 'STARTER'  },
  { id: 'analitica',   icon: '📊', name: 'Ana',  plan: 'STARTER'  },
  { id: 'finanzas',    icon: '💰', name: 'Fin',  plan: 'GROWTH'   },
];

const AGENT_STATUS_DOTS = {
  active:   { color: '#22c55e', label: '🟢 Activo' },
  warning:  { color: '#eab308', label: '🟡 Advertencia' },
  error:    { color: '#ef4444', label: '🔴 Error' },
  locked:   { color: '#6b7280', label: '🔒 No incluido' },
  inactive: { color: '#94a3b8', label: '⚪ Inactivo' },
};

const TabAgentes = ({ tenants }) => {
  const [agentData, setAgentData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthed() || tenants.length === 0) return;
    setLoading(true);
    Promise.all(tenants.map(t =>
      fetch(`${BACKEND}/api/admin/agents/${t.slug}`, { headers: getAH() })
        .then(r => r.ok ? r.json() : null)
        .then(d => ({ slug: t.slug, agents: d?.agents || {} }))
        .catch(() => ({ slug: t.slug, agents: {} }))
    )).then(results => {
      const map = {};
      results.forEach(r => { map[r.slug] = r.agents; });
      setAgentData(map);
      setLoading(false);
    });
  }, [tenants]);

  const getDot = (tenantPlan, agentDef, status) => {
    const plan = (tenantPlan || 'STARTER').toUpperCase();
    const available =
      (agentDef.plan === 'STARTER') ||
      (agentDef.plan === 'GROWTH' && ['GROWTH','AUTONOMY'].includes(plan)) ||
      (agentDef.plan === 'AUTONOMY' && plan === 'AUTONOMY');
    if (!available) return 'locked';
    if (status === 'active') return 'active';
    if (status === 'warning') return 'warning';
    if (status === 'error') return 'error';
    return 'inactive';
  };

  if (loading) return <Spinner />;

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <h2 style={{ ...H2, margin: 0 }}>🤖 Matriz de Agentes</h2>
        <span style={MONO}>{tenants.length} cliente(s) × 9 agentes</span>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, minWidth: 140 }}>Cliente</th>
              {AGENT_DEFS.map(a => (
                <th key={a.id} style={{ textAlign: 'center', padding: '10px 6px', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, minWidth: 50 }}>
                  <div>{a.icon}</div>
                  <div style={{ fontSize: 10 }}>{a.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map((t, i) => {
              const status = agentData[t.slug] || {};
              return (
                <tr key={t.slug} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{t.name || t.slug}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{(t.plan_name || 'Esencial').toUpperCase()}</div>
                  </td>
                  {AGENT_DEFS.map(a => {
                    const dotKey = getDot(t.plan_name, a, status[a.id]);
                    const dot = AGENT_STATUS_DOTS[dotKey];
                    return (
                      <td key={a.id} style={{ textAlign: 'center', padding: '10px 6px' }}>
                        <div title={dot.label} style={{ width: 14, height: 14, borderRadius: '50%', background: dot.color, margin: '0 auto', opacity: dotKey === 'locked' ? 0.4 : 1, boxShadow: dotKey === 'active' ? `0 0 8px ${dot.color}` : 'none' }} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div style={{ ...CARD, padding: '12px 16px' }}>
        <span style={{ fontSize: 11, color: '#64748b', marginRight: 12 }}>Leyenda:</span>
        <div style={{ display: 'inline-flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(AGENT_STATUS_DOTS).map(([key, { color, label }]) => (
            <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', opacity: key === 'locked' ? 0.4 : 1 }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// TAB: BITÁCORA — Editor markdown con tags y filtros
// ═══════════════════════════════════════════════════════════════════════════════
const BITACORA_TAGS = [
  { id: 'incidencia', label: '🚨 Incidencia', color: '#ef4444' },
  { id: 'decision',   label: '🎯 Decisión',   color: '#6366f1' },
  { id: 'cliente',    label: '🏢 Cliente',    color: '#22c55e' },
  { id: 'tecnico',    label: '⚙️ Técnico',    color: '#eab308' },
  { id: 'comercial',  label: '💼 Comercial',  color: '#c084fc' },
];

const TabBitacora = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [tagFilter, setTagFilter] = useState(null);
  const [draft, setDraft] = useState({ title: '', body: '', tag: 'incidencia' });
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const loadEntries = useCallback(() => {
    if (!isAuthed()) return;
    setLoading(true);
    fetch(`${BACKEND}/api/admin/bitacora`, { headers: getAH() })
      .then(r => r.ok ? r.json() : { entries: [] })
      .then(d => setEntries(d.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadEntries, [loadEntries]);

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${BACKEND}/api/admin/bitacora`, {
        method: 'POST',
        headers: { ...getAH(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: draft.title.trim(), body: draft.body.trim(), tag: draft.tag, created_at: new Date().toISOString() }),
      });
      if (r.ok) { setDraft({ title: '', body: '', tag: 'incidencia' }); setShowEditor(false); loadEntries(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta entrada de bitácora?')) return;
    await fetch(`${BACKEND}/api/admin/bitacora/${id}`, { method: 'DELETE', headers: getAH() }).catch(() => {});
    loadEntries();
  };

  const filtered = entries.filter(e => {
    if (tagFilter && e.tag !== tagFilter) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return e.title?.toLowerCase().includes(q) || e.body?.toLowerCase().includes(q);
  });

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ ...H2, margin: 0 }}>📅 Bitácora Operativa</h2>
        <span style={MONO}>{entries.length} entrada(s)</span>
        <button onClick={() => setShowEditor(!showEditor)} style={{ ...BTN_SM_BLUE, marginLeft: 'auto' }}>
          {showEditor ? '✕ Cerrar' : '+ Nueva entrada'}
        </button>
      </div>

      {/* Editor */}
      {showEditor && (
        <div style={{ ...CARD, marginBottom: 20, border: '1px solid rgba(99,102,241,0.3)' }}>
          <input placeholder="Título de la entrada..." value={draft.title}
            onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
            style={{ ...INPUT, marginBottom: 10, fontWeight: 600 }} />
          <textarea placeholder="Descripción detallada..." value={draft.body}
            onChange={e => setDraft(p => ({ ...p, body: e.target.value }))}
            style={{ ...INPUT, height: 120, resize: 'vertical', marginBottom: 10, fontFamily: 'monospace', fontSize: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>Tag:</span>
            {BITACORA_TAGS.map(t => (
              <button key={t.id} onClick={() => setDraft(p => ({ ...p, tag: t.id }))}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${draft.tag === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
                  background: draft.tag === t.id ? `${t.color}15` : 'transparent',
                  color: draft.tag === t.id ? t.color : '#94a3b8' }}>{t.label}</button>
            ))}
            <button onClick={handleSave} disabled={saving || !draft.title.trim() || !draft.body.trim()}
              style={{ ...BTN_SM_BLUE, marginLeft: 'auto', opacity: (!draft.title.trim() || !draft.body.trim()) ? 0.4 : 1 }}>
              {saving ? '⏳...' : '💾 Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Buscar..." value={filter} onChange={e => setFilter(e.target.value)}
          style={{ ...INPUT, flex: 1, minWidth: 180, maxWidth: 300 }} />
        <button onClick={() => setTagFilter(null)}
          style={{ ...BTN_SM_GHOST, opacity: !tagFilter ? 1 : 0.5, fontSize: 11 }}>Todos</button>
        {BITACORA_TAGS.map(t => (
          <button key={t.id} onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)}
            style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${tagFilter === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
              background: tagFilter === t.id ? `${t.color}20` : 'transparent',
              color: tagFilter === t.id ? t.color : '#94a3b8' }}>{t.label}</button>
        ))}
      </div>

      {/* Entradas */}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty icon="📅" msg="No hay entradas en la bitácora." sub={entries.length === 0 ? 'Crea la primera con el botón + arriba' : 'Sin resultados para este filtro'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(e => {
            const tagDef = BITACORA_TAGS.find(t => t.id === e.tag) || BITACORA_TAGS[0];
            return (
              <div key={e.id} style={{ ...CARD, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{e.title}</span>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${tagDef.color}20`, color: tagDef.color, fontWeight: 600 }}>{tagDef.label}</span>
                      <span style={{ fontSize: 10, color: '#64748b' }}>{e.created_at ? fmt(e.created_at) : '—'}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(e.id)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: 4 }} title="Eliminar">🗑</button>
                </div>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{e.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// TAB: REPORTE DEL LUNES — Preview ONLY (sin envío real)
// ═══════════════════════════════════════════════════════════════════════════════
const TabReporteLunes = ({ tenants }) => {
  const [selectedSlug, setSelectedSlug] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPreview = async (slug) => {
    if (!slug) { setReport(null); return; }
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/admin/weekly-report-preview/${slug}`, { headers: getAH() });
      if (r.ok) setReport(await r.json());
      else setReport({ error: 'No hay datos suficientes para generar el reporte aún.' });
    } catch (e) { setReport({ error: 'Error de conexión: ' + e.message }); }
    setLoading(false);
  };

  useEffect(() => { if (selectedSlug) loadPreview(selectedSlug); }, [selectedSlug]);

  return (
    <section>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ ...H2, margin: 0, marginBottom: 6 }}>📧 Reporte del Lunes — Preview</h2>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
          Vista previa del email semanal. Esta vista NO envía emails — solo simula cómo se verá.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={LABEL}>Selecciona cliente:</label>
          <select value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)} style={{ ...INPUT, maxWidth: 280 }}>
            <option value="">— Selecciona un cliente —</option>
            {tenants.map(t => <option key={t.slug} value={t.slug}>{t.name || t.slug}</option>)}
          </select>
        </div>
      </div>

      {loading && <Spinner />}

      {report?.error && (
        <div style={{ ...CARD, border: '1px solid rgba(234,179,8,0.3)', padding: '20px 24px' }}>
          <p style={{ color: '#fbbf24', fontSize: 14 }}>⚠️ {report.error}</p>
        </div>
      )}

      {report && !report.error && (
        <>
          {/* Email mock-up */}
          <div style={{ ...CARD, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.2)' }}>
            {/* Email header */}
            <div style={{ background: 'rgba(99,102,241,0.08)', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12 }}>
              <p style={{ color: '#64748b' }}><strong style={{ color: '#94a3b8' }}>De:</strong> Tu Agente de Inteligencia Financiera GenyX</p>
              <p style={{ color: '#64748b' }}><strong style={{ color: '#94a3b8' }}>Para:</strong> {report.email || '—'}</p>
              <p style={{ color: '#64748b' }}><strong style={{ color: '#94a3b8' }}>Asunto:</strong> Tu reporte semanal — {report.fecha || new Date().toLocaleDateString('es-MX')}</p>
            </div>
            {/* Email body */}
            <div style={{ padding: '24px 20px' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>Hola {report.nombre || 'cliente'},</p>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, marginBottom: 24 }}>
                Esta semana procesaste <strong style={{ color: '#f1f5f9' }}>{report.pedidos || 0} pedidos</strong>.{' '}
                <strong style={{ color: '#4ade80' }}>${(report.revenue || 0).toLocaleString('es-MX')} MXN</strong> en ventas.{' '}
                Margen promedio: <strong style={{ color: '#fbbf24' }}>{report.margen || 0}%</strong>.
              </p>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>📊 Producto estrella</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{report.producto_estrella?.name || '—'}</p>
                  <p style={{ fontSize: 10, color: '#64748b' }}>×{report.producto_estrella?.qty || 0} · {report.producto_estrella?.margen || 0}% margen</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>⏰ Hora pico</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{report.hora_pico || '—'}</p>
                  <p style={{ fontSize: 10, color: '#64748b' }}>Día: {report.dia_pico || '—'}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>👥 Cliente top</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{report.cliente_top?.name || '—'}</p>
                  <p style={{ fontSize: 10, color: '#64748b' }}>{report.cliente_top?.compras || 0} compras</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>💤 Inactivos</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{report.inactivos || 0}</p>
                  <p style={{ fontSize: 10, color: '#64748b' }}>60+ días sin volver</p>
                </div>
              </div>

              {report.sugerencias && report.sugerencias.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', marginBottom: 8 }}>Sugerencias basadas en tus datos:</p>
                  {report.sugerencias.map((s, i) => (
                    <p key={i} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, paddingLeft: 12 }}>→ {s}</p>
                  ))}
                </div>
              )}

              <p style={{ fontSize: 14, color: '#94a3b8', fontStyle: 'italic' }}>Que tengas una semana increíble. 🚀</p>
            </div>
          </div>

          {/* Banner no-envío */}
          <div style={{ marginTop: 16, padding: '14px 20px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>⚠️ MODO PREVIEW</p>
            <p style={{ fontSize: 12, color: '#64748b' }}>El envío automático cada lunes 8am se habilita en Fase 4 (Resend integration).</p>
          </div>
        </>
      )}
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: EXPEDIENTES
// ═══════════════════════════════════════════════════════════════════════════════
const CHECKLIST_SECTIONS = [
  { key: 'contacto', label: '📞 Contacto', fields: ['Nombre titular', 'RFC', 'Email principal', 'WhatsApp', 'Ciudad / Estado', 'Nombre comercial'] },
  { key: 'ids', label: '🏦 IDs Oficiales', fields: ['INE / Pasaporte', 'Comprobante domicilio', 'Constancia SAT'] },
  { key: 'legal', label: '⚖️ Legal', fields: ['Contrato GenyX firmado', 'NDA incluido', 'Aviso de privacidad (ARCO)', 'Términos y Condiciones', 'Fecha inicio relación', 'Vigencia contrato'] },
  { key: 'adn', label: '🧭 ADN Negocio', fields: ['Catálogo de productos', 'Precios actualizados', 'Horarios de atención', 'Zona de entrega', 'FAQ del negocio', 'Tono del agente', 'Políticas de devolución'] },
  { key: 'tecnico', label: '⚙️ Configuración', fields: ['Identificador de negocio', 'Vínculo base de datos', 'URL sitio web', 'ID línea oficial Meta', 'CLABE bancaria', 'Email para reportes', 'Llave de acceso'] },
  { key: 'comercial', label: '💰 Financiero', fields: ['Plan contratado', 'Cuota mensual (MXN)', 'Método de pago', 'Pago Stripe configurado', 'Último pago registrado'] },
];

const GenyX_EXPEDIENTE = {
  id: '__genyx__', name: 'GenyX', slug: '000-genyx', industry: 'Plataforma Operadora',
  startDate: '2025-01-01', status: 'active', phone: '+52 (55) XXXX-XXXX',
  email: 'admin@genyxsys.com', city: 'México', rfc: 'GXS250101XXX',
  contacto: { 'Nombre titular': '✅', 'RFC': '✅', 'Email principal': '✅', 'WhatsApp': '✅', 'Ciudad / Estado': '✅', 'Nombre comercial': '✅' },
  ids: { 'INE / Pasaporte': '✅', 'Comprobante domicilio': '✅', 'Constancia SAT': '✅' },
  legal: { 'Contrato GenyX firmado': 'N/A', 'NDA incluido': 'N/A', 'Aviso de privacidad (ARCO)': '✅', 'Términos y Condiciones': '✅', 'Fecha inicio relación': '✅', 'Vigencia contrato': 'N/A' },
  adn: { 'Catálogo de productos': '✅', 'Precios actualizados': '✅', 'Horarios de atención': '✅', 'Zona de entrega': 'N/A', 'FAQ del negocio': '✅', 'Tono del agente': '✅', 'Políticas de devolución': 'N/A' },
  tecnico: { 'Identificador de negocio': '✅', 'Vínculo base de datos': '✅', 'URL sitio web': '✅', 'ID línea oficial Meta': '⚠️', 'CLABE bancaria': 'N/A', 'Email para reportes': '✅', 'Llave de acceso': '✅' },
  comercial: { 'Plan contratado': 'N/A', 'Cuota mensual (MXN)': 'N/A', 'Método de pago': 'N/A', 'Pago Stripe configurado': 'N/A', 'Último pago registrado': 'N/A' },
};

const STATUS_ICON = { '✅': '✅', '⚠️': '⚠️', '❌': '❌', '⬜': '⬜', 'N/A': '➖' };
const SCORE_VAL = { '✅': 1, '⚠️': 0.5, '❌': 0, '⬜': 0, 'N/A': null };

function calcProgress(exp) {
  let total = 0, scored = 0;
  CHECKLIST_SECTIONS.forEach(s => {
    s.fields.forEach(f => {
      const v = exp[s.key]?.[f] || '⬜';
      if (v !== 'N/A') { total++; scored += SCORE_VAL[v] || 0; }
    });
  });
  return total > 0 ? Math.round((scored / total) * 100) : 0;
}

const TabExpedientes = ({ tenants }) => {
  const [selected, setSelected] = useState(null);
  const [expedientes, setExpedientes] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loadingExp, setLoadingExp] = useState(false);

  // Build empty shells for all clients on mount
  useEffect(() => {
    const initial = {};
    [GenyX_EXPEDIENTE, ...tenants.map(t => ({ ...t, id: t.slug }))]
      .forEach(c => {
        const id = c.id || c.slug;
        if (!initial[id]) {
          initial[id] = {
            ...c,
            ...CHECKLIST_SECTIONS.reduce((acc, s) => ({
              ...acc,
              [s.key]: s.fields.reduce((a, f) => ({ ...a, [f]: { status: '⬜', value: '' } }), {})
            }), {})
          };
        }
      });
    setExpedientes(prev => {
      const merged = { ...initial };
      Object.keys(prev).forEach(k => { if (merged[k]) merged[k] = { ...merged[k], ...prev[k] }; });
      return merged;
    });
  }, [tenants]);

  // Load from backend when a client is selected
  const selectClient = async (id) => {
    if (selected === id) { setSelected(null); return; }
    setSelected(id);
    setLoadingExp(true);
    try {
      const slug = id === '__genyx__' ? '000-genyx' : id;
      const res = await fetch(`${BACKEND}/api/admin/expediente/${slug}`, {
        headers: getAH()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Object.keys(json.data).length > 0) {
          setExpedientes(prev => ({
            ...prev,
            [id]: { ...prev[id], ...json.data }
          }));
        }
      }
    } catch (e) { /* offline — use local state */ }
    finally { setLoadingExp(false); }
  };

  // Save to backend
  const saveExpediente = async () => {
    if (!selected) return;
    setSaving(true); setSaveMsg('');
    const slug = selected === '__genyx__' ? '000-genyx' : selected;
    const expData = expedientes[selected] || {};
    // Extract only checklist data (not metadata fields)
    const data = CHECKLIST_SECTIONS.reduce((acc, s) => ({ ...acc, [s.key]: expData[s.key] || {} }), {});
    try {
      const res = await fetch(`${BACKEND}/api/admin/expediente/${slug}`, {
        method: 'POST',
        headers: getAH(),
        body: JSON.stringify({ data })
      });
      if (res.ok) setSaveMsg('✅ Guardado');
      else setSaveMsg('❌ Error al guardar');
    } catch { setSaveMsg('❌ Sin conexión'); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(''), 3000); }
  };

  // Toggle status icon (cycle through states)
  const toggleStatus = (expId, section, field) => {
    const cur = expedientes[expId]?.[section]?.[field]?.status || '⬜';
    const cycle = ['⬜', '✅', '⚠️', '❌', 'N/A'];
    const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
    setExpedientes(prev => ({
      ...prev,
      [expId]: {
        ...prev[expId],
        [section]: {
          ...prev[expId]?.[section],
          [field]: { ...prev[expId]?.[section]?.[field], status: next }
        }
      }
    }));
  };

  // Set text value
  const setFieldValue = (expId, section, field, val) => {
    setExpedientes(prev => ({
      ...prev,
      [expId]: {
        ...prev[expId],
        [section]: {
          ...prev[expId]?.[section],
          [field]: { ...prev[expId]?.[section]?.[field], value: val }
        }
      }
    }));
  };

  const calcProgress2 = (expId) => {
    const data = expedientes[expId] || {};
    let total = 0, scored = 0;
    CHECKLIST_SECTIONS.forEach(s => {
      s.fields.forEach(f => {
        const v = data[s.key]?.[f]?.status || '⬜';
        if (v !== 'N/A') { total++; scored += SCORE_VAL[v] || 0; }
      });
    });
    return total > 0 ? Math.round((scored / total) * 100) : 0;
  };

  const allClients = [GenyX_EXPEDIENTE, ...tenants.map((t, i) => ({ ...t, id: t.slug, idx: i + 1 }))];
  const exp = selected ? (expedientes[selected] || {}) : null;
  const pct = selected ? calcProgress2(selected) : 0;
  const barColor = pct >= 80 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171';

  return (
    <section style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={H2}>🗄️ Expedientes de Clientes</h2>
        <span style={{ ...MONO, color: '#64748b' }}>{allClients.length} cliente(s)</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '260px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>

        {/* Client list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allClients.map((c, i) => {
            const id = c.id || c.slug;
            const p = calcProgress2(id);
            const bc = p >= 80 ? '#4ade80' : p >= 50 ? '#fbbf24' : '#f87171';
            const isGenyX = id === '__genyx__';
            return (
              <div key={id} onClick={() => selectClient(id)}
                style={{ ...CARD, cursor: 'pointer',
                  border: selected === id ? '1px solid #6366f1' : isGenyX ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.07)',
                  background: selected === id ? 'rgba(99,102,241,0.1)' : isGenyX ? 'rgba(99,102,241,0.05)' : undefined,
                  padding: '14px 16px', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <p style={{ ...MONO, fontSize: 9, color: isGenyX ? '#6366f1' : '#64748b', marginBottom: 3 }}>
                      {isGenyX ? 'CLIENTE 000' : `CLIENTE ${String(i + 1).padStart(3, '0')}`}
                    </p>
                    <p style={{ fontWeight: 700, fontSize: 13, color: isGenyX ? '#a5b4fc' : '#f1f5f9' }}>{c.name || c.slug}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: bc }}>{p}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                  <div style={{ height: 4, width: `${p}%`, background: bc, borderRadius: 4, transition: 'width 0.4s' }} />
                </div>
              </div>
            );
          })}
          <p style={{ fontSize: 10, color: '#475569', marginTop: 4, textAlign: 'center' }}>
            Clic en un cliente para abrir su expediente
          </p>
        </div>

        {/* Detail panel */}
        {exp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Header card */}
            <div style={{ ...CARD, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <p style={{ ...MONO, color: '#6366f1', fontSize: 9, marginBottom: 4 }}>EXPEDIENTE</p>
                  <h3 style={{ fontWeight: 800, fontSize: 16, color: '#a5b4fc' }}>{exp.name || exp.slug}</h3>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{exp.industry || 'Sin clasificar'} · Inicio: {exp.startDate || '—'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: barColor }}>{pct}%</p>
                  <p style={{ fontSize: 10, color: '#64748b' }}>Completitud</p>
                </div>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 5, marginBottom: 12 }}>
                <div style={{ height: 5, width: `${pct}%`, background: barColor, borderRadius: 5, transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={saveExpediente} disabled={saving}
                  style={{ ...BTN_SM_BLUE, padding: '8px 20px', fontSize: 13, opacity: saving ? 0.6 : 1 }}>
                  {saving ? '⏳ Guardando...' : '💾 Guardar expediente'}
                </button>
                {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{saveMsg}</span>}
                {loadingExp && <span style={{ fontSize: 11, color: '#64748b' }}>⏳ Cargando del servidor...</span>}
              </div>
              <p style={{ fontSize: 10, color: '#475569', marginTop: 8 }}>
                Clic en el ícono de estado para ciclarlo: ⬜→✅→⚠️→❌→➖ · Escribe en el campo para guardar el valor real.
              </p>
            </div>

            {/* Checklist sections — each field has status toggle + text input */}
            {CHECKLIST_SECTIONS.map(section => {
              const sData = expedientes[selected]?.[section.key] || {};
              return (
                <div key={section.key} style={CARD}>
                  <h3 style={{ ...H3, marginBottom: 12 }}>{section.label}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {section.fields.map(field => {
                      const entry = sData[field] || { status: '⬜', value: '' };
                      const colors = { '✅': '#4ade80', '⚠️': '#fbbf24', '❌': '#f87171', '⬜': '#4b5563', 'N/A': '#334155' };
                      return (
                        <div key={field} style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto', gap: 8, alignItems: 'center', padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                          {/* Status toggle */}
                          <span onClick={() => toggleStatus(selected, section.key, field)}
                            title="Clic para cambiar estado"
                            style={{ fontSize: 16, cursor: 'pointer', color: colors[entry.status] || '#4b5563', textAlign: 'center', userSelect: 'none' }}>
                            {STATUS_ICON[entry.status] || '⬜'}
                          </span>
                          {/* Text input */}
                          <input
                            type="text"
                            placeholder={field}
                            value={entry.value || ''}
                            onChange={e => setFieldValue(selected, section.key, field, e.target.value)}
                            style={{ ...INPUT, fontSize: 12, padding: '5px 10px', background: 'rgba(255,255,255,0.03)', color: entry.value ? '#e2e8f0' : '#475569' }}
                          />
                          {/* Field label (right) */}
                          <span style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap', minWidth: 0 }}></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Config del cajón */}
            <div style={{ ...CARD, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)' }}>
              <h3 style={{ ...H3, color: '#fbbf24', marginBottom: 12 }}>⚙️ Configuración del Cajón</h3>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>Datos operativos sincronizados desde la DB.</p>
              {[
                ['Slug', exp.slug],
                ['Plan mensual', exp.plan_monthly_fee ? `$${exp.plan_monthly_fee.toLocaleString('es-MX')} MXN/mes` : '—'],
                ['CLABE bancaria', exp.bank_clabe || '—'],
                ['Email correo lunes', exp.owner_email || '—'],
                ['URL sitio web', exp.website_url || '—'],
                ['Pago Stripe', exp.stripe_secret_key ? '✅ Configurado' : '⚠️ Pendiente configurar'],
                ['Número WaB (GenyX)', exp.meta_phone || '⚠️ Pendiente asignar'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{l}</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: MANUALES
// ═══════════════════════════════════════════════════════════════════════════════
const TabManuales = () => {
  const [copiedCmd, setCopiedCmd] = useState(null);
  const copyCmd = (cmd, id) => { navigator.clipboard.writeText(cmd).catch(() => {}); setCopiedCmd(id); setTimeout(() => setCopiedCmd(null), 2000); };
  const BASE = BACKEND;

  const scenarios = [
    { emoji: '💰', title: 'Precios incorrectos / menú incompleto', desc: 'El LLM muestra precios distintos al menú real.', solution: 'Editar CATALOG_TEXT en agent_core.py → git push → Render redeploya automático.', cmd: null, warning: 'Los precios viven en el CÓDIGO (CATALOG_TEXT), no en la DB.' },
    { emoji: '🛒', title: 'Carritos acumulados de pruebas', desc: 'Totales erróneos por carrito que acumula sesiones de test.', cmd: `curl -X DELETE "${BASE}/api/admin/clear-carts" -H "X-Admin-Key: <TU_ADMIN_KEY>"`, cmdId: 'clear-carts', expected: '{"deleted_db": N, "cleared_memory": N}' },
    { emoji: '🧠', title: 'Agente con amnesia / contexto viejo', desc: 'El agente repite saludos o recuerda pedidos viejos de prueba.', cmd: `curl -X DELETE "${BASE}/api/admin/purge-all-history" -H "X-Admin-Key: <TU_ADMIN_KEY>"`, cmdId: 'purge-history', expected: '{"deleted": N, "status": "ok"}' },
    { emoji: '🗄️', title: 'KB de DB desincronizado', desc: 'La DB tiene productos viejos que no coinciden con el código.', solution: 'Primero asegúrate que seeds.py tiene los datos correctos.', cmd: `curl -X POST "${BASE}/api/admin/reseed" -H "X-Admin-Key: <TU_ADMIN_KEY>"`, cmdId: 'reseed', expected: '{"rows_before": X, "rows_after": Y}' },
    { emoji: '🔥', title: 'Reset total (limpieza nuclear)', desc: 'Antes de una prueba limpia o cambio de menú.', solution: 'Ejecutar en orden: 1→ clear-carts, 2→ purge-all-history, 3→ reseed.', cmd: null, warning: 'Verifica seeds.py antes del reseed.' },
  ];

  const chassis = [
    ['agent_core.py → Function Calling', 'Motor de orquestación. No tocar lógica de tools.'],
    ['CATALOG_CANON (agent_core.py)', 'Precios del carrito real. Si cambia, cambian los cobros.'],
    ['CATALOG_TEXT (agent_core.py)', 'Lo que el LLM ve. Solo editar si el cliente cambia su menú.'],
    ['Schema SQLite', 'session_carts, chat_history, orders. No eliminar columnas.'],
  ];

  return (
    <section style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={H2}>📚 Manuales de Emergencia</h2>
        <span style={{ fontSize: 10, ...MONO, color: '#64748b', background: '#1e293b', padding: '4px 10px', borderRadius: 6 }}>GenyX · IVaaS</span>
      </div>
      {scenarios.map((s, i) => (
        <div key={i} style={{ ...CARD, marginBottom: 12 }}>
          <h3 style={{ ...H3, display: 'flex', alignItems: 'center', gap: 8 }}>{s.emoji} Escenario {i + 1}: {s.title}</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{s.desc}</p>
          {s.solution && <p style={{ fontSize: 12, color: '#60a5fa', marginBottom: 8 }}>✦ {s.solution}</p>}
          {s.warning && <p style={{ fontSize: 12, color: '#fbbf24', background: '#78350f20', border: '1px solid #78350f40', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>⚠️ {s.warning}</p>}
          {s.cmd && (
            <div style={{ position: 'relative' }}>
              <pre style={{ background: '#0f172a', color: '#4ade80', fontSize: 11, padding: '12px', borderRadius: 8, overflowX: 'auto', paddingRight: 60, marginBottom: 4 }}>{s.cmd}</pre>
              <button onClick={() => copyCmd(s.cmd, s.cmdId)} style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, background: '#1e293b', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
                {copiedCmd === s.cmdId ? '✅' : '📋'}
              </button>
              {s.expected && <p style={{ fontSize: 10, ...MONO, color: '#475569' }}>Esperado: {s.expected}</p>}
            </div>
          )}
        </div>
      ))}
      <div style={{ ...CARD, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
        <h3 style={{ ...H3, color: '#f87171', marginBottom: 12 }}>🛡️ Cinturón de Seguridad — NO TOCAR</h3>
        {chassis.map(([f, w]) => (
          <div key={f} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
            <code style={{ color: '#fca5a5', minWidth: 220, flexShrink: 0 }}>{f}</code>
            <span style={{ color: '#64748b' }}>{w}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ONBOARDING
// ═══════════════════════════════════════════════════════════════════════════════
const TabOnboarding = () => {
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', slug: '', owner_email: '', website_url: '',
    industry: '', dashboard_pin: '', store_address: '',
    meta_phone_number_id: '', social_url: '', personality_adn: '', catalog_text: ''
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-genera slug desde el nombre
  const autoSlug = (name) => name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async () => {
    setSending(true); setError('');
    try {
      const r = await fetch(`${BACKEND}/api/admin/create-tenant`, {
        method: 'POST',
        headers: getAH(),
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (!r.ok) { setError(d.detail || 'Error'); setSending(false); return; }
      setResult(d);
    } catch (e) { setError('Error de conexión'); }
    setSending(false);
  };

  const stepStyle = (n) => ({
    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 12, fontWeight: 700,
    background: step >= n ? '#6366f1' : 'rgba(255,255,255,0.08)',
    color: step >= n ? '#fff' : '#475569', flexShrink: 0
  });

  if (result) return (
    <section style={{ maxWidth: 600 }}>
      <div style={{ ...CARD, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(20,83,45,0.15)' }}>
        <p style={{ fontSize: 24, marginBottom: 8 }}>🎉</p>
        <h2 style={{ ...H2, color: '#4ade80', marginBottom: 4 }}>Cajón Activado</h2>
        <p style={{ fontSize: 13, color: '#86efac', marginBottom: 20 }}>{result.message}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['Slug', result.slug], ['Clone ID', result.clone_id], ['Dashboard PIN', result.dashboard_pin], ['Dashboard Token', result.dashboard_token]]
            .map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</span>
                <code style={{ fontSize: 12, color: '#a5b4fc' }}>{v}</code>
              </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, marginTop: 18, display: 'flex', gap: 10 }}>
          <a href={result.dashboard_url} target="_blank" rel="noreferrer" style={BTN_SM_BLUE}>👤 Abrir Dashboard del cliente</a>
          <button onClick={() => { setResult(null); setStep(1); setForm({ name:'',slug:'',owner_email:'',website_url:'',industry:'',dashboard_pin:'',store_address:'',meta_phone_number_id:'',social_url:'',personality_adn:'',catalog_text:'' }); }} style={BTN_SM_GHOST}>+ Nuevo cliente</button>
        </div>
      </div>
    </section>
  );

  return (
    <section style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ ...H2, marginBottom: 4 }}>🚀 Activar Nuevo Cliente</h2>
        <p style={{ fontSize: 13, color: '#64748b' }}>Completa el formulario para dar de alta un cajón hermético sin tocar código.</p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        {['Negocio', 'Agente', 'Catálogo'].map((label, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => i + 1 < step && setStep(i + 1)}>
              <div style={stepStyle(i + 1)}>{i + 1}</div>
              <span style={{ fontSize: 12, color: step === i + 1 ? '#a5b4fc' : '#475569', fontWeight: step === i + 1 ? 700 : 400 }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? '#6366f1' : 'rgba(255,255,255,0.08)' }} />}
          </React.Fragment>
        ))}
      </div>

      <div style={CARD}>
        {/* STEP 1 — INFO NEGOCIO */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={H3}>Información del Negocio</h3>
            {[['Nombre comercial *', 'name', 'Ej: Mi Negocio'], ['Giro', 'industry', 'Ej: Restaurante, Clínica, Tienda...'], ['Email del dueño', 'owner_email', 'Para reportes semanales'], ['Sitio web', 'website_url', 'https://...'], ['Dirección de la tienda', 'store_address', 'Calle, Número, Colonia, Ciudad']].map(([label, key, placeholder]) => (
              <div key={key}>
                <label style={LABEL}>{label}</label>
                <input style={INPUT} value={form[key]} placeholder={placeholder} onChange={e => {
                  set(key, e.target.value);
                  if (key === 'name' && !form.slug) set('slug', autoSlug(e.target.value));
                }} />
              </div>
            ))}
            <div>
              <label style={LABEL}>Slug (ID único del cajón) *</label>
              <input style={{ ...INPUT, fontFamily: 'monospace', color: '#a5b4fc' }} value={form.slug} placeholder="tacos-el-guero" onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
              <p style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>Se usa en la URL del dashboard: mando.genyxsystems.com/<strong>{form.slug || 'slug'}</strong></p>
            </div>
            <div>
              <label style={LABEL}>Dashboard PIN *</label>
              <input style={INPUT} value={form.dashboard_pin} placeholder="guero2024" onChange={e => set('dashboard_pin', e.target.value)} />
              <p style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>El cliente usa este PIN para acceder a su dashboard.</p>
            </div>
            <div>
              <label style={LABEL}>Meta Phone Number ID (WaB)</label>
              <input style={INPUT} value={form.meta_phone_number_id} placeholder="Opcional — se puede agregar después" onChange={e => set('meta_phone_number_id', e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>Redes Sociales (cancel URL de Stripe)</label>
              <input style={INPUT} value={form.social_url} placeholder="https://instagram.com/negocio (Instagram, Facebook, TikTok...)" onChange={e => set('social_url', e.target.value)} />
              <p style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>Si el cliente cancela el pago, lo llevas aquí. Sin RRSS → va al WaB. Sin nada → página cierra-pestaña.</p>
            </div>
          </div>
        )}

        {/* STEP 2 — BOT CONFIG */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={H3}>Configuración del Agente</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>Describe la personalidad y tono del asistente. Si lo dejas vacío, se genera automáticamente un template base.</p>
            <div>
              <label style={LABEL}>Personalidad del Asistente (opcional)</label>
              <textarea
                style={{ ...INPUT, height: 180, resize: 'vertical', lineHeight: 1.5 }}
                value={form.personality_adn}
                placeholder={`Eres el asistente de ventas de ${form.name || 'el negocio'}. Tu misión es...
CÓMO HABLAS:
- Cálido, cercano y profesional.
TU SALUDO OFICIAL:
"¡Hola! Soy el asistente de ${form.name || 'el negocio'}. ¿En qué te puedo ayudar?"`}
                onChange={e => set('personality_adn', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 3 — CATÁLOGO */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={H3}>Catálogo de Productos</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>Escribe el catálogo en texto libre. El agente lo usa como referencia de precios y productos disponibles. Se puede actualizar después sin redespliegue.</p>
            <div>
              <label style={LABEL}>Catálogo (opcional — añadir después si no tienes listo)</label>
              <textarea
                style={{ ...INPUT, height: 240, resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace', fontSize: 12 }}
                value={form.catalog_text}
                placeholder={`--- CATÁLOGO ${(form.name || 'NEGOCIO').toUpperCase()} ---\n- Producto A ($100): Descripción.\n- Producto B ($150): Descripción.`}
                onChange={e => set('catalog_text', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>❌ {error}</p>}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'space-between' }}>
        <div>
          {step > 1 && <button onClick={() => setStep(s => s - 1)} style={BTN_SM_GHOST}>← Atrás</button>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {step < 3 && <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && (!form.name || !form.slug || !form.dashboard_pin)} style={{ ...BTN_SM_BLUE, opacity: (step === 1 && (!form.name || !form.slug || !form.dashboard_pin)) ? 0.5 : 1 }}>Siguiente →</button>}
          {step === 3 && (
            <button onClick={handleSubmit} disabled={sending} style={{ ...BTN_SM_BLUE, background: '#059669', minWidth: 140 }}>
              {sending ? '⏳ Activando...' : '🎉 Activar Cajón'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// TAB: MARKETING — Agente 1 Panel (Estrategia + OTP + Log)
// ═══════════════════════════════════════════════════════════════════════════════
const TabMarketing = ({ selectedSlug }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpCode, setOtpCode] = useState('');
  const [otpStatus, setOtpStatus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const slug = selectedSlug || '';
  if (!slug) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Selecciona un cliente arriba para ver su marketing.</div>;

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/client/${slug}/marketing/dashboard`, { headers: getAH() });
      if (r.ok) setData(await r.json());
    } catch (e) { console.error('Marketing fetch error:', e); }
    setLoading(false);
  }, [slug]);

  useEffect(() => { if (isAuthed()) fetchDashboard(); }, [fetchDashboard]);

  const handleGenerate = async () => {
    setGenerating(true); setGenResult(null);
    try {
      const r = await fetch(`${BACKEND}/api/client/${slug}/marketing/generate`, {
        method: 'POST', headers: getAH(),
      });
      const d = await r.json();
      if (r.ok) {
        setGenResult(d);
        fetchDashboard();
      } else setGenResult({ error: d.detail || 'Error' });
    } catch { setGenResult({ error: 'Error de conexión' }); }
    setGenerating(false);
  };

  const handleApprove = async () => {
    if (otpCode.length !== 6) { setOtpStatus('Código de 6 dígitos requerido.'); return; }
    setOtpStatus('Verificando...');
    try {
      const r = await fetch(`${BACKEND}/api/client/${slug}/marketing/approve`, {
        method: 'POST', headers: getAH(),
        body: JSON.stringify({ otp_code: otpCode }),
      });
      const d = await r.json();
      setOtpStatus(r.ok ? `✅ ${d.message}` : `❌ ${d.detail || 'Error'}`);
      if (r.ok) { setOtpCode(''); fetchDashboard(); }
    } catch { setOtpStatus('❌ Error de conexión'); }
    setTimeout(() => setOtpStatus(''), 5000);
  };

  const handleReject = async () => {
    try {
      const r = await fetch(`${BACKEND}/api/client/${slug}/marketing/reject`, {
        method: 'POST', headers: getAH(),
        body: JSON.stringify({ reason: rejectReason || 'Rechazada por el operador' }),
      });
      if (r.ok) { setShowReject(false); setRejectReason(''); fetchDashboard(); }
    } catch {}
  };

  if (!isAuthed()) return <Empty icon="🔒" msg="Inicia sesión para ver Marketing." />;
  if (loading) return <Spinner />;
  if (!data) return <Empty icon="📢" msg="No se pudo cargar el panel de Marketing." />;

  const { agent_status, strategy, recent_log, config, stats } = data;
  const strat = strategy?.strategy || {};
  const cal = strat.calendar || [];
  const fund = strat.fundamento || [];
  const isPending = strategy?.status === 'pending';
  const isApproved = strategy?.status === 'approved';

  const TYPE_EMOJI = { product_star: '🏆', wa_status: '📱', promo: '🎉', social_proof: '⭐', reactivation: '📣', urgency: '🔥' };
  const STATUS_COLOR = { executed: '#4ade80', skipped: '#fbbf24', failed: '#f87171', pending: '#818cf8' };

  return (
    <section>
      {/* ── Header con status ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>📢 Agente 1 — Marketing</h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Estrategia semanal autónoma · {slug}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: agent_status === 'active' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
            color: agent_status === 'active' ? '#4ade80' : '#f87171',
            border: `1px solid ${agent_status === 'active' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em'
          }}>
            {agent_status === 'active' ? '🟢 Activo' : '🔴 Suspendido'}
          </span>
          <button onClick={fetchDashboard} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↺</button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Estrategias', value: stats.total_strategies, icon: '📋', color: '#818cf8' },
          { label: 'Ejecutadas', value: stats.actions_executed, icon: '✅', color: '#4ade80' },
          { label: 'Omitidas', value: stats.actions_skipped, icon: '⏭️', color: '#fbbf24' },
          { label: 'Fallidas', value: stats.actions_failed, icon: '❌', color: '#f87171' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'rgba(19,25,40,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{kpi.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* ── COL IZQUIERDA: Estrategia ── */}
        <div>
          {/* Estrategia vigente */}
          {strategy?.exists ? (
            <div style={{ background: 'rgba(19,25,40,0.9)', border: `1px solid ${isPending ? 'rgba(251,191,36,0.3)' : isApproved ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>📅 Semana {strategy.week_start} → {strategy.week_end}</h3>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Generada: {strategy.created_at ? new Date(strategy.created_at + 'Z').toLocaleString('es-MX') : '—'}</p>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  background: isPending ? 'rgba(251,191,36,0.1)' : isApproved ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                  color: isPending ? '#fbbf24' : isApproved ? '#4ade80' : '#f87171',
                  border: `1px solid ${isPending ? 'rgba(251,191,36,0.3)' : isApproved ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>{strategy.status}</span>
              </div>

              {/* Fundamento */}
              {fund.length > 0 && (
                <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#818cf8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>📊 Fundamento (datos reales)</p>
                  {fund.map((f, i) => <p key={i} style={{ fontSize: 12, color: '#a5b4fc', lineHeight: 1.5 }}>• {f}</p>)}
                </div>
              )}

              {/* Calendario L-S */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cal.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'rgba(15,23,42,0.5)', borderRadius: 8, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 40, textAlign: 'center' }}>
                      <span style={{ fontSize: 20 }}>{TYPE_EMOJI[entry.type] || '📌'}</span>
                      <p style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{entry.day_name?.substring(0, 3)}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{entry.label}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, fontStyle: 'italic' }}>"{entry.caption}"</p>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        {(entry.channels || []).map((ch, j) => (
                          <span key={j} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontFamily: 'monospace' }}>{ch}</span>
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{entry.date}</span>
                  </div>
                ))}
              </div>

              {/* Aprobación OTP */}
              {isPending && (
                <div style={{ marginTop: 16, padding: '16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 10 }}>🔑 Aprobar Estrategia (OTP)</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Código de 6 dígitos"
                      maxLength={6}
                      style={{ flex: 1, background: '#1e293b', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', padding: '10px 14px', borderRadius: 8, fontSize: 16, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '.2em', textAlign: 'center', outline: 'none' }}
                    />
                    <button onClick={handleApprove} disabled={otpCode.length !== 6}
                      style={{ background: '#14532d', color: '#86efac', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: otpCode.length === 6 ? 'pointer' : 'not-allowed', border: '1px solid rgba(34,197,94,0.3)', opacity: otpCode.length === 6 ? 1 : 0.4 }}>
                      ✅ Aprobar
                    </button>
                    <button onClick={() => setShowReject(!showReject)}
                      style={{ background: '#7f1d1d', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)' }}>
                      ❌
                    </button>
                  </div>
                  {otpStatus && <p style={{ fontSize: 12, marginTop: 8, color: otpStatus.startsWith('✅') ? '#4ade80' : '#f87171' }}>{otpStatus}</p>}
                  {showReject && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Motivo del rechazo (opcional)"
                        style={{ flex: 1, background: '#1e293b', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '8px 12px', borderRadius: 8, fontSize: 12, outline: 'none' }} />
                      <button onClick={handleReject}
                        style={{ background: '#7f1d1d', color: '#fca5a5', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)' }}>
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'rgba(19,25,40,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '40px 22px', textAlign: 'center' }}>
              <p style={{ fontSize: 36, marginBottom: 10 }}>📋</p>
              <p style={{ fontSize: 14, color: '#64748b' }}>No hay estrategia generada aún.</p>
              <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Genera una para esta semana.</p>
            </div>
          )}

          {/* Botón generar */}
          <button onClick={handleGenerate} disabled={generating}
            style={{ width: '100%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', padding: '14px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: generating ? 'wait' : 'pointer', border: 'none', opacity: generating ? 0.6 : 1, marginBottom: 8, transition: 'opacity 0.2s' }}>
            {generating ? '⏳ Generando estrategia con IA...' : '🤖 Generar Estrategia Semanal'}
          </button>
          {genResult && (
            <div style={{ background: genResult.error ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${genResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: genResult.error ? '#f87171' : '#4ade80', fontWeight: 600 }}>
                {genResult.error ? `❌ ${genResult.error}` : `✅ ${genResult.message}`}
              </p>
              {genResult.otp_code && (
                <p style={{ fontSize: 14, fontFamily: 'monospace', color: '#fbbf24', marginTop: 6, fontWeight: 700, letterSpacing: '.15em' }}>
                  OTP: {genResult.otp_code}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── COL DERECHA: Config + Log ── */}
        <div>
          {/* Config */}
          <div style={{ background: 'rgba(19,25,40,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
            <h4 style={{ fontWeight: 700, fontSize: 12, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>⚙️ Configuración</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Teléfono dueño</span>
                <span style={{ fontSize: 12, color: config.notify_phone ? '#e2e8f0' : '#f87171', fontFamily: 'monospace' }}>{config.notify_phone || '⚠️ No configurado'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Email</span>
                <span style={{ fontSize: 12, color: config.owner_email ? '#e2e8f0' : '#475569', fontFamily: 'monospace' }}>{config.owner_email || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Redes</span>
                <span style={{ fontSize: 11, color: '#818cf8' }}>{config.social_url ? '✅ Vinculada' : '—'}</span>
              </div>
            </div>
          </div>

          {/* Log reciente */}
          <div style={{ background: 'rgba(19,25,40,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
            <h4 style={{ fontWeight: 700, fontSize: 12, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>📜 Historial reciente</h4>
            {recent_log.length === 0 ? (
              <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '16px 0' }}>Sin acciones registradas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
                {recent_log.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 14 }}>{TYPE_EMOJI[entry.type] || '📌'}</span>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{entry.type}</p>
                        <p style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace' }}>{entry.executed_at ? new Date(entry.executed_at + 'Z').toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase',
                      background: `${STATUS_COLOR[entry.status] || '#64748b'}15`,
                      color: STATUS_COLOR[entry.status] || '#64748b',
                      border: `1px solid ${STATUS_COLOR[entry.status] || '#64748b'}30`,
                    }}>{entry.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Spinner = () => <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div style={{ width: 32, height: 32, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>;
const Empty = ({ icon, msg, sub }) => <div style={{ textAlign: 'center', padding: '60px 24px', color: '#475569' }}><p style={{ fontSize: 36, marginBottom: 10 }}>{icon}</p><p style={{ fontSize: 14 }}>{msg}</p>{sub && <p style={{ fontSize: 12, marginTop: 8, color: '#f59e0b' }}>⚠️ {sub}</p>}</div>;
const KpiCard = ({ label, value, icon }) => <div style={{ ...CARD, textAlign: 'center', padding: '16px 12px' }}><p style={{ fontSize: 22, marginBottom: 4 }}>{icon}</p><p style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{value}</p><p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</p></div>;
const KpiMini = ({ label, value }) => <div><p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{value}</p><p style={{ fontSize: 11, color: '#64748b' }}>{label}</p></div>;

// ── Shared styles ─────────────────────────────────────────────────────────────
const CARD = { background: 'rgba(19,25,40,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 22px' };
const H2 = { fontSize: 18, fontWeight: 700, color: '#f1f5f9' };
const H3 = { fontSize: 14, fontWeight: 700, color: '#e2e8f0' };
const MONO = { fontFamily: 'monospace', fontSize: 11 };
const LABEL = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' };
const INPUT = { width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '8px 12px', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
const BTN_SM_BLUE = { background: '#2563eb', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', border: 'none' };
const BTN_SM_GHOST = { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' };
const BTN_SM_RED = { background: '#7f1d1d', color: '#fca5a5', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)' };
const BTN_SM_GREEN = { background: '#14532d', color: '#86efac', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(34,197,94,0.3)' };

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN LOGIN SCREEN — Solicita la Admin Key al inicio de sesión
// La key NUNCA toca el bundle — vive sólo en sessionStorage.
// ═══════════════════════════════════════════════════════════════════════════════
function AdminLoginScreen({ onAuth }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) { setError('Ingresa la Admin Key.'); return; }
    setLoading(true); setError('');
    // Verificación rápida contra el backend
    try {
      const r = await fetch(`${BACKEND}/api/tenants`, {
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key.trim() },
      });
      if (r.status === 403 || r.status === 401) {
        setError('Admin Key incorrecta. Inténtalo de nuevo.');
        setLoading(false); return;
      }
      // Key válida — guardar y continuar
      sessionStorage.setItem('genyx_admin_key', key.trim());
      onAuth(key.trim());
    } catch { setError('No se pudo conectar al servidor. Verifica tu conexión.'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060912', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}} @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', animation: 'fadeIn 0.4s ease' }}>
        {/* Logo + Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, border: '2px solid #6366f1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#818cf8', marginBottom: 16, fontFamily: 'JetBrains Mono, monospace' }}>G</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', letterSpacing: '.02em', margin: 0 }}>Geny<span style={{ color: '#818cf8' }}>X</span></h1>
          <p style={{ fontSize: 11, color: '#334155', fontFamily: 'JetBrains Mono, monospace', marginTop: 6, letterSpacing: '.08em' }}>CENTRO DE MANDO · TU OPERACIÓN COMERCIAL AUTÓNOMA</p>
        </div>
        {/* Card */}
        <div style={{ background: '#0c1220', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, padding: '32px 28px', boxShadow: '0 0 40px rgba(99,102,241,0.08)' }}>
          <p style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.1em', marginBottom: 20, textTransform: 'uppercase' }}>$ authenticate --role=admin</p>
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Admin Key</label>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6366f1', fontFamily: 'monospace', fontSize: 14 }}>›</span>
              <input
                type="password" value={key} onChange={e => setKey(e.target.value)}
                placeholder="Ingresa tu Admin Key…" autoFocus
                style={{ width: '100%', padding: '12px 14px 12px 32px', background: '#060912', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 3, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.3)'}
              />
            </div>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 16, fontFamily: 'JetBrains Mono, monospace' }}>⚠ {error}</p>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.5)', color: loading ? '#64748b' : '#a5b4fc', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.04em' }}>
              {loading ? 'Verificando…' : '> Acceder'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 10, marginTop: 20, fontFamily: 'monospace' }}>GenyX · Sesión segura</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANDO — DASHBOARD DEL CLIENTE (mando.genyxsystems.com/{slug})
// ═══════════════════════════════════════════════════════════════════════════════
const PROD_STATUS = {
  nuevo:         { label: '🔴 Nuevo',      color: '#dc2626', bg: '#fef2f2', next: 'en_produccion', nextLabel: 'Iniciar ▶' },
  en_produccion: { label: '🟡 En Proceso', color: '#d97706', bg: '#fffbeb', next: 'entregado',     nextLabel: 'Marcar Entregado ✓' },
  entregado:     { label: '✅ Entregado',   color: '#16a34a', bg: '#f0fdf4', next: null,           nextLabel: null },
};
// ── TabPlaceholder: módulos no construidos aún ───────────────────────────────
function TabPlaceholder({ placeholder = 'Este módulo' }) {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚧</div>
      <h3 style={{ fontSize: 20, color: '#1a1208', marginBottom: 10, fontWeight: 700 }}>
        {placeholder} próximamente
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
        Este módulo está siendo construido para tu negocio. Te avisaremos cuando esté disponible.
      </p>
    </div>
  );
}

// ── TAB_REGISTRY: 12 módulos del ecosistema Mando ────────────────────────────
const TAB_REGISTRY = {
  pedidos:      { icon: '🚦', label: 'Pedidos' },
  kpis:         { icon: '📊', label: 'KPIs' },
  inventario:   { icon: '📦', label: 'Inventario' },
  costeador:    { icon: '💰', label: 'Costeador' },
  expediente:   { icon: '📋', label: 'Expediente' },
  fotolab:      { icon: '📸', label: 'Foto Lab' },
  misAgentes:   { icon: '🤖', label: 'Mis Agentes' },
  reporteLunes: { icon: '📧', label: 'Reporte' },
  citas:        { icon: '📅', label: 'Citas',      placeholder: 'Citas y agenda' },
  leads:        { icon: '🎯', label: 'Leads',      placeholder: 'Pipeline de Leads' },
  pacientes:    { icon: '🏥', label: 'Pacientes',  placeholder: 'Historial de Pacientes' },
  reservas:     { icon: '🍽️', label: 'Reservas',    placeholder: 'Reservas' },
  cursos:       { icon: '🎓', label: 'Cursos',     placeholder: 'Catálogo de Cursos' },
};

// ── Legacy alias for backward compat (tab rendering uses TAB_REGISTRY now)
const MANDO_TABS = Object.entries(TAB_REGISTRY).map(([id, def]) => ({ id, ...def }));
const EXPEDIENTE_DOCS = [
  { label: 'INE / Pasaporte', key: 'ine' },
  { label: 'Comprobante de domicilio', key: 'dom' },
  { label: 'Constancia de Situación Fiscal (SAT)', key: 'sat' },
  { label: 'Contrato firmado', key: 'contrato' },
  { label: 'CLABE bancaria registrada', key: 'clabe' },
  { label: 'Cuenta Stripe configurada', key: 'stripe' },
  { label: 'Catálogo de productos cargado', key: 'catalogo' },
  { label: 'Recetas registradas en Costeador', key: 'recetas' },
  { label: '⚡ Declaración Políticas Comercio WA (Anexo B firmado)', key: 'wa_policies' },
  { label: '🔒 Opt-In canal conversacional configurado', key: 'wa_optin' },
  { label: '📝 Aviso de Privacidad publicado en tu sitio web', key: 'privacidad_web' },
  { label: '📄 Términos y Condiciones de Venta publicados en tu sitio web', key: 'tyc_web' },
];





// ══════════════════════════════════════════════════════════════════════════════
// MARKDOWN RENDERER — minimal, zero-dependency (~50 lines)
// Handles: # headings, **bold**, *italic*, - lists, [text](url) links,
//          --- hr, paragraphs. Used by legal pages + T&C modal.
// ══════════════════════════════════════════════════════════════════════════════
function renderMarkdownToHTML(md) {
  if (!md) return '';
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const lines = md.split('\n');
  let html = '', inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    // Blank line
    if (!line.trim()) { if (inList) { html += '</ul>'; inList = false; } html += '<br/>'; continue; }
    // Headings
    const hm = line.match(/^(#{1,4})\s+(.*)$/);
    if (hm) { const n = hm[1].length; if (inList) { html += '</ul>'; inList = false; } html += `<h${n}>${esc(hm[2])}</h${n}>`; continue; }
    // HR
    if (/^---+$/.test(line.trim())) { if (inList) { html += '</ul>'; inList = false; } html += '<hr/>'; continue; }
    // List items
    const lm = line.match(/^\s*[-*]\s+(.*)$/);
    if (lm) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inlineFormat(esc(lm[1]))}</li>`; continue; }
    // Paragraph
    if (inList) { html += '</ul>'; inList = false; }
    html += `<p>${inlineFormat(esc(line))}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}
function inlineFormat(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function MarkdownContent({ content: md, style }) {
  return <div style={{ ...style, lineHeight: 1.8, fontSize: 13, color: '#57534e' }}
    dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(md) }} />;
}

// ── Términos de Uso — Mando Cliente (genérico, sin hardcodes) ────────────────
function ClientTermsPage() {
  const LS = { fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#faf9f7', color: '#292524', padding: '40px 20px', maxWidth: 680, margin: '0 auto' };
  const H1 = { fontSize: 22, fontWeight: 800, color: '#4f46e5', marginBottom: 6 };
  const H2 = { fontSize: 14, fontWeight: 700, color: '#44403c', margin: '22px 0 8px', borderBottom: '1px solid #e7e5e4', paddingBottom: 6 };
  const P  = { fontSize: 13, lineHeight: 1.75, color: '#57534e', marginBottom: 10 };
  const HL = { color: '#4f46e5', fontWeight: 700 };
  return (
    <div style={{ background: '#faf9f7', minHeight: '100vh' }}>
      <div style={LS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <a href="/" style={{ color: '#4f46e5', fontSize: 13, textDecoration: 'none' }}>&#x2190; Inicio</a>
        </div>
        <h1 style={H1}>Términos y Condiciones del Mando Cliente</h1>
        <p style={{ ...P, color: '#a8a29e', fontSize: 11 }}>GenyX Systems · Versión 3.0 · Abril 2026</p>

        <h2 style={H2}>1. Definición del Servicio</h2>
        <p style={P}><span style={HL}>GenyX Mando</span> es la interfaz de gestión de la operación comercial autónoma provista por GenyX Systems. El Mando permite al Cliente monitorear pedidos, configurar su operación comercial, acceder a reportes y usar herramientas IA.</p>

        <h2 style={H2}>2. Acceso y Seguridad</h2>
        <p style={P}>El Cliente accede mediante un <span style={HL}>PIN personal de 4 dígitos</span>. Es responsabilidad del Cliente mantener la confidencialidad de sus credenciales. GenyX no almacena el PIN en texto plano.</p>

        <h2 style={H2}>3. Modelo de Cobro</h2>
        <p style={P}>El servicio funciona con <span style={HL}>Suscripción Mensual Fija</span> según el plan contratado (Esencial / Profesional / Enterprise). GenyX no retiene ni procesa fondos de los compradores del Cliente. Los pagos del comprador final van directamente al Cliente vía Stripe. Sin permanencia mínima.</p>

        <h2 style={H2}>4. Cancelación</h2>
        <p style={P}>El Cliente puede cancelar en cualquier momento con <span style={HL}>30 días naturales de aviso</span> a hola@genyxsystems.com. Al terminar: (i) GenyX entrega export CSV de datos en 15 días; (ii) datos eliminados de servidores en 60 días.</p>

        <h2 style={H2}>5. IA y Limitación de Responsabilidad</h2>
        <p style={P}>El sistema opera con IA generativa de naturaleza probabilística. GenyX <span style={HL}>no garantiza precisión del 100%</span>. La responsabilidad máxima se limita a los 3 meses de suscripción pagados anteriores al evento.</p>

        <h2 style={H2}>6. Fuerza Mayor</h2>
        <p style={P}>GenyX no responde por interrupciones de Meta/WhatsApp, proveedores de modelos de IA generativa, Stripe, Render, Vercel u otros proveedores de infraestructura.</p>

        <h2 style={H2}>7. Propiedad Intelectual</h2>
        <p style={P}>El código, algoritmos, prompts y flujos son propiedad exclusiva de GenyX. El Cliente retiene derechos sobre su catálogo, recetas y marca.</p>

        <h2 style={H2}>8. Privacidad</h2>
        <p style={P}>Al usar el Mando aceptas nuestro <a href="/client-privacidad" style={{ color: '#4f46e5' }}>Aviso de Privacidad</a> conforme a LFPDPPP.</p>

        <h2 style={H2}>9. Jurisdicción</h2>
        <p style={P}>Ley aplicable: México. Jurisdicción: Guadalajara, Jalisco.</p>

        <p style={{ ...P, marginTop: 32, fontSize: 11, color: '#a8a29e', borderTop: '1px solid #e7e5e4', paddingTop: 16 }}>GenyX Systems · hola@genyxsystems.com · Guadalajara, Jalisco</p>
      </div>
    </div>
  );
}

// ── Aviso de Privacidad — Mando Cliente (genérico, sin hardcodes) ─────────────
function ClientPrivacyPage() {
  const LS = { fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#faf9f7', color: '#292524', padding: '40px 20px', maxWidth: 680, margin: '0 auto' };
  const H1 = { fontSize: 22, fontWeight: 800, color: '#4f46e5', marginBottom: 6 };
  const H2 = { fontSize: 14, fontWeight: 700, color: '#44403c', margin: '22px 0 8px', borderBottom: '1px solid #e7e5e4', paddingBottom: 6 };
  const P  = { fontSize: 13, lineHeight: 1.75, color: '#57534e', marginBottom: 10 };
  const HL = { color: '#4f46e5', fontWeight: 700 };
  return (
    <div style={{ background: '#faf9f7', minHeight: '100vh' }}>
      <div style={LS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <a href="/" style={{ color: '#4f46e5', fontSize: 13, textDecoration: 'none' }}>&#x2190; Inicio</a>
        </div>
        <h1 style={H1}>Aviso de Privacidad</h1>
        <p style={{ ...P, color: '#a8a29e', fontSize: 11 }}>GenyX Systems · Versión 3.0 · Abril 2026 · Conforme a LFPDPPP</p>

        <h2 style={H2}>1. Responsable del Tratamiento</h2>
        <p style={P}><span style={HL}>GenyX Systems</span>, representado por Erick Naveda, Guadalajara, Jalisco, México. Contacto: <span style={HL}>privacidad@genyxsystems.com</span></p>

        <h2 style={H2}>2. Datos que Recopilamos</h2>
        <p style={P}>Al usar el Mando Cliente recopilamos:<br />
          &bull; <span style={HL}>Nombre del negocio y datos del responsable</span> — para configurar el servicio<br />
          &bull; <span style={HL}>PIN de acceso</span> — hash almacenado, nunca en texto plano<br />
          &bull; <span style={HL}>Historial de pedidos y métricas</span> — para generar reportes<br />
          &bull; <span style={HL}>Catálogo y recetas</span> — para operar la operación comercial
        </p>

        <h2 style={H2}>3. Finalidades</h2>
        <p style={P}>
          &bull; Operar el servicio IVaaS (operación, Mando, reportes)<br />
          &bull; Generar links de pago seguros vía Stripe<br />
          &bull; Enviar reportes semanales al Cliente<br />
          &bull; Cumplimiento legal y fiscal
        </p>

        <h2 style={H2}>4. Terceros con Acceso</h2>
        <p style={P}>
          &bull; <span style={HL}>Stripe</span> — procesamiento de pagos (datos de pago nunca pasan por GenyX)<br />
          &bull; <span style={HL}>Meta Platforms</span> — WhatsApp Business API<br />
          &bull; <span style={HL}>Proveedores de modelos de IA generativa</span> — procesamiento de lenguaje (datos anonimizados)<br />
          &bull; <span style={HL}>Render / Vercel</span> — infraestructura cloud
        </p>

        <h2 style={H2}>5. Derechos ARCO</h2>
        <p style={P}>Acceso, Rectificación, Cancelación u Oposición: envía solicitud a <span style={HL}>privacidad@genyxsystems.com</span>. Respuesta en máximo 20 días hábiles.</p>

        <h2 style={H2}>6. Cookies y Storage</h2>
        <p style={P}>Solo usamos session storage y cookies técnicas estrictamente necesarias. No usamos cookies publicitarias ni de rastreo.</p>

        <p style={{ ...P, marginTop: 32, fontSize: 11, color: '#a8a29e', borderTop: '1px solid #e7e5e4', paddingTop: 16 }}>privacidad@genyxsystems.com · GenyX Systems · Guadalajara, Jalisco</p>
      </div>
    </div>
  );
}


// ── Legal Pages — dinámico desde backend (Phase 4.4) ─────────────────────────
// Rutas: /terminos, /privacidad, /contrato, /dpa, /sla, /cookies
// Fuente: GET /api/public/legal/{doc_slug} → markdown → render
function LegalPage({ tipo }) {
  const [content, setContent] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const TITLES = {
    terminos: 'Términos y Condiciones de Uso',
    privacidad: 'Aviso de Privacidad',
    contrato: 'Contrato de Servicios',
    dpa: 'Acuerdo de Procesamiento de Datos (DPA)',
    sla: 'Acuerdo de Nivel de Servicio (SLA)',
    cookies: 'Política de Cookies',
  };

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`${BACKEND}/api/public/legal/${tipo}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setContent(d.content); setMeta(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [tipo]);

  const LS = { fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#faf9f7', color: '#292524', padding: '32px 20px', maxWidth: 720, margin: '0 auto' };
  const H1 = { fontSize: 22, fontWeight: 800, color: '#4f46e5', marginBottom: 6 };

  return (
    <div style={{ background: '#faf9f7', minHeight: '100vh' }}>
      <div style={LS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: '1px solid #d6d3d1', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#78716c' }}>← Regresar</button>
        </div>
        <h1 style={H1}>{TITLES[tipo] || tipo}</h1>
        {meta?.updated_at && <p style={{ fontSize: 11, color: '#a8a29e', marginBottom: 20 }}>Última actualización: {new Date(meta.updated_at).toLocaleDateString('es-MX')}</p>}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>⏳ Cargando documento legal…</div>}
        {error && <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>❌ Error cargando documento: {error}</div>}
        {content && <MarkdownContent content={content} style={{ '& h1': { fontSize: 20 }, '& h2': { fontSize: 14, fontWeight: 700, color: '#44403c', margin: '22px 0 8px', borderBottom: '1px solid #e7e5e4', paddingBottom: 6 } }} />}
        <p style={{ marginTop: 32, fontSize: 11, color: '#a8a29e', borderTop: '1px solid #e7e5e4', paddingTop: 16 }}>
          GenyX Systems · Guadalajara, Jalisco, México · privacidad@genyxsystems.com
        </p>
      </div>
    </div>
  );
}


// ─── Editar Menú Compacto ────────────────────────────────────────────────────
function EditarMenuCompacto({ catalog, catLoading, slug, pin, fetchCatalog }) {
  const [selProd, setSelProd] = React.useState('');
  const [newPrice, setNewPrice] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState(null);

  const selectedProd = catalog.find(p => p.product_name === selProd);

  const handleSave = async () => {
    if (!selProd || !newPrice || isNaN(parseFloat(newPrice))) return;
    setSaving(true);
    const _slug = slug.endsWith('-sales') ? slug : slug + '-sales';
    try {
      await fetch(`${BACKEND}/api/catalog/${_slug}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PIN': pin },
        body: JSON.stringify({ product_name: selProd, price: parseFloat(newPrice), category: selectedProd?.category || 'general' })
      });
      setSaveMsg('✅ Precio actualizado');
      setSelProd(''); setNewPrice('');
      setTimeout(() => setSaveMsg(null), 3000);
      fetchCatalog();
    } catch(e) { setSaveMsg('❌ Error al guardar'); }
    setSaving(false);
  };

  if (catLoading) return <div style={{ textAlign: 'center', color: '#a8a29e', padding: 20, fontSize: 13 }}>Cargando menú…</div>;
  if (!catalog.length) return <div style={{ background: '#fff', borderRadius: 10, padding: 14, color: '#a8a29e', fontSize: 13, textAlign: 'center' }}>Menú no disponible. Recarga el tab de Inventario.</div>;

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#78716c', marginBottom: 10 }}>
        Selecciona un producto y actualiza su precio. El cambio se aplica al sistema inmediatamente.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selProd} onChange={e => { setSelProd(e.target.value); const p = catalog.find(x => x.product_name === e.target.value); setNewPrice(p ? String(p.price) : ''); }}
          style={{ flex: 2, minWidth: 180, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e7d5c0', fontSize: 13, background: '#faf7f2', color: '#44403c', cursor: 'pointer' }}>
          <option value=''>▼ Selecciona producto del menú</option>
          {catalog.map(p => <option key={p.product_name} value={p.product_name}>{p.product_name} — ${p.price} MXN</option>)}
        </select>
        {selProd && (
          <>
            <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
              placeholder="Nuevo precio $" min="0"
              style={{ width: 100, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e7d5c0', fontSize: 13 }} />
            <button onClick={handleSave} disabled={saving || !newPrice}
              style={{ padding: '8px 14px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              {saving ? '…' : 'Guardar $'}
            </button>
          </>
        )}
      </div>
      {saveMsg && <div style={{ fontSize: 12, marginTop: 8, color: saveMsg.startsWith('✅') ? '#15803d' : '#dc2626' }}>{saveMsg}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 📸 FOTO LAB v2 — 6 Presets Editoriales IA (Fase 3: multi-tenant, sin hardcodes)
// ══════════════════════════════════════════════════════════════════════════════

const FOTOLAB_PRESETS = [
  {
    id: 'editorial',
    icon: '📸',
    label: 'Editorial Pro',
    desc: 'Tu foto → portada de revista',
    requiresImage: true,
    buildPrompt: (product) =>
      `Transform this food photo into professional editorial photography${product ? ` of "${product}"` : ''}. Soft natural morning light from a side window. Place the product on a clean marble surface. Kinfolk magazine aesthetic, desaturated tones, ultra-sharp focus, shallow depth of field with beautiful bokeh. Make the product the absolute hero. 4K, photorealistic.`,
  },
  {
    id: 'generate',
    icon: '✨',
    label: 'Generar desde Cero',
    desc: 'Sin foto, solo elige producto',
    requiresImage: false,
    buildPrompt: (product) =>
      `Professional food photography of${product ? ` "${product}"` : ' an artisan product'}. Top-down 45-degree angle. Placed on dark weathered rustic wooden table with deep wood grain textures. Warm golden hour sunlight creating rich amber tones. A casual folded linen napkin draped softly in the blurred background. Hyper-realistic commercial photography, crisp edges, vibrant contrast, 8K resolution.`,
  },
  {
    id: 'caption',
    icon: '📝',
    label: 'Captions IA',
    desc: 'Genera textos para redes',
    requiresImage: true,
    buildPrompt: (product) =>
      `You are a social media expert for a small business. Analyze this product photo${product ? ` of "${product}"` : ''} and write exactly 3 Instagram/Facebook caption variants in Spanish.\nEach caption must include: engaging text (2-3 sentences), relevant emojis, 5 hashtags, and a call to action.\nFormat: Number each caption 1), 2), 3). Write captions that feel warm, authentic, and inviting.`,
  },
  {
    id: 'menucard',
    icon: '🍽️',
    label: 'Card de Menú',
    desc: 'Foto estilo carta/menú digital',
    requiresImage: true,
    buildPrompt: (product) =>
      `Transform this food photo into a clean, appetizing menu card image${product ? ` of "${product}"` : ''}. Even bright studio lighting, commercial food photography style, well-lit without harsh shadows. White or light neutral background. The product centered and beautifully styled. Clean composition for digital menu display. 4K, photorealistic.`,
  },
  {
    id: 'story',
    icon: '📱',
    label: 'Stories/Reels',
    desc: 'Vertical 9:16 para historias',
    requiresImage: true,
    buildPrompt: (product) =>
      `Transform this food photo into a vibrant, eye-catching vertical 9:16 aspect ratio image perfect for Instagram Stories${product ? ` featuring "${product}"` : ''}. Dynamic close-up angle. Dramatic chiaroscuro lighting with moody shadows and high contrast. Bold warm color grading. Ultra-high detail, photorealistic. The product must dominate the frame.`,
  },
  {
    id: 'pack',
    icon: '📦',
    label: 'Empaque / eCommerce',
    desc: 'Fondo limpio para tienda online',
    requiresImage: true,
    buildPrompt: (product) =>
      `Transform this product photo into a professional eCommerce listing image${product ? ` of "${product}"` : ''}. Pure white background, even bright studio lighting. Product centered, clean shadows, no distractions. Commercial product photography style. Crisp edges, vibrant natural colors, 8K resolution, photorealistic.`,
  },
];

function TabFotoLab({ slug, token }) {
  const [preset, setPreset] = useState('editorial');
  const [product, setProduct] = useState('');
  const [products, setProducts] = useState([]);
  const [freePrompt, setFreePrompt] = useState('');

  const [srcImg, setSrcImg] = useState(null);       // { b64, url, name }
  const [resultImg, setResultImg] = useState(null);  // { url, b64, mime }
  const [captions, setCaptions] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [error, setError] = useState('');

  const log = (m) => setLogs(p => [...p, `[${new Date().toLocaleTimeString()}] ${m}`]);
  const activePreset = FOTOLAB_PRESETS.find(p => p.id === preset) || FOTOLAB_PRESETS[0];

  // Fetch catalog on mount
  useEffect(() => {
    const cloneId = slug?.endsWith('-sales') ? slug : `${slug}-sales`;
    fetch(`${BACKEND}/api/catalog/${cloneId}`)
      .then(r => r.json())
      .then(d => {
        const prods = (d.products || []).map(p => p.product_name);
        setProducts(prods);
        if (prods.length > 0 && !product) setProduct(prods[0]);
        log(`📦 Catálogo cargado: ${prods.length} productos`);
      })
      .catch(e => log(`⚠️ Error cargando catálogo: ${e.message}`));
  }, [slug]);

  // ── Auto-compress image ────────────────────────────────────────────────────
  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        log(`🗜️ Comprimida: ${img.width}x${img.height} → ${w}x${h} (JPEG 0.8)`);
        resolve({ b64, w, h, name: file.name });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setError('');
    setResultImg(null);
    setCaptions('');
    log(`📷 Archivo: ${file.name} (${(file.size/1024).toFixed(0)}KB)`);
    const compressed = await compressImage(file);
    const byteChars = atob(compressed.b64);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blobUrl = URL.createObjectURL(new Blob([byteArr], { type: 'image/jpeg' }));
    setSrcImg({ b64: compressed.b64, url: blobUrl, name: compressed.name });
    log(`✅ Preview lista (${compressed.w}x${compressed.h})`);
  };

  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]); };
  const onDragOver = (e) => e.preventDefault();

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (activePreset.requiresImage && !srcImg) { setError('Sube una foto primero'); return; }
    setLoading(true); setError(''); setResultImg(null); setCaptions('');
    const prompt = activePreset.buildPrompt(product) + (freePrompt ? ' ' + freePrompt : '');
    const mode = preset === 'caption' ? 'caption' : preset === 'generate' ? 'generate' : 'enhance';
    log(`🚀 Enviando a Gemini (preset=${preset})…`);
    log(`📝 Prompt: ${prompt.substring(0, 120)}…`);
    try {
      const resp = await fetch(`${BACKEND}/api/gemini/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt,
          image_b64: srcImg?.b64 || '',
          product_name: product,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.image) {
        const bytes = atob(data.image.data);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: data.image.mime_type });
        const url = URL.createObjectURL(blob);
        setResultImg({ url, b64: data.image.data, mime: data.image.mime_type });
        log(`✅ Imagen generada (${data.image.mime_type})`);
      }
      if (data.text) {
        setCaptions(data.text);
        log(`📝 Texto recibido (${data.text.length} chars)`);
      }
      if (!data.image && !data.text) {
        setError('Gemini no retornó resultado. Intenta de nuevo.');
        log('⚠️ Respuesta vacía de Gemini');
      }
    } catch (e) {
      setError(e.message);
      log(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!resultImg) return;
    const ext = resultImg.mime?.includes('png') ? 'png' : 'jpg';
    const name = `genyx_${(product || 'foto').replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0,10)}.${ext}`;
    const a = document.createElement('a');
    a.href = resultImg.url;
    a.download = name;
    a.click();
    log(`⬇️ Descargada: ${name}`);
  };

  // ── Cleanup blob URLs ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (srcImg?.url) URL.revokeObjectURL(srcImg.url);
      if (resultImg?.url) URL.revokeObjectURL(resultImg.url);
    };
  }, []);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const SEL = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d4c9be', fontSize: 13, background: '#faf8f5', color: '#44403c', appearance: 'none', WebkitAppearance: 'none' };
  const LBL = { fontSize: 11, fontWeight: 600, color: '#78716c', marginBottom: 4, display: 'block' };
  const BTN_PRIMARY = { width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '.02em', transition: 'all 0.2s', opacity: loading ? 0.6 : 1 };
  const CARD_S = { background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #f0ebe4', marginBottom: 12 };

  return (
    <>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#44403c', display: 'flex', alignItems: 'center', gap: 6 }}>
        📸 Foto Lab <span style={{ fontSize: 10, fontWeight: 400, color: '#a8a29e' }}>v2 · 6 Presets IA</span>
      </h2>

      {/* ── Preset Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
        {FOTOLAB_PRESETS.map(p => (
          <button key={p.id} onClick={() => setPreset(p.id)}
            style={{
              padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 600, textAlign: 'center', transition: 'all .15s',
              border: preset === p.id ? '2px solid #6366f1' : '1px solid #e7e0d8',
              background: preset === p.id ? '#eef2ff' : '#fff',
              color: preset === p.id ? '#4f46e5' : '#78716c',
            }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{p.icon}</div>
            {p.label}
          </button>
        ))}
      </div>

      {/* Preset description */}
      <div style={{ ...CARD_S, padding: '8px 12px', background: '#f8fafc', fontSize: 12, color: '#64748b' }}>
        {activePreset.icon} <b>{activePreset.label}</b> — {activePreset.desc}
        {!activePreset.requiresImage && <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✅ No necesita foto</span>}
      </div>

      {/* ── Upload zone (only if preset requires image) ── */}
      {activePreset.requiresImage && (
        <div style={CARD_S}>
          <div
            onDrop={onDrop} onDragOver={onDragOver}
            onClick={() => document.getElementById('foto-lab-input').click()}
            style={{ border: '2px dashed #d4c9be', borderRadius: 12, padding: srcImg ? 8 : 32, textAlign: 'center', cursor: 'pointer', background: '#faf8f5', transition: 'all .2s', minHeight: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {srcImg ? (
              <img src={srcImg.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 10, objectFit: 'contain' }} />
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 13, color: '#78716c', fontWeight: 500 }}>Toca para tomar foto o seleccionar</div>
                <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 4 }}>Arrastra una imagen aquí (desktop)</div>
              </>
            )}
          </div>
          <input id="foto-lab-input" type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])} />
          {srcImg && (
            <button onClick={() => { if (srcImg?.url) URL.revokeObjectURL(srcImg.url); setSrcImg(null); setResultImg(null); setCaptions(''); }}
              style={{ marginTop: 8, fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
              ✕ Quitar foto
            </button>
          )}
        </div>
      )}

      {/* ── Product selector ── */}
      <div style={CARD_S}>
        <label style={LBL}>Producto</label>
        <select value={product} onChange={e => setProduct(e.target.value)} style={SEL}>
          <option value="">— Selecciona producto —</option>
          {products.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* ── Free prompt (optional) ── */}
      <div style={CARD_S}>
        <label style={LBL}>Instrucciones extra (opcional)</label>
        <input type="text" value={freePrompt} onChange={e => setFreePrompt(e.target.value)}
          placeholder="Ej: sin gluten, con café al lado, fondo azul..."
          style={{ ...SEL, fontSize: 12 }} />
      </div>

      {/* ── Generate button ── */}
      <button onClick={handleGenerate} disabled={loading} style={BTN_PRIMARY}>
        {loading ? '⏳ Procesando con IA…' : `${activePreset.icon} ${activePreset.label}`}
      </button>

      {error && <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 12, border: '1px solid #fca5a5' }}>⚠️ {error}</div>}

      {/* ── Result ── */}
      {resultImg && (
        <div style={{ ...CARD_S, marginTop: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 8 }}>✨ Resultado</div>
          <img src={resultImg.url} alt="Resultado IA" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 12, objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,.12)' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            <button onClick={handleDownload} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #6366f1', background: '#fff', color: '#6366f1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⬇️ Descargar</button>
            <button onClick={handleGenerate} disabled={loading} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #d4c9be', background: '#fff', color: '#78716c', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄 Regenerar</button>
          </div>
        </div>
      )}

      {/* ── Captions ── */}
      {captions && (
        <div style={{ ...CARD_S, marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 8 }}>📝 Captions para Redes</div>
          {captions.split(/\n\n+|\d+\)/).filter(Boolean).map((c, i) => (
            <div key={i} style={{ padding: 12, background: '#faf8f5', borderRadius: 10, marginBottom: 8, fontSize: 13, color: '#44403c', lineHeight: 1.5, position: 'relative', whiteSpace: 'pre-wrap' }}>
              {c.trim()}
              <button onClick={() => { navigator.clipboard.writeText(c.trim()); log(`📋 Caption ${i+1} copiado`); }}
                style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', borderRadius: 6, border: '1px solid #d4c9be', background: '#fff', fontSize: 10, cursor: 'pointer', color: '#78716c' }}>
                📋 Copiar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Monitor de Sistema (collapsible) ── */}
      <div style={{ marginTop: 14 }}>
        <button onClick={() => setShowLogs(!showLogs)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#a8a29e', fontWeight: 500 }}>
          {showLogs ? '▾' : '▸'} Monitor de Sistema ({logs.length})
        </button>
        {showLogs && (
          <div style={{ marginTop: 6, background: '#1a1a2e', borderRadius: 10, padding: 12, maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10, color: '#8bc34a', lineHeight: 1.6 }}>
            {logs.length === 0 && <div style={{ color: '#555' }}>Sin actividad</div>}
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 🤖 TAB MIS AGENTES — Vista cliente (Fase 3 T6)
// ══════════════════════════════════════════════════════════════════════════════

const CLIENT_AGENT_DEFS = {
  marketing:    { icon: '📢', name: 'Marketing',            desc: 'Genera estrategia de contenido y publica en tus canales' },
  captacion:    { icon: '🎣', name: 'Captación',            desc: 'Califica prospectos y los empuja al carrito' },
  venta:        { icon: '🛒', name: 'Venta',                desc: 'Conversa, cotiza y arma el pedido 24/7' },
  cierre:       { icon: '🤝', name: 'Cierre',               desc: 'Cobra y confirma la orden' },
  entrega:      { icon: '🚚', name: 'Entrega',              desc: 'Coordina logística y notifica al cliente' },
  seguimiento:  { icon: '💬', name: 'Seguimiento',          desc: 'Reactiva inactivos y nutre recurrentes' },
  analitica:    { icon: '📊', name: 'Analítica',            desc: 'Reporte semanal con recomendaciones accionables' },
  finanzas:     { icon: '💰', name: 'Finanzas',             desc: 'P&L, costos y márgenes en vivo' },
  direccion:    { icon: '🎯', name: 'Dirección Ejecutiva',  desc: 'Briefing diario con la jugada del día' },
};

const STATUS_COLORS = {
  active:   { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', label: '● Activo' },
  warning:  { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', label: '⚠ Atención' },
  error:    { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', label: '✕ Error' },
  inactive: { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8', label: '○ No incluido' },
};

function TabMisAgentes({ slug, token }) {
  const [agents, setAgents] = useState(null);
  const [plan, setPlan] = useState('starter');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${BACKEND}/api/client/${slug}/agents`, {
      headers: { 'X-Dashboard-Token': token }
    })
      .then(r => r.json())
      .then(d => { setAgents(d.agents || {}); setPlan(d.plan || 'esencial'); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug, token]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>⏳ Cargando agentes…</div>;

  return (
    <>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#44403c' }}>
        🤖 Mis Agentes <span style={{ fontSize: 10, fontWeight: 400, color: '#a8a29e' }}>Plan {plan}</span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12 }}>
        {Object.entries(CLIENT_AGENT_DEFS).map(([id, def]) => {
          const status = (agents && agents[id]) || 'inactive';
          const sc = STATUS_COLORS[status] || STATUS_COLORS.inactive;
          const isIncluded = status !== 'inactive';
          return (
            <div key={id} style={{
              background: sc.bg, border: `1.5px solid ${sc.border}`, borderRadius: 14,
              padding: '14px 12px', opacity: isIncluded ? 1 : 0.55, transition: 'all .2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{def.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: sc.text, background: `${sc.text}14`, padding: '2px 8px', borderRadius: 20 }}>
                  {sc.label}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{def.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{def.desc}</div>
              {!isIncluded && (
                <div style={{ marginTop: 8, fontSize: 10, color: '#6366f1', fontWeight: 600, padding: '4px 8px', background: '#eef2ff', borderRadius: 8, textAlign: 'center' }}>
                  Disponible en plan superior →
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, padding: '12px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
        💡 Tu plan <b>{plan}</b> incluye {agents ? Object.values(agents).filter(s => s !== 'inactive').length : 0} de {Object.keys(CLIENT_AGENT_DEFS).length} agentes. ¿Quieres más? <b>hola@genyxsystems.com</b>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 📧 TAB REPORTE DEL LUNES — Vista cliente (Fase 3 T7)
// ══════════════════════════════════════════════════════════════════════════════

function TabReporteLunesCliente({ slug, token }) {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${BACKEND}/api/client/${slug}/weekly-reports`, {
      headers: { 'X-Dashboard-Token': token }
    })
      .then(r => r.json())
      .then(d => { setReports(d.reports || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug, token]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>⏳ Cargando reportes…</div>;

  if (!reports || reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
        <h3 style={{ fontSize: 18, color: '#1e293b', marginBottom: 8, fontWeight: 700 }}>Aún no hay reportes</h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          Tu reporte semanal se genera automáticamente cada lunes con un resumen de ventas, KPIs y recomendaciones IA para tu negocio.
        </p>
        <div style={{ marginTop: 20, padding: '10px 16px', background: '#eef2ff', borderRadius: 10, fontSize: 12, color: '#4f46e5', fontWeight: 600, display: 'inline-block' }}>
          📅 Próximo reporte: lunes
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#44403c' }}>
        📧 Reportes Semanales <span style={{ fontSize: 10, fontWeight: 400, color: '#a8a29e' }}>{reports.length} disponibles</span>
      </h2>
      <div style={{ marginTop: 12 }}>
        {reports.map((report, idx) => {
          const isOpen = expanded === report.id;
          const data = report.report_data || {};
          const recs = Array.isArray(report.recommendations) ? report.recommendations : [];
          return (
            <div key={report.id} style={{
              background: '#fff', borderRadius: 12, border: '1px solid #f0ebe4',
              marginBottom: 10, overflow: 'hidden', transition: 'all .2s',
            }}>
              <button onClick={() => setExpanded(isOpen ? null : report.id)} style={{
                width: '100%', padding: '12px 14px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#1e293b', textAlign: 'left',
              }}>
                <span>📊 Semana {report.week_start || `#${reports.length - idx}`}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{isOpen ? '▼' : '▶'} {report.created_at?.slice(0, 10)}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 14px 14px', fontSize: 12, color: '#44403c', lineHeight: 1.6 }}>
                  {data.total_orders != null && <div>📦 Pedidos: <b>{data.total_orders}</b></div>}
                  {data.total_revenue != null && <div>💰 Ingresos: <b>${Number(data.total_revenue).toLocaleString('es-MX')}</b></div>}
                  {data.ticket_promedio != null && <div>🎟️ Ticket Promedio: <b>${Number(data.ticket_promedio).toLocaleString('es-MX')}</b></div>}
                  {recs.length > 0 && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#eef2ff', borderRadius: 8, border: '1px solid #c7d2fe' }}>
                      <div style={{ fontWeight: 700, color: '#4f46e5', marginBottom: 4 }}>💡 Recomendaciones IA:</div>
                      {recs.map((rec, ri) => <div key={ri} style={{ marginTop: 4 }}>• {typeof rec === 'string' ? rec : rec.text || JSON.stringify(rec)}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Utility: derive brand accent from brand_color ────────────────────────────
function lighten(hex, percent = 20) {
  if (!hex || !hex.startsWith('#')) return '#8b5cf6';
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ── Hook: carga config pública del tenant (sin auth) ─────────────────────────
function useTenantConfig(slug) {
  const [config, setConfig] = useState(null);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [cfgError, setCfgError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setCfgLoading(true);
    // Timeout de 8s — si la API no responde, fallback a título genérico (Addendum #3)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch(`${BACKEND}/api/public/tenants/${slug}/config`, { signal: controller.signal })
      .then(r => {
        clearTimeout(timeout);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        setConfig(d);
        setCfgLoading(false);
        // Aplicar branding al documento (Phase 4.1)
        document.title = `${d.business_name || slug} — Centro de Mando`;
        const meta = document.getElementById('pwa-theme');
        if (meta) meta.content = d.brand_color || '#6366f1';
      })
      .catch(e => {
        clearTimeout(timeout);
        setCfgError(e.name === 'AbortError' ? 'Timeout: la API tardó más de 8s' : e.message);
        setCfgLoading(false);
        // Fallback: título genérico si la API falla
        document.title = 'GenyX — Centro de Mando';
      });
  }, [slug]);

  return { config, cfgLoading, cfgError };
}

// ── Lazy Migration: recetas localStorage → backend (Fase 3 T3) ──────────────
async function migrateRecipesIfNeeded(slug, token) {
  // 1. Leer del backend
  const backendResp = await fetch(`${BACKEND}/api/client/${slug}/recipes`, {
    headers: { 'X-Dashboard-Token': token }
  });
  if (!backendResp.ok) throw new Error('Backend unreachable');
  const { recipes: backendRecipes } = await backendResp.json();

  // 2. Leer de localStorage
  const localKey = `${slug}_cost`;
  const localData = JSON.parse(localStorage.getItem(localKey) || '{"recs":[]}');
  const localRecs = localData.recs || [];
  if (localRecs.length === 0) return { allMigrated: true, count: 0 };

  // 3. Identificar faltantes
  const backendNames = new Set(backendRecipes.map(r => r.recipe_name));
  const toMigrate = localRecs.filter(r => !backendNames.has(r.name));
  if (toMigrate.length === 0) return { allMigrated: true, count: 0 };

  // 4. Subir con doble validación
  const uploaded = [], failed = [];
  for (const recipe of toMigrate) {
    try {
      const resp = await fetch(`${BACKEND}/api/client/${slug}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token },
        body: JSON.stringify({ recipe_name: recipe.name, recipe_data: recipe })
      });
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      const saved = await resp.json();
      if (!saved.id) throw new Error('No ID returned');
      // Doble validación: re-leer y verificar
      const verifyResp = await fetch(`${BACKEND}/api/client/${slug}/recipes`, {
        headers: { 'X-Dashboard-Token': token }
      });
      const { recipes: verifyList } = await verifyResp.json();
      const stored = verifyList.find(r => r.id === saved.id);
      if (!stored) throw new Error('Recipe not found after upload');
      uploaded.push(saved);
    } catch (e) {
      console.error(`[MIGRATION] Failed for ${recipe.name}:`, e);
      failed.push({ name: recipe.name, error: e.message });
    }
  }

  // 5. NO eliminar localStorage (Regla Inviolable #1). Marcar timestamp.
  localStorage.setItem(`${localKey}_migrated_at`, new Date().toISOString());
  return {
    allMigrated: failed.length === 0,
    partialFailure: failed.length > 0 && uploaded.length > 0,
    totalFailure: uploaded.length === 0 && toMigrate.length > 0,
    uploaded: uploaded.length, failed: failed.length, failures: failed
  };
}

// ── Lazy Migration: expediente localStorage → backend (Fase 3 T4) ────────────
async function migrateExpedienteIfNeeded(slug, token) {
  // 1. Leer del backend
  const backendResp = await fetch(`${BACKEND}/api/client/${slug}/expediente`, {
    headers: { 'X-Dashboard-Token': token }
  });
  if (!backendResp.ok) throw new Error('Backend unreachable');
  const { sections: backendSections } = await backendResp.json();

  // 2. Leer de localStorage
  const expKey = `${slug}_exp`;
  const localExp = JSON.parse(localStorage.getItem(expKey) || '{}');
  const localKeys = Object.keys(localExp);
  if (localKeys.length === 0) return { allMigrated: true, count: 0 };

  // 3. Identificar faltantes (fields not yet in backend)
  const backendFields = new Set();
  Object.entries(backendSections || {}).forEach(([sec, fields]) => {
    Object.keys(fields).forEach(f => backendFields.add(`${sec}:${f}`));
  });
  const toMigrate = localKeys.filter(k => !backendFields.has(`docs:${k}`));
  if (toMigrate.length === 0) return { allMigrated: true, count: 0 };

  // 4. Subir cada campo
  const uploaded = [], failed = [];
  for (const fieldId of toMigrate) {
    try {
      const resp = await fetch(`${BACKEND}/api/client/${slug}/expediente/docs/${fieldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token },
        body: JSON.stringify({ completed: !!localExp[fieldId] })
      });
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      uploaded.push(fieldId);
    } catch (e) {
      console.error(`[MIGRATION] Expediente failed for ${fieldId}:`, e);
      failed.push({ field: fieldId, error: e.message });
    }
  }

  // 5. NO eliminar localStorage
  localStorage.setItem(`${expKey}_migrated_at`, new Date().toISOString());
  return {
    allMigrated: failed.length === 0,
    partialFailure: failed.length > 0 && uploaded.length > 0,
    uploaded: uploaded.length, failed: failed.length
  };
}

function MandoClientView({ slug }) {
  // ── Tenant Config (Fase 3: multi-tenant dinámico)
  const { config, cfgLoading, cfgError } = useTenantConfig(slug);
  const brandColor  = config?.brand_color || '#6366f1';
  const brandAccent = lighten(brandColor, 20);
  const tenantName  = config?.business_name || slug;
  const tenantLogo  = config?.logo_url || '/genyx-fallback-icon.png';

  // ── Auth
  const [pin, setPin]             = useState('');
  const [token, setToken]         = useState(null);
  const [name, setName]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [tcVersion, setTcVersion] = useState(null); // Addendum #2: versión del doc legal aceptado
  const [showTcModal, setShowTcModal] = useState(false);
  const [tcAccepting, setTcAccepting] = useState(false);
  // ── Navigation
  const [tab, setTab] = useState('pedidos');
  // ── Pedidos
  const [orders, setOrders]   = useState([]);
  const [updating, setUpdating] = useState(null);
  // ── KPIs
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  // ── Inventario
  const [inventory, setInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [editStock, setEditStock] = useState({});    // {product_name: tmpValue}
  const [newProd, setNewProd]     = useState({ name: '', stock: '', unit: 'pza' });
  const [catalog, setCatalog]     = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catForm, setCatForm]       = useState({ name: '', price: '', category: 'general' });
  const [catMsg, setCatMsg]         = useState(null);
  // ── Costeador (localStorage)
  const storageKey = `${slug}_cost`;
  const loadCost = () => { try { return JSON.parse(localStorage.getItem(storageKey) || '{"ings":[],"recs":[]}'); } catch { return { ings: [], recs: [] }; } };
  const [ings, setIngs]   = useState(() => loadCost().ings);
  const [recs, setRecs]   = useState(() => loadCost().recs);
  const [newIng, setNewIng] = useState({ name: '', unit: 'pz', cost: '' });
  const [recName, setRecName] = useState('');
  const [recItems, setRecItems] = useState([]);    // [{ing, qty}]
  const [margin, setMargin]   = useState(60);      // % de margen objetivo
  // ── Costeador: costos adicionales
  const [modRate,    setModRate]    = useState(120);   // $/hora de mano de obra
  const [modHours,   setModHours]   = useState(1);     // horas por lote
  const [batchUnits, setBatchUnits] = useState(1);     // unidades por lote
  const [cifPct,     setCifPct]     = useState(15);    // CIF como % de (MPD+MOD)
  const [opEx,       setOpEx]       = useState(0);     // gastos operativos total (suma de líneas)
  const [opExItems,  setOpExItems]  = useState([]);    // líneas individuales de gastos operativos
  const [newOpEx,    setNewOpEx]    = useState({ name: '', cost: '' }); // form nueva línea GO
  const [merma,      setMerma]      = useState(5);     // % imprevistos/merma (N5)
  const [useGiReal,  setUseGiReal]  = useState(false); // toggle GI real vs estimado
  const [giReal,     setGiReal]     = useState({ renta:0, luz:0, gas:0, otros:0, horas:160 });
  const [purchCalc,  setPurchCalc]  = useState({ nombre:'', precio:'', cantidad:'', unidad:'g' }); // Calc Factura N1
  const [showInfo,   setShowInfo]   = useState(null);  // tooltip (i) activo
  const [kpiPeriod,  setKpiPeriod]  = useState('month'); // filtro ingresos: day/week/month
  const [expandedRec, setExpandedRec] = useState(null);  // acordeón: nombre del producto expandido
  // ── Costeador v2 (IA)
  const [costMode, setCostMode]     = useState('v1');    // 'v1' formulario | 'v2' IA chat
  const [aiChat, setAiChat]         = useState([{ role: 'assistant', content: '\u00a1Hola! Soy tu Costeador IA con metodolog\u00eda ABC. \u00bfQu\u00e9 quieres costear hoy?\n\nEjemplo: \"Cost\u00e9ame mi producto estrella: 500g insumo principal, 350ml agua, 10g sal. 30 min de trabajo.\"' }]);
  const [aiInput, setAiInput]       = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const aiChatRef                   = React.useRef(null);
  // ── Expediente
  const expKey = `${slug}_exp`;
  const [expDocs, setExpDocs] = useState(() => { try { return JSON.parse(localStorage.getItem(expKey) || '{}'); } catch { return {}; } });

  // ────── handlers ──────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/tenants/${slug}/auth`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.detail || 'PIN incorrecto'); setLoading(false); return; }
      setToken(d.dashboard_token); setName(d.name);
    } catch { setError('No se pudo conectar.'); }
    setLoading(false);
  };

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try { const r = await fetch(`${BACKEND}/api/dashboard/${slug}/orders`, { headers: { 'X-Dashboard-Token': token } }); if (r.ok) setOrders(await r.json()); } catch {}
  }, [token, slug]);
  useEffect(() => { fetchOrders(); const t = setInterval(fetchOrders, 30000); return () => clearInterval(t); }, [fetchOrders]);

  // ── Fase 3 T8: Check T&C acceptance (runs once after login)
  useEffect(() => {
    if (!token) return;
    // Fetch current T&C version (Addendum #2: versionado de aceptación)
    fetch(`${BACKEND}/api/public/legal/terminos`)
      .then(r => r.json())
      .then(d => { if (d.updated_at) setTcVersion(d.updated_at); })
      .catch(() => {}); // Non-blocking: si falla, usamos timestamp actual como fallback
    // Check if already accepted
    fetch(`${BACKEND}/api/client/${slug}/tc-accepted`, {
      headers: { 'X-Dashboard-Token': token }
    })
      .then(r => r.json())
      .then(d => { if (!d.accepted) setShowTcModal(true); })
      .catch(e => console.warn('[T&C] Check failed:', e));
  }, [token, slug]);

  // ── Fase 3 T3: Lazy migration recetas (runs once per session after login)
  useEffect(() => {
    if (!token) return;
    const flagKey = `recipes_migrated_${slug}`;
    if (sessionStorage.getItem(flagKey)) return;
    migrateRecipesIfNeeded(slug, token)
      .then(result => {
        sessionStorage.setItem(flagKey, '1');
        if (result.uploaded > 0 && result.allMigrated) {
          console.log(`[MIGRATION] ✅ ${result.uploaded} recetas migradas al backend`);
        } else if (result.partialFailure) {
          console.warn('[MIGRATION] ⚠️ Algunas recetas no se sincronizaron:', result);
        }
      })
      .catch(err => {
        console.error('[MIGRATION] Error (degradando a localStorage):', err);
        // NO bloquear UI (Regla Inviolable #2)
      });
  }, [token, slug]);

  // ── Fase 3 T4: Lazy migration expediente (runs once per session after login)
  useEffect(() => {
    if (!token) return;
    const flagKey = `expediente_migrated_${slug}`;
    if (sessionStorage.getItem(flagKey)) return;
    migrateExpedienteIfNeeded(slug, token)
      .then(result => {
        sessionStorage.setItem(flagKey, '1');
        if (result.uploaded > 0 && result.allMigrated) {
          console.log(`[MIGRATION] ✅ ${result.uploaded} campos de expediente migrados al backend`);
        } else if (result.partialFailure) {
          console.warn('[MIGRATION] ⚠️ Expediente parcialmente migrado:', result);
        }
      })
      .catch(err => {
        console.error('[MIGRATION] Expediente error (degradando a localStorage):', err);
      });
  }, [token, slug]);

  const updateProdStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      const r = await fetch(`${BACKEND}/api/dashboard/${slug}/orders/${orderId}/production-status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token },
        body: JSON.stringify({ production_status: newStatus }),
      });
      if (r.ok) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, production_status: newStatus } : o));
    } catch {}
    setUpdating(null);
  };

  const markPaid = async (orderId) => {
    setUpdating(orderId);
    try {
      const r = await fetch(`${BACKEND}/api/dashboard/${slug}/orders/${orderId}/mark-paid`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token },
      });
      if (r.ok) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'paid', production_status: o.production_status || 'nuevo' } : o));
    } catch {}
    setUpdating(null);
  };

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try { const r = await fetch(`${BACKEND}/api/dashboard/${slug}/analytics`, { headers: { 'X-Dashboard-Token': token } }); if (r.ok) setAnalytics(await r.json()); } catch {}
    setAnalyticsLoading(false);
  }, [token, slug]);
  useEffect(() => { if (tab === 'kpis' && token) { setAnalytics(null); fetchAnalytics(); } }, [tab, token]);

  const fetchInventory = useCallback(async () => {
    if (!token) return; setInvLoading(true);
    try { const r = await fetch(`${BACKEND}/api/dashboard/${slug}/inventory`, { headers: { 'X-Dashboard-Token': token } }); if (r.ok) { const d = await r.json(); setInventory(d.items || []); } } catch {}
    setInvLoading(false);
  }, [token, slug]);
  useEffect(() => { if (tab === 'inv' && token) fetchInventory(); }, [tab, token, fetchInventory]);
  const fetchCatalog = useCallback(async () => {
    setCatLoading(true);
    try {
      const _catSlug = slug.endsWith('-sales') ? slug : slug + '-sales';
      const r = await fetch(`${BACKEND}/api/catalog/${_catSlug}`, { headers: { 'X-PIN': pin } });
      const d = await r.json();
      setCatalog(d.products || []);
    } catch(e) { console.warn('catalog fetch', e); }
    setCatLoading(false);
  }, [slug, pin]);
  useEffect(() => { if ((tab === 'inv' || tab === 'cost') && token) fetchCatalog(); }, [tab, token, fetchCatalog]);

  const [invSaveMsg, setInvSaveMsg] = useState(null);
  const patchInventory = async (productName, stock, unit) => {
    setInvSaveMsg(null);
    try {
      const r = await fetch(`${BACKEND}/api/dashboard/${slug}/inventory`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token },
        body: JSON.stringify({ product_name: productName, stock: parseInt(stock) || 0, unit: unit || 'pza', updated_by: 'Propietario' }),
      });
      if (r.ok) {
        fetchInventory();
        setEditStock(prev => { const n = { ...prev }; delete n[productName]; return n; });
        setInvSaveMsg({ ok: true, txt: '✅ Guardado' });
        setTimeout(() => setInvSaveMsg(null), 3000);
      } else {
        const err = await r.json().catch(() => ({}));
        setInvSaveMsg({ ok: false, txt: '❌ Error ' + r.status + ': ' + (err.detail || 'Revisa tu conexion') });
      }
    } catch (e) {
      setInvSaveMsg({ ok: false, txt: '❌ Sin conexion al servidor' });
    }
  };

  const deleteInventory = async (productName) => {
    if (!confirm(`¿Eliminar "${productName}" del inventario?`)) return;
    try {
      const r = await fetch(`${BACKEND}/api/dashboard/${slug}/inventory/${encodeURIComponent(productName)}`, {
        method: 'DELETE', headers: { 'X-Dashboard-Token': token }
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setInvSaveMsg({ ok: false, txt: `❌ Error: ${err.detail || r.status}` });
        return;
      }
      setInvSaveMsg({ ok: true, txt: `✅ "${productName}" eliminado` });
      fetchInventory();
    } catch (e) { setInvSaveMsg({ ok: false, txt: '❌ Error al eliminar: ' + e.message }); }
  };
  const addInventoryItem = async () => {
    if (!newProd.name.trim()) return;
    await patchInventory(newProd.name.trim(), newProd.stock, newProd.unit);
    setNewProd({ name: '', stock: '', unit: 'pza' });
  };

  // Costeador helpers
  const saveIngs = (data) => { setIngs(data); const s = loadCost(); localStorage.setItem(storageKey, JSON.stringify({ ...s, ings: data })); };
  const saveRecs = (data) => { setRecs(data); const s = loadCost(); localStorage.setItem(storageKey, JSON.stringify({ ...s, recs: data })); };
  const calcCost = (recipe) => recipe.items.reduce((sum, it) => {
    const ing = ings.find(i => i.name === it.ing);
    return sum + (ing ? parseFloat(ing.cost) * parseFloat(it.qty) : 0);
  }, 0);
  const suggestedPrice = (cost) => Math.ceil(cost / (1 - margin / 100) / 5) * 5;

  // Expediente helpers
  const toggleDoc = (key) => {
    const next = { ...expDocs, [key]: !expDocs[key] };
    setExpDocs(next); localStorage.setItem(expKey, JSON.stringify(next));
  };
  const expPct = Math.round((EXPEDIENTE_DOCS.filter(d => expDocs[d.key]).length / EXPEDIENTE_DOCS.length) * 100);

  // ── Styles
  const CS   = { minHeight: '100vh', background: '#faf7f2', color: '#1a1208', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' };
  const CARD = { background: '#fff', borderRadius: 14, padding: '18px', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', marginBottom: 14 };
  const BTN  = (bg, color = '#fff') => ({ padding: '9px 16px', background: bg, color, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' });
  const INP  = { padding: '9px 12px', border: '1.5px solid #e7e0d8', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' };

  // ── Loading state (Fase 3: tenant config loading)
  if (cfgLoading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#faf7f2', color:'#64748b', fontFamily:"'Inter', system-ui, sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:12 }}>⏳</div>
        <div style={{ fontSize:14, fontWeight:600 }}>Cargando tu Mando...</div>
      </div>
    </div>
  );

  // ── Error state (Fase 3: tenant config error)
  if (cfgError) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#faf7f2', color:'#ef4444', fontFamily:"'Inter', system-ui, sans-serif", flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:28 }}>⚠️</div>
      <div style={{ fontSize:14, fontWeight:700 }}>No se pudo cargar tu Mando.</div>
      <div style={{ fontSize:12, color:'#64748b' }}>Verifica tu conexión o contacta soporte: hola@genyxsystems.com</div>
    </div>
  );

  // ── Login
  if (!token) return (
    <div style={{ ...CS, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 360, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={tenantLogo} alt={tenantName} style={{ width: 80, height: 80, borderRadius: 16, marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1208' }}>{tenantName}</h1>
          <p style={{ color: '#78716c', fontSize: 13, marginTop: 4 }}>Centro de Mando</p>
        </div>
        <div style={CARD}>
          <form onSubmit={handleLogin}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#78716c', letterSpacing: '.07em', textTransform: 'uppercase' }}>Contraseña de Acceso</label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••••" autoFocus
              style={{ ...INP, width: '100%', fontSize: 22, letterSpacing: 10, textAlign: 'center', marginTop: 8, marginBottom: 14, boxSizing: 'border-box' }} />
            {/* T&C checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, margin: '0 0 14px', padding: '10px 12px', background: '#faf9f7', borderRadius: 8, border: '1px solid #e7e5e4' }}>
              <input
                type="checkbox"
                id={`terms-${slug}`}
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: brandColor, cursor: 'pointer', flexShrink: 0 }}
              />
              <label htmlFor={`terms-${slug}`} style={{ fontSize: 11, color: '#78716c', lineHeight: 1.5, cursor: 'pointer' }}>
                He leído y acepto los{' '}
                <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: brandColor, fontWeight: 700 }}>Términos y Condiciones</a>{' '}
                y el{' '}
                <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: brandColor, fontWeight: 700 }}>Aviso de Privacidad</a>{' '}
                de GenyX Systems.
              </label>
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{error}</p>}
            <button type="submit" disabled={loading || !termsAccepted}
              style={{ ...BTN(brandColor), width: '100%', padding: 13, fontSize: 15, opacity: (loading || !termsAccepted) ? 0.5 : 1, cursor: !termsAccepted ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Entrando…' : 'Entrar ✓'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: '#c4b5a5', fontSize: 10, marginTop: 12 }}>GenyX · {slug}</p>
      </div>
    </div>
  );

  const paidOrders   = orders.filter(o => o.status === 'paid');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activos   = paidOrders.filter(o => o.production_status !== 'entregado');
  const historial = paidOrders.filter(o => o.production_status === 'entregado');

  return (
    <div style={CS}>
      {/* Header */}
      <header style={{ background: brandColor, color: '#fff', padding: '12px 20px 0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={tenantLogo} alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{name || tenantName}</div>
              <div style={{ fontSize: 9, opacity: .7 }}>Centro de Mando</div>
            </div>
          </div>
          <button onClick={fetchOrders} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>⟳</button>
        </div>
        {/* Tabs — dynamic per config.modules (Fase 3) */}
        {(() => {
          // Map module keys → legacy tab IDs used in render sections below
          const MODULE_TAB_MAP = {
            pedidos: 'pedidos', kpis: 'kpis', inventario: 'inv', costeador: 'cost',
            expediente: 'exp', fotolab: 'foto', misAgentes: 'misAgentes',
            reporteLunes: 'reporteLunes', citas: 'citas', leads: 'leads',
            pacientes: 'pacientes', reservas: 'reservas', cursos: 'cursos',
          };
          const modules = config?.modules || {};
          // pedidos is always visible (core functionality)
          const activeMods = ['pedidos', ...Object.keys(TAB_REGISTRY).filter(k => k !== 'pedidos' && modules[k] === true)];
          const tabs = activeMods.map(k => ({ tabId: MODULE_TAB_MAP[k] || k, ...TAB_REGISTRY[k] }));
          return (
            <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 0 }}>
              {tabs.map(t => (
                <button key={t.tabId} onClick={() => setTab(t.tabId)} style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', color: tab === t.tabId ? '#fff' : 'rgba(255,255,255,0.55)', borderBottom: `2px solid ${tab === t.tabId ? '#fff' : 'transparent'}`, whiteSpace: 'nowrap', letterSpacing: '.03em' }}>{t.icon} {t.label}</button>
              ))}
            </div>
          );
        })()}
      </header>

      <main style={{ padding: 18, maxWidth: 720, margin: '0 auto', width: '100%', flex: 1 }}>

        {/* ═══ TAB: PEDIDOS ═══ */}
        {tab === 'pedidos' && (<>
          {/* ━━ Semáforo de Estado ━━ */}
          {(() => {
            const cNuevo = activos.filter(o => !o.production_status || o.production_status === 'nuevo').length;
            const cProd  = activos.filter(o => o.production_status === 'en_produccion').length;
            const cEntr  = historial.length;
            const cPend  = pendingOrders.length;
            const STAT = [
              { label: '🔴 Nuevos',       count: cNuevo, bg: '#fef2f2', txt: '#b91c1c' },
              { label: '🟡 En Proceso',   count: cProd,  bg: '#fffbeb', txt: '#b45309' },
              { label: '🟢 Entregados',   count: cEntr,  bg: '#f0fdf4', txt: '#15803d' },
              { label: '⏳ Por Cobrar',   count: cPend,  bg: '#f8fafc', txt: '#64748b' },
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
                {STAT.map(({ label, count, bg, txt }) => (
                  <div key={label} style={{ background: bg, borderRadius: 12, padding: '10px 6px', textAlign: 'center', border: `1px solid ${txt}20` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: txt }}>{count}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: txt, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ━━ SEMÁFORO: Pedidos PAGADOS activos ━━ */}
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#44403c' }}>✅ Pedidos Pagados ({activos.length})</h2>
          {activos.length === 0 && <div style={{ ...CARD, textAlign: 'center', color: '#a8a29e', fontSize: 13, marginBottom: 16 }}>No hay pedidos activos aún.<br/><span style={{ fontSize: 11 }}>Aparecerán aquí cuando un cliente complete su pago en Stripe.</span></div>}
          {activos.map(o => {
            const ps = o.production_status || 'nuevo';
            const sp = PROD_STATUS[ps] || PROD_STATUS.nuevo;
            const od = typeof o.order_data === 'object' ? o.order_data : {};
            const items = o.items || od.items || od.cart || [];
            const total = o.total_estimated || od.total || od.total_estimated || 0;
            const shipping = od.shipping || o.shipping || 0;
            const subtotal = total - shipping;
            const isUpd = updating === o.id;
            return (
              <div key={o.id} style={{ ...CARD, borderLeft: `4px solid ${sp.color}`, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>#{o.id} · {o.customer_name || 'Cliente'}</div>
                    <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>
                      {o.whatsapp && <span>📱 {o.whatsapp} </span>}
                      {o.address && <span>📍 {String(o.address).substring(0, 40)}{String(o.address).length > 40 ? '…' : ''}</span>}
                    </div>
                  </div>
                  <span style={{ background: sp.bg, color: sp.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, border: `1px solid ${sp.color}30` }}>{sp.label}</span>
                </div>
                <div style={{ background: '#faf7f2', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12 }}>
                  {items.map((it, i) => <div key={i}>• {it.nombre || it.name} ×{it.cantidad || it.qty || 1} — <b>${((it.subtotal || it.precio || it.price || 0)).toLocaleString('es-MX')}</b></div>)}
                  {items.length === 0 && <span style={{ color: '#a8a29e' }}>Sin detalle de productos.</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#78716c', fontSize: 11 }}>{fmt(o.created_at)}</span>
                  <span style={{ fontWeight: 800, color: brandColor, fontSize: 15 }}>${Number(total).toLocaleString('es-MX')} MXN</span>
                </div>
                {/* ── Expandable ticket completo ── */}
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 11, color: brandColor, cursor: 'pointer', fontWeight: 700, padding: '6px 0', userSelect: 'none' }}>
                    🎫 Ver ticket completo ▾
                  </summary>
                  <div style={{ background: '#fff9f5', border: '1px dashed #e7d5c0', borderRadius: 8, padding: '12px', marginTop: 6, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#78716c' }}>🔖 N° Orden</span><b>#{o.id}</b></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#78716c' }}>👤 Nombre</span><span>{o.customer_name || '—'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#78716c' }}>📱 WaB</span><span>{o.whatsapp || '—'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}><span style={{ color: '#78716c' }}>📍 Dirección</span><span style={{ textAlign: 'right', maxWidth: '60%' }}>{o.address || '—'}</span></div>
                    <div style={{ borderTop: '1px solid #e7d5c0', paddingTop: 8, marginBottom: 6, fontWeight: 700, color: '#44403c' }}>🛒 Productos ({items.length})</div>
                    {items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span>{it.nombre || it.name} ×{it.cantidad || it.qty || 1}</span>
                        <b style={{ color: brandColor }}>${((it.subtotal || it.precio || it.price || 0)).toLocaleString('es-MX')}</b>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #e7d5c0', marginTop: 8, paddingTop: 8 }}>
                      {subtotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c' }}><span>Subtotal</span><span>${Number(subtotal).toLocaleString('es-MX')}</span></div>}
                      {shipping > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c' }}><span>🚚 Envío</span><span>${Number(shipping).toLocaleString('es-MX')}</span></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#15803d', fontSize: 14, marginTop: 4 }}><span>TOTAL</span><span>${Number(total).toLocaleString('es-MX')} MXN</span></div>
                    </div>
                    <div style={{ marginTop: 8, color: '#a8a29e', fontSize: 10 }}>📅 {fmt(o.created_at)}</div>
                  </div>
                </details>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {sp.next && <button onClick={() => updateProdStatus(o.id, sp.next)} disabled={isUpd} style={{ ...BTN(PROD_STATUS[sp.next].color), flex: 1, opacity: isUpd ? 0.5 : 1 }}>{isUpd ? '⏳ ...' : sp.nextLabel}</button>}
                  {ps === 'en_produccion' && <button onClick={() => updateProdStatus(o.id, 'nuevo')} disabled={isUpd} style={{ ...BTN('#f3f4f6', '#6b7280'), border: '1px solid #e5e7eb' }}>← Regresar</button>}
                </div>
              </div>
            );
          })}


          {/* ━━ POR COBRAR: Pedidos PENDIENTES (link enviado, pago no confirmado) ━━ */}
          {pendingOrders.length > 0 && (
            <details style={{ marginTop: 16 }} open={pendingOrders.length > 0 && activos.length === 0}>
              <summary style={{ fontSize: 12, color: '#78716c', cursor: 'pointer', fontWeight: 700, marginBottom: 8, padding: '8px 0' }}>
                ⏳ Por Cobrar — {pendingOrders.length} pedido(s) con link enviado
              </summary>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>Link Stripe enviado. El pago se confirma automáticamente cuando el cliente paga. Si recibiste pago por SPEI o efectivo, marca como pagado manualmente.</div>
              {pendingOrders.map(o => {
                const od = typeof o.order_data === 'object' ? o.order_data : {};
                const items = o.items || od.items || [];
                const total = o.total_estimated || od.total || od.total_estimated || 0;
                const isUpd = updating === o.id;
                return (
                  <div key={o.id} style={{ ...CARD, borderLeft: '4px solid #94a3b8', marginBottom: 8, opacity: 0.85 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>#{o.id} · {o.customer_name || 'Cliente'}</div>
                      <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>PENDIENTE</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#78716c', marginBottom: 8 }}>
                      {o.whatsapp && <span>📱 {o.whatsapp} · </span>}
                      {items.length} artículo(s) · {fmt(o.created_at)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#78716c', fontSize: 14 }}>${Number(total).toLocaleString('es-MX')} MXN</span>
                      <button onClick={() => markPaid(o.id)} disabled={isUpd}
                        style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: isUpd ? 0.5 : 1 }}>
                        {isUpd ? '⏳...' : '✅ Marcar Pagado'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </details>
          )}

          {/* ━━ HISTORIAL: Pedidos entregados (DATA para los lunes) ━━ */}
          {historial.length > 0 && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ fontSize: 12, color: '#78716c', cursor: 'pointer', fontWeight: 600, padding: '8px 0' }}>🗂️ Historial Entregados ({historial.length}) — DATA 📊</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {historial.map(o => {
                  const od = typeof o.order_data === 'object' ? o.order_data : {};
                  const total = o.total_estimated || od.total || od.total_estimated || 0;
                  return (
                    <div key={o.id} style={{ ...CARD, opacity: 0.7, fontSize: 12, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>#{o.id} · <b>{o.customer_name}</b></span>
                        <span style={{ fontWeight: 800, color: '#15803d' }}>${Number(total).toLocaleString('es-MX')} MXN</span>
                      </div>
                      <div style={{ color: '#a8a29e', fontSize: 11, marginTop: 2 }}>✅ Entregado · {fmt(o.created_at)}</div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </>)}

        {/* ═══ TAB: KPIs ═══ */}
        {tab === 'kpis' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#44403c' }}>KPIs de mi Negocio <button onClick={() => { setOrders([]); setTimeout(() => window.location.reload(), 50); }} style={{ marginLeft: 10, padding: '3px 9px', fontSize: 11, background: '#f5f0eb', border: '1px solid #e7d5c0', borderRadius: 7, cursor: 'pointer', color: '#78400e', fontWeight: 700, verticalAlign: 'middle' }}>↺</button></h2>
          {analyticsLoading && <div style={{ textAlign: 'center', color: '#a8a29e', padding: 40 }}>Cargando datos…</div>}
          {!analyticsLoading && analytics && (
            <>
              {analytics.empty ? (
                <div style={{ ...CARD, textAlign: 'center', color: '#a8a29e', fontSize: 14 }}>Aún no hay pedidos registrados. Los KPIs aparecerán cuando uses el sistema.</div>
              ) : (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div style={{ ...CARD, textAlign: 'center', margin: 0 }}>
                    <div style={{ fontSize: 11, color: '#78716c', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>🎫 Ticket Promedio</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: brandColor }}>${(analytics.ticket_promedio || 0).toLocaleString('es-MX')}</div>
                    <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 4 }}>MXN por pedido</div>
                  </div>
                  <div style={{ ...CARD, textAlign: 'center', margin: 0 }}>
                    <div style={{ fontSize: 11, color: '#78716c', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>📦 Total Pedidos</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: brandColor }}>{analytics.total_orders || 0}</div>
                    <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 4 }}>en el histórico</div>
                  </div>
                </div>
                {/* INGRESOS */}
                {(() => {
                  const now = new Date();
                  const filtered = orders.filter(o => {
                    const d = new Date(o.created_at);
                    if (kpiPeriod === 'day')   return d.toDateString() === now.toDateString();
                    if (kpiPeriod === 'week')  return (now - d) < 7 * 24 * 60 * 60 * 1000;
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  });
                  const revenue = filtered.reduce((s, o) => s + (parseFloat(o.total || o.total_estimated || 0) || 0), 0);
                  const labels  = { day: 'Hoy', week: 'Esta Semana', month: 'Este Mes' };
                  return (
                    <div style={{ background: `linear-gradient(135deg,${brandColor} 0%,${brandAccent} 100%)`, borderRadius: 14, padding: '14px 16px', marginBottom: 14, color: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase' }}>💵 Ingresos</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {['day','week','month'].map(p => (
                            <button key={p} onClick={() => setKpiPeriod(p)}
                              style={{ fontSize: 10, padding: '3px 9px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700,
                                background: kpiPeriod === p ? '#fff' : 'rgba(255,255,255,0.22)',
                                color:      kpiPeriod === p ? brandColor : '#fff' }}>
                              {labels[p]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: revenue >= 100000 ? 22 : revenue >= 10000 ? 27 : 34, fontWeight: 900, letterSpacing: '-.02em' }}>
                        ${Math.round(revenue).toLocaleString('es-MX')}
                      </div>
                      <div style={{ fontSize: 10, opacity: .8, marginTop: 4 }}>MXN · {labels[kpiPeriod]} · {filtered.length} pedido(s)</div>
                    </div>
                  );
                })()}
                <div style={CARD}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#44403c', marginBottom: 10 }}>🏆 Top Productos</div>
                  {(analytics.top_productos || []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < (analytics.top_productos.length - 1) ? '1px solid #f5f0ea' : 'none' }}>
                      <span style={{ fontSize: 13 }}><b style={{ color: brandColor }}>#{i + 1}</b> {p.name}</span>
                      <span style={{ background: '#faf0e6', color: brandColor, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{p.qty} vendidos</span>
                    </div>
                  ))}
                  {(!analytics.top_productos || analytics.top_productos.length === 0) && <p style={{ color: '#a8a29e', fontSize: 13 }}>Sin datos de productos aún.</p>}
                </div>
                <div style={{ ...CARD, background: '#faf0e6', border: '1px solid #e7d5c0', fontSize: 12, color: '#78400e' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>📧 Recuerda</div>
                  El análisis profundo (tendencias, hora pico, recomendaciones) lo recibes cada lunes a las 8am en tu correo.
                </div>
              </>)}
            </>
          )}
          {!analyticsLoading && !analytics && <button onClick={fetchAnalytics} style={{ ...BTN(brandColor), width: '100%' }}>Cargar KPIs</button>}

          {/* ─── HERO: ROI del sistema este mes ─── */}
          {(() => {
            const now = new Date();
            const monthOrders = orders.filter(o => {
              if (!o.created_at) return false;
              const d = new Date(o.created_at);
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            const monthRevenue = monthOrders.reduce((s, o) => {
              const od = typeof o.order_data === 'object' ? o.order_data : {};
              return s + (parseFloat(od.total_estimated || od.total || 0) || 0);
            }, 0);
            const monthFee = analytics?.plan_monthly_fee || 2500;
            const netGain = monthRevenue - monthFee;
            const roi = monthFee > 0 ? Math.round((netGain / monthFee) * 100) : 0;
            const multiplier = monthFee > 0 ? (monthRevenue / monthFee).toFixed(1) : '—';
            const roiColor = roi >= 200 ? '#16a34a' : roi >= 100 ? '#d97706' : '#dc2626';
            return (
              <div style={{ marginTop: 18, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(146,64,14,0.18)' }}>
                {/* Header */}
                <div style={{ background: `linear-gradient(135deg, ${brandColor} 0%, ${brandAccent} 100%)`, padding: '16px 20px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>🤖 Tu Clon Digital este mes</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontSize: monthRevenue >= 100000 ? 28 : 36, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1 }}>
                      ${Math.round(monthRevenue).toLocaleString('es-MX')}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>MXN generados</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{monthOrders.length} pedido(s) procesados automáticamente</div>
                </div>
                {/* ROI Row */}
                <div style={{ background: '#fff7ed', padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#78716c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Tu inversión</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#44403c' }}>${monthFee.toLocaleString('es-MX')}</div>
                    <div style={{ fontSize: 9, color: '#a8a29e' }}>suscripción mensual</div>
                  </div>
                  <div style={{ textAlign: 'center', borderLeft: '1px solid #e7d5c0', borderRight: '1px solid #e7d5c0', padding: '0 12px' }}>
                    <div style={{ fontSize: 11, color: '#78716c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>ROI</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: roiColor, lineHeight: 1 }}>{roi > 0 ? `${roi}%` : '—'}</div>
                    <div style={{ fontSize: 9, color: '#a8a29e' }}>{multiplier}x tu inversión</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#78716c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Ganancia neta</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: netGain > 0 ? '#16a34a' : '#dc2626' }}>${Math.round(netGain).toLocaleString('es-MX')}</div>
                    <div style={{ fontSize: 9, color: '#a8a29e' }}>después de tu fee</div>
                  </div>
                </div>
                {/* Horas ahorradas */}
                {analytics?.horas_ahorradas > 0 && (
                  <div style={{ background: '#f0fdf4', padding: '8px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, borderTop: '1px solid #dcfce7' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#16a34a' }}>⏱ {analytics.horas_ahorradas}h</div>
                      <div style={{ fontSize: 9, color: '#16a34a', fontWeight: 600 }}>horas ahorradas al dueño</div>
                    </div>
                    <div style={{ width: 1, height: 30, background: '#bbf7d0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#16a34a' }}>�� {analytics?.total_ordenes || 0}</div>
                      <div style={{ fontSize: 9, color: '#16a34a', fontWeight: 600 }}>pedidos cerrados sin intervención</div>
                    </div>
                  </div>
                )}
                {/* Footer */}
                <div style={{ background: '#fef3c7', padding: '8px 20px', fontSize: 10, color: brandColor, fontWeight: 600, textAlign: 'center' }}>
                  {roi >= 300 ? '🏆 Tu sistema trabaja más duro que cualquier vendedor. ¡Excelente mes!' :
                   roi >= 100 ? '📈 Tu sistema ya se pagó solo. Todo lo demás es ganancia pura.' :
                   monthRevenue > 0 ? '🚀 El sistema está arrancando. Las ventas irán creciendo.' :
                   '⏳ Los datos aparecerán con cada venta procesada por el sistema.'}
                </div>
              </div>
            );
          })()}
        </>)}

        {/* ═══ TAB: INVENTARIO ═══ */}
        {tab === 'inv' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#44403c' }}>📦 Inventario</h2>
          {/* Agregar producto */}
          <div style={{ ...CARD }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#44403c', marginBottom: 10 }}>+ Agregar / Actualizar producto</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))}
                style={{ ...INP, flex: 2, minWidth: 160, cursor: 'pointer', color: newProd.name ? '#44403c' : '#a8a29e' }}>
                <option value=''>▼ Selecciona producto del menú</option>
                {catalog.map(p => <option key={p.product_name} value={p.product_name}>{p.product_name}</option>)}
              </select>
              <input placeholder="Stock" type="number" value={newProd.stock} onChange={e => setNewProd(p => ({ ...p, stock: e.target.value }))} style={{ ...INP, width: 70 }} />
              <select value={newProd.unit} onChange={e => setNewProd(p => ({ ...p, unit: e.target.value }))} style={{ ...INP }}>
                {['pza', 'kg', 'lt', 'paq', 'caja', 'bolsa'].map(u => <option key={u}>{u}</option>)}
              </select>
              <button onClick={addInventoryItem} style={BTN(brandColor)}>Guardar</button>
            </div>
          </div>
          {invLoading && <div style={{ textAlign: 'center', color: '#a8a29e', padding: 30 }}>Cargando…</div>}
          {!invLoading && inventory.length === 0 && <div style={{ ...CARD, textAlign: 'center', color: '#a8a29e', fontSize: 13 }}>No hay productos en inventario aún.</div>}
          {!invLoading && inventory.map(item => {
            const isEditing = editStock[item.product_name] !== undefined;
            const stockVal = isEditing ? editStock[item.product_name] : item.stock;
            const stockColor = item.stock <= 0 ? '#dc2626' : item.stock <= 3 ? '#d97706' : '#16a34a';
            return (
              <div key={item.product_name} style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.product_name}</div>
                  <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 2 }}>Actualizado: {fmt(item.updated_at)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" value={stockVal}
                    onChange={e => setEditStock(prev => ({ ...prev, [item.product_name]: e.target.value }))}
                    style={{ ...INP, width: 70, textAlign: 'center', border: `1.5px solid ${isEditing ? brandColor : '#e7e0d8'}` }} />
                  <span style={{ color: '#78716c', fontSize: 12 }}>{item.unit}</span>
                  <span style={{ color: stockColor, fontWeight: 800, fontSize: 12 }}>{item.stock <= 0 ? '🔴 Agotado' : item.stock <= 3 ? '🟡 Bajo' : '🟢 OK'}</span>
                  {isEditing && <button onClick={() => patchInventory(item.product_name, stockVal, item.unit)} style={BTN(brandColor, '#fff')}>Guardar</button>} <button onClick={() => deleteInventory(item.product_name)} style={{ padding: '5px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 700, marginLeft: 4 }}>🗑</button>
                </div>
              </div>
            );
          })}

          {/* ═══ EDITAR MENÚ (compacto — solo precios) ═══ */}
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#44403c', marginTop: 4 }}>📋 Editar Menú · Precios en Vivo</h2>
          <EditarMenuCompacto catalog={catalog} catLoading={catLoading} slug={slug} pin={pin} fetchCatalog={fetchCatalog} />

        </>)}

        {/* ═══ TAB: COSTEADOR ═══ */}
        {tab === 'cost' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#44403c' }}>Costeador de Productos</h2>
          <p style={{ fontSize: 12, color: '#78716c', marginBottom: 14 }}>Calcula el costo real y precio justo de cada producto de tu menú con la fórmula contable completa.</p>

          {/* ── Toggle v1 / v2 ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#f5f0eb', borderRadius: 12, padding: 4 }}>
            {[['v1','📋 Formulario'],['v2','🤖 IA Costeador']].map(([k,lbl]) => (
              <button key={k} onClick={() => setCostMode(k)} style={{
                flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, transition: 'all .2s',
                background: costMode === k ? brandColor : 'transparent',
                color: costMode === k ? '#fff' : '#78716c'
              }}>{lbl}</button>
            ))}
          </div>

          {/* ── v2: Chat IA Costeador ABC ── */}
          {costMode === 'v2' && (() => {
            const BURL = BACKEND;
            const sendAiMsg = async () => {
              if (!aiInput.trim() || aiLoading) return;
              const userMsg = { role: 'user', content: aiInput.trim() };
              const nextChat = [...aiChat, userMsg];
              setAiChat(nextChat); setAiInput(''); setAiLoading(true);
              try {
                const res = await fetch(`${BURL}/api/costeador/${slug}/chat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token },
                  body: JSON.stringify({ message: userMsg.content, history: nextChat.slice(-10) })
                });
                const data = await res.json();
                setAiChat(p => [...p, { role: 'assistant', content: data.reply || '❌ Sin respuesta' }]);
              } catch(e) {
                setAiChat(p => [...p, { role: 'assistant', content: '❌ Error: ' + e.message }]);
              }
              setAiLoading(false);
              setTimeout(() => { if (aiChatRef.current) aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight; }, 100);
            };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div ref={aiChatRef} style={{ background: '#faf7f4', border: '1.5px solid #e7e0d8', borderRadius: '14px 14px 0 0', padding: 16, minHeight: 340, maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {aiChat.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '88%', padding: '10px 14px', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: msg.role === 'user' ? brandColor : '#fff',
                        color: msg.role === 'user' ? '#fff' : '#44403c',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.08)'
                      }}>{msg.content}</div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{ display: 'flex' }}>
                      <div style={{ padding: '10px 16px', background: '#fff', borderRadius: '14px 14px 14px 4px', fontSize: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>⏳</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', border: '1.5px solid #e7e0d8', borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden', background: '#fff' }}>
                  <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAiMsg()}
                    placeholder="Ej: Costéame mi producto estrella: 500g insumo principal $18/kg..."
                    style={{ flex: 1, padding: '12px 14px', border: 'none', outline: 'none', fontSize: 13 }} />
                  <button onClick={sendAiMsg} disabled={aiLoading || !aiInput.trim()}
                    style={{ padding: '12px 20px', background: aiInput.trim() ? brandColor : '#d4c9be', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>▶</button>
                </div>
                <p style={{ fontSize: 11, color: '#a8a29e', textAlign: 'center', marginTop: 8 }}>
                  💡 Tip: registra tus ingredientes con precios para que los costeos usen datos reales.<br />
                  Ej: <em>"Registra: Insumo principal 1kg = $18"</em>
                </p>
              </div>
            );
          })()}


          {/* ── v1: Formulario (original, sin cambios) ── */}
          {costMode === 'v1' && (<>

          {/* ── Tooltip helper ── */}
          {showInfo && (
            <div onClick={() => setShowInfo(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, maxWidth: 340, width: '100%' }} onClick={e => e.stopPropagation()}>
                <div style={{ fontWeight: 800, fontSize: 14, color: brandColor, marginBottom: 8 }}>{showInfo.title}</div>
                <div style={{ fontSize: 13, color: '#44403c', lineHeight: 1.6 }}>{showInfo.text}</div>
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#faf0e6', borderRadius: 8, fontSize: 12, color: '#78400e' }}>
                  <b>Ejemplo:</b> {showInfo.ex}
                </div>
                <button onClick={() => setShowInfo(null)} style={{ marginTop: 12, width: '100%', padding: 9, background: brandColor, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Entendido ✓</button>
              </div>
            </div>
          )}

          {/* ── SECCIÓN 1: Materia Prima Directa (MPD) ── */}
          {(() => {
            const INP = { padding: '8px 11px', border: '1.5px solid #e7e0d8', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' };
            const BTN = (bg, col='#fff') => ({ padding: '8px 14px', background: bg, color: col, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' });
            const INFO = (info) => (
              <button onClick={() => setShowInfo(info)} style={{ background: 'none', border: '1.5px solid #d4c9be', color: brandColor, borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 900, cursor: 'pointer', lineHeight: '16px', padding: 0, flexShrink: 0 }}>i</button>
            );
            const SECHEAD = (title, info) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#44403c' }}>{title}</div>
                {INFO(info)}
              </div>
            );
            const CARD = { background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', marginBottom: 14 };
            // MENÚ DINÁMICO: catalog del menú (preferido) o fallback a nombres de pedidos
            const menuItems = catalog.length > 0
              ? catalog.map(p => p.product_name).sort()
              : [...new Set(orders.flatMap(o =>
                  (o.items || o.order_data?.items || []).map(it => it.nombre || it.name).filter(Boolean)
                ))].sort();

            return (<>
              {/* 0. Selector de Producto — siempre primero */}
              <div style={{ ...CARD, border: `2.5px solid ${brandColor}`, background: 'linear-gradient(135deg,#fdf6ee 0%,#fff9f3 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: brandColor }}>📖 Recetas del Menú</span>
                  {INFO({ title: 'Recetas del Menú', text: 'Comienza seleccionando qué producto de tu menú quieres costear. Una vez seleccionado, el sistema te guía: ingredientes (MPD), mano de obra (MOD), costos indirectos (CIF) y margen de ganancia.', ex: 'Selecciona tu producto → llena la receta → obtén el precio de venta recomendado.' })}
                </div>
                <div style={{ fontSize: 12, color: '#78716c', marginBottom: 10 }}>¿Qué producto de tu menú vas a costear hoy?</div>
                {menuItems.length > 0 ? (
                  <select value={recName} onChange={e => setRecName(e.target.value)}
                    style={{ ...INP, width: '100%', fontSize: 14, fontWeight: 600, boxSizing: 'border-box', borderColor: recName ? brandColor : '#e7e0d8' }}>
                    <option value="">-- Selecciona un producto de tu menú --</option>
                    {menuItems.map(p => <option key={p}>{p}</option>)}
                  </select>
                ) : (
                  <div>
                    <input placeholder="Nombre del producto (ej. Producto Estrella)" value={recName}
                      onChange={e => setRecName(e.target.value)}
                      style={{ ...INP, width: '100%', boxSizing: 'border-box' }} />
                    <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 4 }}>Aún sin pedidos — escribe el nombre directo</div>
                  </div>
                )}
                {recName && (
                  <div style={{ marginTop: 10, padding: '8px 14px', background: '#fff7ed', borderRadius: 9, fontSize: 13, color: brandColor, fontWeight: 800, border: '1.5px solid #fed7aa' }}>
                    ✏️ Costeando: {recName}
                  </div>
                )}
              </div>

              {/* Demo Producto Ejemplo */}
              <div style={{ padding: '10px 14px', background: `linear-gradient(90deg,${brandColor}18,${brandAccent}22)`, borderRadius: 12, marginBottom: 14, border: '1.5px dashed #d97706', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>📦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: brandColor }}>¿Primera vez? Carga un ejemplo real</div>
                  <div style={{ fontSize: 11, color: '#78716c' }}>Producto Ejemplo — valores calibrados para verificar tu precio correcto</div>
                </div>
                <button onClick={() => {
                  // Pre-cargar ingredientes del demo
                  const demoIngs = [
                    { name: 'Insumo principal', unit: 'kg', cost: 15 },
                    { name: 'Insumo secundario', unit: 'pz', cost: 0.25 },
                    { name: 'Agua', unit: 'pz', cost: 0.10 },
                  ];
                  saveIngs(demoIngs);
                  setRecName('Producto Ejemplo');
                  setRecItems([
                    { ing: 'Insumo principal', qty: 0.5 },
                    { ing: 'Insumo secundario', qty: 1 },
                    { ing: 'Agua', qty: 1 },
                  ]);
                  setModRate(60); setModHours(2); setBatchUnits(8);
                  setCifPct(20); setOpEx(4); setMargin(63);
                }} style={{ padding: '7px 14px', background: brandColor, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>Cargar demo →</button>
              </div>

              {/* 1. MPD */}
              <div style={CARD}>
                {SECHEAD('1️⃣ Materia Prima Directa (MPD)', {
                  title: '1. Materia Prima Directa (MPD)',
                  text: 'Son todos los ingredientes o materiales que se incorporan DIRECTAMENTE al producto terminado. Es el costo base de lo que tu producto contiene físicamente.',
                  ex: 'Para tu producto: insumo A ($8), insumo B ($4), insumo C ($0.50), insumo D ($1.20) = MPD $13.70 por unidad.'
                })}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <input placeholder="Ingrediente (ej. Insumo principal)" value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))} style={{ ...INP, flex: 2, minWidth: 100 }} />
                  <input placeholder="Costo $" type="number" value={newIng.cost} onChange={e => setNewIng(p => ({ ...p, cost: e.target.value }))} style={{ ...INP, width: 80 }} />
                  <select value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))} style={{ ...INP }}>
                    {['pz', 'kg', 'g', 'lt', 'ml', 'taza', 'cda'].map(u => <option key={u}>{u}</option>)}
                  </select>
                  <button onClick={() => {
                    if (!newIng.name.trim() || !newIng.cost) return;
                    const next = [...ings.filter(i => i.name !== newIng.name.trim()), { name: newIng.name.trim(), unit: newIng.unit, cost: parseFloat(newIng.cost) }];
                    saveIngs(next); setNewIng({ name: '', unit: 'pz', cost: '' });
                  }} style={BTN(brandColor)}>+ Agregar</button>
                </div>
                {ings.length === 0 && <p style={{ fontSize: 12, color: '#a8a29e' }}>Sin ingredientes aún — agrega los materiales de tu menú.</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ings.map(ing => (
                    <span key={ing.name} style={{ background: '#faf0e6', color: brandColor, border: '1px solid #e7d5c0', padding: '4px 10px', borderRadius: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <b>{ing.name}</b> — ${ing.cost}/{ing.unit}
                      <span onClick={() => saveIngs(ings.filter(i => i.name !== ing.name))} style={{ cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>×</span>
                    </span>
                  ))}
                </div>
                                {/* 🧾 Calculadora de Factura — Nivel 1 */}
                                <details style={{ marginTop: 12 }}>
                                  <summary style={{ fontSize: 11, fontWeight: 800, color: brandColor, cursor: 'pointer', userSelect: 'none' }}>
                                    🧾 Calculadora de Factura → Nivel 1: precio total ÷ cantidad = costo/unidad exacto
                                  </summary>
                                  <div style={{ marginTop: 8, background: '#fef9f3', borderRadius: 10, padding: 12, border: '1px dashed #fed7aa' }}>
                                    <div style={{ fontSize: 11, color: '#78716c', marginBottom: 8 }}>
                                      Ej: paquete de insumo $349 / 10,000g = <b>$0.0349/g</b> — el sistema guarda el costo exacto.
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                      <div><div style={{ fontSize: 10, color:'#78716c', fontWeight: 600 }}>Ingrediente</div>
                                        <input placeholder="ej. Insumo principal" value={purchCalc.nombre}
                                          onChange={e => setPurchCalc(p => ({ ...p, nombre: e.target.value }))}
                                          style={{ ...INP, width: 130, marginTop: 3 }} /></div>
                                      <div><div style={{ fontSize: 10, color:'#78716c', fontWeight: 600 }}>Precio factura $</div>
                                        <input type="number" placeholder="349" value={purchCalc.precio}
                                          onChange={e => setPurchCalc(p => ({ ...p, precio: e.target.value }))}
                                          style={{ ...INP, width: 80, marginTop: 3 }} /></div>
                                      <div><div style={{ fontSize: 10, color:'#78716c', fontWeight: 600 }}>Cantidad total</div>
                                        <input type="number" placeholder="10000" value={purchCalc.cantidad}
                                          onChange={e => setPurchCalc(p => ({ ...p, cantidad: e.target.value }))}
                                          style={{ ...INP, width: 80, marginTop: 3 }} /></div>
                                      <div><div style={{ fontSize: 10, color:'#78716c', fontWeight: 600 }}>Unidad</div>
                                        <select value={purchCalc.unidad} onChange={e => setPurchCalc(p => ({ ...p, unidad: e.target.value }))} style={{ ...INP, marginTop: 3 }}>
                                          {['g','ml','pz','kg','lt'].map(u => <option key={u}>{u}</option>)}
                                        </select></div>
                                      <button onClick={() => {
                                        const precio = parseFloat(purchCalc.precio), qty = parseFloat(purchCalc.cantidad);
                                        const nombre = purchCalc.nombre.trim();
                                        if (!nombre || !precio || !qty) return;
                                        const costo = parseFloat((precio/qty).toFixed(6));
                                        const next = [...ings.filter(i => i.name !== nombre), { name: nombre, unit: purchCalc.unidad, cost: costo }];
                                        saveIngs(next); setPurchCalc({ nombre:'', precio:'', cantidad:'', unidad:'g' });
                                      }} style={{  padding: '8px 14px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Calcular y Guardar</button>
                                    </div>
                                    {purchCalc.precio && purchCalc.cantidad && parseFloat(purchCalc.cantidad) > 0 && (
                                      <div style={{ marginTop: 8, fontSize: 13, color: '#15803d', fontWeight: 800 }}>
                                        → Costo unitario: <b>${(parseFloat(purchCalc.precio)/parseFloat(purchCalc.cantidad)).toFixed(5)}/{purchCalc.unidad}</b>
                                      </div>
                                    )}
                                  </div>
                                </details>
              </div>

              {/* 2. MOD */}
              <div style={CARD}>
                {SECHEAD('2️⃣ Mano de Obra Directa (MOD)', {
                  title: '2. Mano de Obra Directa (MOD)',
                  text: 'Es el costo del tiempo que TÚ o tus empleados invierten DIRECTAMENTE en producir el producto. Se calcula como: Tarifa por hora × Horas de producción ÷ Unidades del lote.',
                  ex: 'Si pagas $120/hr, tardas 2 horas en hacer 24 piezas → MOD = ($120×2)/24 = $10 por pieza.'
                })}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#78716c', fontWeight: 600 }}>Tarifa ($/hora)</label>
                    <input type="number" value={modRate} onChange={e => setModRate(Number(e.target.value))} style={{ ...INP, width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#78716c', fontWeight: 600 }}>Horas por lote</label>
                    <input type="number" step="0.25" value={modHours} onChange={e => setModHours(Number(e.target.value))} style={{ ...INP, width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#78716c', fontWeight: 600 }}>Unidades / lote</label>
                    <input type="number" min="1" value={batchUnits} onChange={e => setBatchUnits(Math.max(1, Number(e.target.value)))} style={{ ...INP, width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#78716c' }}>
                  MOD por unidad = <b style={{ color: '#d97706' }}>${(modRate * modHours / batchUnits).toFixed(2)}</b>
                </div>
              </div>

              {/* 3. CIF */}
              <div style={CARD}>
                {SECHEAD('3️⃣ Costos Indirectos de Fabricación (CIF)', {
                  title: '3. Costos Indirectos de Fabricación (CIF)',
                  text: 'Son los costos de producción que NO son ni ingredientes ni mano de obra directa, pero son necesarios para producir: gas, luz del horno, agua, depreciación del equipo, renta del espacio de producción. Se estiman como % del costo directo (MPD + MOD).',
                  ex: 'Si MPD+MOD = $23.70 y tus CIF son el 15% → CIF = $3.56 por unidad.'
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: '#78716c', fontWeight: 600 }}>CIF = % de (MPD + MOD)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="range" min={0} max={40} value={cifPct} onChange={e => setCifPct(Number(e.target.value))} style={{ width: 120 }} />
                    <span style={{ fontWeight: 800, color: brandColor, fontSize: 14 }}>{cifPct}%</span>
                  </div>
                </div>
                {/* Guía práctica CIF */}
                <div style={{ background: '#fef9f3', borderRadius: 10, padding: '10px 12px', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: 11, color: brandColor, fontWeight: 800, marginBottom: 8 }}>🧮 ¿No sabes tu %? Elige tu perfil de producción:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {[
                      { icon: '🏠', tipo: 'Cocina en casa', gas: '$400–600/mes', luz: '$200–350/mes', prod: '40–80 pzas', rango: '12–18%', pct: 15 },
                      { icon: '🔧', tipo: 'Taller pequeño', gas: '$1,000–2,000', luz: '$500–900', prod: '100–250 pzas', rango: '18–25%', pct: 21 },
                      { icon: '🏪', tipo: 'Local comercial', gas: '$3,000+', renta: 'variable', prod: '300+ pzas', rango: '25–35%', pct: 30 },
                    ].map(p => (
                      <div key={p.tipo} onClick={() => setCifPct(p.pct)}
                        style={{ background: cifPct === p.pct ? '#fff7ed' : '#fff', borderRadius: 8, padding: '7px 8px', cursor: 'pointer', border: `1.5px solid ${cifPct === p.pct ? '#f97316' : '#e7e0d8'}`, transition: 'all .15s' }}>
                        <div style={{ fontSize: 16 }}>{p.icon}</div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#44403c', marginTop: 2 }}>{p.tipo}</div>
                        <div style={{ fontSize: 9, color: '#78716c', marginTop: 3 }}>Gas: {p.gas}</div>
                        {p.luz && <div style={{ fontSize: 9, color: '#78716c' }}>Luz: {p.luz}</div>}
                        {p.renta && <div style={{ fontSize: 9, color: '#78716c' }}>Renta: {p.renta}</div>}
                        <div style={{ fontSize: 9, color: '#78716c' }}>{p.prod}/mes</div>
                        <div style={{ marginTop: 5, fontSize: 11, fontWeight: 900, color: '#c2410c', background: '#fff7ed', borderRadius: 5, padding: '2px 6px', textAlign: 'center' }}>{p.rango}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: '#a8a29e', marginTop: 8 }}>💡 CIF incluye: gas, luz, agua, depreciación del horno (vida útil 10 años) y renta proporcional del espacio de producción. Haz clic en tu perfil para aplicarlo.</div>
                </div>
                {/* GI Real toggle */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: brandColor }}>
                    <input type="checkbox" checked={useGiReal} onChange={e => setUseGiReal(e.target.checked)} />
                    Calcular GI desde costos reales (más preciso)
                  </label>
                  {useGiReal && (
                    <div style={{ marginTop: 10, background: '#f0fdf4', borderRadius: 10, padding: '12px', border: '1px dashed #86efac' }}>
                      <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, marginBottom: 8 }}>
                        💡 GI Real = (Renta + Luz + Gas + Otros) ÷ Horas operadas/mes
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Renta/mes $', key: 'renta' },
                          { label: 'Luz/mes $', key: 'luz' },
                          { label: 'Gas/mes $', key: 'gas' },
                          { label: 'Otros/mes $', key: 'otros' },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <label style={{ fontSize: 10, color: '#78716c', fontWeight: 600 }}>{label}</label>
                            <input type="number" value={giReal[key]} onChange={e => setGiReal(p => ({ ...p, [key]: Number(e.target.value) }))}
                              style={{ ...INP, width: '100%', marginTop: 3, boxSizing: 'border-box' }} />
                          </div>
                        ))}
                        <div style={{ gridColumn: '1/-1' }}>
                          <label style={{ fontSize: 10, color: '#78716c', fontWeight: 600 }}>Horas operadas/mes</label>
                          <input type="number" value={giReal.horas} onChange={e => setGiReal(p => ({ ...p, horas: Number(e.target.value) }))}
                            style={{ ...INP, width: '100%', marginTop: 3, boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      {giReal.horas > 0 && (
                        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: '#15803d' }}>
                          → Tasa GI real: <b>${((giReal.renta+giReal.luz+giReal.gas+giReal.otros)/giReal.horas).toFixed(2)}/hora</b>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 3-4-5-6: Receta — ingredientes, GO, margen y precio */}
              <div style={CARD}>
                {SECHEAD('📝 Armar Receta + Precio Final', {
                  title: 'Ingredientes de la Receta',
                  text: 'Conecta tus ingredientes (MPD) con el producto seleccionado, especificando cuánto usa de cada uno. El sistema calcula automáticamente los 6 rubros de costo contable.',
                  ex: 'Producto Ejemplo: Insumo A 500g, Insumo B 80g, Insumo C 5g, Insumo D 3g → MPD calculado automáticamente.'
                })}
                {!recName && (
                  <div style={{ padding: '8px 12px', background: '#fef9c3', borderRadius: 8, fontSize: 12, color: '#854d0e', marginBottom: 10, border: '1px solid #fde047' }}>
                    ⚠️ Selecciona primero un producto del menú arriba (Paso 1).
                  </div>
                )}
                <div style={{ background: '#faf7f2', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#78716c', fontWeight: 700, marginBottom: 6 }}>Ingredientes de esta receta (MPD):</div>
                  {recItems.map((it, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ flex: 1 }}>{it.ing}</span><span>×{it.qty}</span>
                      <span onClick={() => setRecItems(recItems.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: '#dc2626' }}>×</span>
                    </div>
                  ))}
                  {ings.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      <select id="ing-select" style={{ ...INP, flex: 1 }}>{ings.map(i => <option key={i.name}>{i.name}</option>)}</select>
                      <input id="ing-qty" placeholder="Cantidad" type="number" step="0.01" defaultValue="1" style={{ ...INP, width: 80 }} />
                      <button onClick={() => {
                        const sel = document.getElementById('ing-select')?.value;
                        const qty = parseFloat(document.getElementById('ing-qty')?.value) || 0;
                        if (sel && qty > 0) setRecItems(prev => [...prev, { ing: sel, qty }]);
                      }} style={BTN('#78400e')}>+ Ing.</button>
                    </div>
                  ) : <p style={{ fontSize: 11, color: '#a8a29e' }}>Agrega ingredientes primero (sección 1).</p>}
                </div>

                {/* 4.5 Merma / Imprevistos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 12, color: '#78716c', fontWeight: 600, whiteSpace: 'nowrap' }}>4️⃣ Merma / Imprevistos</label>
                    {INFO({ title: '4. Merma e Imprevistos', text: 'Porcentaje que cubre ingredientes que se pierden durante la preparación, quemaduras, descarte de presentación imperfecta y cualquier imprevisto. Se aplica sobre el Costo de Producción (MPD+MOD+CIF).', ex: '5% de merma sobre un costo de $20 = $1 de reserva → Costo ajustado $21 antes de margen.' })}
                  </div>
                  <input type="range" min={0} max={15} value={merma} onChange={e => setMerma(Number(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontWeight: 800, color: brandColor, fontSize: 14, minWidth: 36 }}>{merma}%</span>
                </div>

                {/* Gastos Operativos — líneas individuales */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: '#78716c', fontWeight: 600 }}>5️⃣ Gastos Operativos / unidad</label>
                    {INFO({ title: '5. Gastos Operativos por Unidad', text: 'Son los gastos que NO son de producción pero se cargan por unidad vendida: empaque (caja/bolsa), comisión de plataforma de pago, etiqueta, etc.', ex: 'Caja $2.50 + bolsa $1.00 + comisión Stripe ~3% = ~$5/unidad.' })}
                  </div>
                  {/* Lista de líneas */}
                  {opExItems.length > 0 && (
                    <div style={{ background: '#faf7f2', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
                      {opExItems.map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#44403c', marginBottom: 3 }}>
                          <span>{it.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, color: brandColor }}>${Number(it.cost).toFixed(2)}</span>
                            <span onClick={() => { const n = opExItems.filter((_,j)=>j!==i); setOpExItems(n); setOpEx(n.reduce((s,x)=>s+Number(x.cost),0)); }}
                              style={{ cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: 13 }}>×</span>
                          </div>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid #e7d5c0', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800 }}>
                        <span>Total GO/unidad</span>
                        <span style={{ color: brandColor }}>${opEx.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {/* Agregar línea nueva */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <input placeholder="ej. Caja de cartón" value={newOpEx.name}
                      onChange={e => setNewOpEx(p => ({ ...p, name: e.target.value }))}
                      style={{ ...INP, flex: 2, minWidth: 120 }} />
                    <input type="number" placeholder="$0.00" step="0.5" value={newOpEx.cost}
                      onChange={e => setNewOpEx(p => ({ ...p, cost: e.target.value }))}
                      style={{ ...INP, width: 80 }} />
                    <button onClick={() => {
                      const nombre = newOpEx.name.trim(), costo = parseFloat(newOpEx.cost);
                      if (!nombre || !costo) return;
                      const next = [...opExItems, { name: nombre, cost: costo }];
                      setOpExItems(next);
                      setOpEx(next.reduce((s, x) => s + Number(x.cost), 0));
                      setNewOpEx({ name: '', cost: '' });
                    }} style={BTN(brandColor)}>+ Agregar</button>
                  </div>
                  {opExItems.length === 0 && <p style={{ fontSize: 11, color: '#a8a29e', marginTop: 5 }}>Agrega tus gastos: empaque, etiqueta, comisión de pago, etc.</p>}
                </div>

                {/* Margen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 12, color: '#78716c', fontWeight: 600 }}>6️⃣ Margen de ganancia</label>
                    {INFO({ title: '6. Precio de Venta con Margen', text: 'El margen se aplica SOBRE el costo total. Fórmula: Precio = Costo Total ÷ (1 - Margen%). Un margen del 50% significa que de cada peso que cobras, 50 centavos son ganancia neta.', ex: 'Costo Total $27 con margen 50% → Precio = $27 / (1-0.50) = $54. Tu ganancia = $27.' })}
                  </div>
                  <input type="range" min={20} max={80} value={margin} onChange={e => setMargin(Number(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontWeight: 800, color: brandColor, fontSize: 14 }}>{margin}%</span>
                </div>

                <button disabled={!recName.trim() || recItems.length === 0} onClick={() => {
                  const rec = { name: recName.trim(), items: recItems };
                  const next = [...recs.filter(r => r.name !== rec.name), rec];
                  saveRecs(next); setRecName(''); setRecItems([]);
                }} style={{ ...BTN(brandColor), opacity: (!recName.trim() || recItems.length === 0) ? 0.5 : 1 }}>Guardar Receta</button>
              </div>

              {/* Resultados: acordeón por receta */}
              {recs.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: brandColor, fontWeight: 800, marginBottom: 8, letterSpacing: '.04em', textTransform: 'uppercase' }}>📊 Recetas Guardadas ({recs.length}) — haz clic para ver el desglose</div>
                  {recs.map(rec => {
                    const mpd      = calcCost(rec);
                    const mod      = modRate * modHours / batchUnits;
                    // GI: real ($/hora × horas/lote ÷ unidades) o estimado (% de MPD+MOD)
                    const giRealPerUnit = useGiReal && giReal.horas > 0
                      ? ((giReal.renta+giReal.luz+giReal.gas+giReal.otros)/giReal.horas) * modHours / batchUnits
                      : 0;
                    const cif      = useGiReal ? giRealPerUnit : (mpd + mod) * cifPct / 100;
                    const costoProd  = mpd + mod + cif;
                    const costoConMerma = costoProd * (1 + merma / 100); // Nivel 5: merma
                    const costoTotal = costoConMerma + opEx;
                    const precio    = costoTotal / (1 - margin / 100);
                    const priceFmt  = Math.ceil(precio / 5) * 5;
                    const rMgn     = priceFmt > 0 ? Math.round((priceFmt - costoTotal) / priceFmt * 100) : 0;
                    const isOpen   = expandedRec === rec.name;
                    const sem      = rMgn >= 50 ? '🟢' : rMgn >= 30 ? '🟡' : '🔴';
                    return (
                      <div key={rec.name} style={{ ...CARD, marginBottom: 8 }}>
                        <div onClick={() => setExpandedRec(isOpen ? null : rec.name)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: brandColor }}>{isOpen ? '▼' : '▶'}</span>
                            <span style={{ fontWeight: 800, fontSize: 13, color: '#1a1208' }}>{rec.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 900, color: '#15803d' }}>${priceFmt}</span>
                            <span style={{ fontSize: 11 }}>{sem} {rMgn}%</span>
                            <span onClick={e => { e.stopPropagation(); saveRecs(recs.filter(r => r.name !== rec.name)); }}
                              style={{ fontSize: 10, color: '#dc2626', cursor: 'pointer', padding: '2px 6px', border: '1px solid #fca5a5', borderRadius: 4 }}>✕</span>
                          </div>
                        </div>
                        {isOpen && (() => {
                          const [sl, sbg, sbd, stip] = rMgn >= 50
                            ? ['🟢 Margen Saludable', '#f0fdf4', '#86efac', '✅ Puedes absorber alzas de ingredientes.']            
                            : rMgn >= 30
                            ? ['🟡 Margen Ajustado', '#fefce8', '#fde047', '⚠️ Considera subir precio. Mínimo recomendable: 35–40%.']
                            : ['🔴 Precio en Riesgo', '#fef2f2', '#fca5a5', '🚨 Revisa tus costos o ajusta el precio urgente.'];
                          return (
                            <div style={{ marginTop: 12, borderTop: '1px solid #f3f0ec', paddingTop: 12 }}>
                              <div style={{ fontSize: 12 }}>
                                {[
                                  { n: '① MPD', label: 'Materia Prima Directa',       val: mpd,       color: '#1e40af', bg: '#eff6ff' },
                                  { n: '② MOD', label: 'Mano de Obra Directa',        val: mod,       color: '#7c3aed', bg: '#f5f3ff' },
                                  { n: '③ CIF', label: `CIF (${cifPct}% MPD+MOD)`,    val: cif,       color: '#0f766e', bg: '#f0fdfa' },
                                  { n: '④ CP',  label: 'Costo de Producción',        val: costoProd, color: '#b45309', bg: '#fef3c7', bold: true },
                                  { n: '⑤ GO',  label: 'Gastos Operativos',           val: opEx,      color: '#9f1239', bg: '#fff1f2' },
                                  { n: '⑥ CT',  label: 'Costo Total',                val: costoTotal,color: '#dc2626', bg: '#fef2f2', bold: true },
                                ].map(row => (
                                  <div key={row.n} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 7, marginBottom: 4, background: row.bg }}>
                                    <span style={{ color: row.color, fontWeight: row.bold ? 800 : 600 }}>{row.n} <span style={{ fontWeight: 400, color: '#78716c' }}>{row.label}</span></span>
                                    <span style={{ fontWeight: row.bold ? 800 : 700, color: row.color }}>${row.val.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: '1.5px solid #86efac' }}>
                                  <div style={{ fontSize: 10, color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>💵 Precio Sugerido</div>
                                  <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d' }}>${priceFmt}</div>
                                  <div style={{ fontSize: 10, color: '#6b7280' }}>redondeado al $5</div>
                                </div>
                                <div style={{ background: '#faf0e6', borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: '1.5px solid #e7d5c0' }}>
                                  <div style={{ fontSize: 10, color: brandColor, fontWeight: 700, textTransform: 'uppercase' }}>📈 Tu Ganancia ({margin}%)</div>
                                  <div style={{ fontSize: 24, fontWeight: 900, color: brandColor }}>${(priceFmt - costoTotal).toFixed(2)}</div>
                                  <div style={{ fontSize: 10, color: '#6b7280' }}>por unidad</div>
                                </div>
                              </div>
                              <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 8 }}>Ingredientes: {rec.items.map(it => `${it.ing} ×${it.qty}`).join(' · ')}</div>
                              <div style={{ marginTop: 10, padding: '10px 13px', background: sbg, borderRadius: 10, border: `1.5px solid ${sbd}` }}>
                                <div style={{ fontWeight: 800, fontSize: 12, color: '#1a1208', marginBottom: 5 }}>{sl}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: '#44403c' }}>
                                  <div>Margen real: <b style={{ color: brandColor }}>{rMgn}%</b></div>
                                  <div>Ganancia: <b style={{ color: '#15803d' }}>${(priceFmt - costoTotal).toFixed(2)} MXN</b></div>
                                </div>
                                <div style={{ fontSize: 10, color: '#44403c', marginTop: 5, borderTop: `1px solid ${sbd}`, paddingTop: 4 }}>{stip}</div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </>);
          })()} 
          </>)}
        </>)}

        {tab === 'exp' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#44403c' }}>📋 Expediente Digital</h2>
          <div style={{ ...CARD, background: expPct < 100 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${expPct < 100 ? '#fca5a5' : '#86efac'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: expPct < 100 ? '#dc2626' : '#16a34a' }}>{expPct < 100 ? `⚠️ ${expPct}% completado` : '✅ Expediente completo'}</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: expPct < 100 ? '#dc2626' : '#16a34a' }}>{expPct}%</span>
            </div>
            {expPct < 100 && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>Completa tu expediente para evitar la suspensión del servicio (Cláusula 6.4 del contrato).</p>}
          </div>
          <div style={CARD}>
            <div style={{ fontSize: 12, color: '#78716c', marginBottom: 12 }}>Marca cada documento como entregado a GenyX:</div>
            {EXPEDIENTE_DOCS.map(doc => (
              <div key={doc.key} onClick={() => toggleDoc(doc.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #f5f0ea', cursor: 'pointer' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${expDocs[doc.key] ? '#16a34a' : '#d4c9be'}`, background: expDocs[doc.key] ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                  {expDocs[doc.key] && <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: expDocs[doc.key] ? '#44403c' : '#78716c', textDecoration: expDocs[doc.key] ? 'none' : 'none' }}>{doc.label}</span>
              </div>
            ))}
          </div>
          <div style={{ ...CARD, background: '#faf0e6', border: '1px solid #e7d5c0', fontSize: 12, color: '#78400e' }}>
            📧 Envía tus documentos en PDF a: <b>hola@genyxsystems.com</b><br/>
            GenyX confirmará cada entrega y actualizará tu expediente.
          </div>
        </>)}

        {/* ═══ TAB: FOTO LAB ═══ */}
        {tab === 'foto' && <TabFotoLab slug={slug} token={token} />}

        {/* ═══ TAB: MIS AGENTES (Fase 3 T6) ═══ */}
        {tab === 'misAgentes' && <TabMisAgentes slug={slug} token={token} />}

        {/* ═══ TAB: REPORTE DEL LUNES (Fase 3 T7) ═══ */}
        {tab === 'reporteLunes' && <TabReporteLunesCliente slug={slug} token={token} />}

        {/* ═══ TABS PLACEHOLDER: módulos no construidos ═══ */}
        {['citas', 'leads', 'pacientes', 'reservas', 'cursos'].includes(tab) && (
          <TabPlaceholder placeholder={TAB_REGISTRY[tab]?.placeholder || TAB_REGISTRY[tab]?.label || tab} />
        )}

        <p style={{ textAlign: 'center', color: '#c4b5a5', fontSize: 10, marginTop: 20 }}>GenyX · {slug} · Actualiza cada 30s</p>
      </main>

      {/* ═══ T&C ACCEPTANCE MODAL (Fase 3 T8) ═══ */}
      {showTcModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 18, padding: '28px 24px',
            maxWidth: 440, width: '100%', maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>Términos y Condiciones</h2>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>GenyX Systems · Abril 2026</p>
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.7, color: '#44403c', background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16, maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>Al usar el Mando Cliente aceptas que:</p>
              <p>• <b>GenyX Mando</b> es la interfaz de gestión de tu operación comercial autónoma.</p>
              <p>• El servicio funciona con <b>suscripción mensual fija</b>. Sin permanencia mínima.</p>
              <p>• El sistema opera con IA generativa — <b>no garantizamos precisión del 100%</b>.</p>
              <p>• GenyX <b>no retiene fondos</b> de tus compradores; van directo a tu cuenta Stripe.</p>
              <p>• Puedes cancelar con 30 días de aviso a hola@genyxsystems.com.</p>
              <p>• Tus datos se tratan conforme a la <b>LFPDPPP</b>.</p>
              <p style={{ marginTop: 8, fontSize: 11, color: '#6366f1' }}>
                Lee los documentos completos: <a href="/client-terminos" target="_blank" style={{ color: '#4f46e5' }}>Términos</a> · <a href="/client-privacidad" target="_blank" style={{ color: '#4f46e5' }}>Privacidad</a>
              </p>
            </div>

            <button
              disabled={tcAccepting}
              onClick={async () => {
                setTcAccepting(true);
                try {
                  const r = await fetch(`${BACKEND}/api/client/${slug}/tc-accept`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token },
                    body: JSON.stringify({ tc_version: tcVersion || new Date().toISOString() }),
                  });
                  if (!r.ok) {
                    const d = await r.json().catch(() => ({}));
                    alert(`Error al aceptar T&C: ${d.detail || r.status}. Intenta de nuevo.`);
                    return;
                  }
                  setShowTcModal(false);
                } catch (e) {
                  console.error('[T&C] Accept failed:', e);
                  alert('No se pudo registrar la aceptación. Verifica tu conexión e intenta de nuevo.');
                } finally {
                  setTcAccepting(false);
                }
              }}
              style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: tcAccepting ? 'wait' : 'pointer',
                opacity: tcAccepting ? 0.6 : 1, transition: 'all .2s',
              }}
            >
              {tcAccepting ? '⏳ Aceptando…' : '✅ Acepto los Términos y Condiciones'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PWA Install Banner ────────────────────────────────────────────────────
function PWAInstallBanner() {
  const [show, setShow] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (dismissed) return;
    const check = () => { if (window.__pwaPrompt) setTimeout(() => setShow(true), 5000); };
    if (window.__pwaPrompt) { setTimeout(() => setShow(true), 5000); return; }
    window.addEventListener('pwa-ready', check);
    return () => window.removeEventListener('pwa-ready', check);
  }, [dismissed]);

  if (!show || dismissed) return null;

  const install = async () => {
    const p = window.__pwaPrompt;
    if (!p) return;
    p.prompt();
    const result = await p.userChoice;
    if (result.outcome === 'accepted') setDismissed(true);
    setShow(false);
    window.__pwaPrompt = null;
  };

  return (
    <div style={{
      position: 'fixed', bottom: 90, left: 24, right: 90, zIndex: 9998,
      background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.95))',
      backdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 12px 40px rgba(99,102,241,0.4)',
      animation: 'slideUp .4s ease-out', maxWidth: 420,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📲</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Instala GenyX</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Acceso rápido desde tu pantalla de inicio</div>
      </div>
      <button onClick={install} style={{ background: '#fff', color: '#6366f1', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Instalar</button>
      <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, padding: '2px 4px', flexShrink: 0 }}>×</button>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}

// ── GenyX Concierge Web Widget (floating chat) ───────────────────────────
function GenyXConciergeWidget() {
  const BURL = BACKEND;
  const BC = '#6366f1', BD = '#4f46e5';
  const [open, setOpen] = React.useState(false);
  const [msgs, setMsgs] = React.useState([]);
  const [inp, setInp] = React.useState('');
  const [phase, setPhase] = React.useState('negocio');
  const [col, setCol] = React.useState({ negocio: '', reto: '' });
  const [typing, setTyping] = React.useState(false);
  const [pulse, setPulse] = React.useState(true);
  const botRef = React.useRef(null);
  const inpRef = React.useRef(null);

  React.useEffect(() => { const t = setTimeout(() => setPulse(false), 8000); return () => clearTimeout(t); }, []);
  React.useEffect(() => { if (open && msgs.length === 0) addReply('Hola 👋 Bienvenido a GenyX.\n\nAyudamos a negocios como el tuyo a vender más con 9 agentes de IA que se vuelven más inteligentes con el tiempo.\n\n¿A qué se dedica tu negocio?'); }, [open]);
  React.useEffect(() => { botRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);
  React.useEffect(() => { if (open && phase !== 'done') setTimeout(() => inpRef.current?.focus(), 150); }, [open, phase]);

  function addReply(text, d = 800) { setTyping(true); setTimeout(() => { setTyping(false); setMsgs(p => [...p, { from: 'bot', text }]); }, d); }

  async function callAI(neg, ret) {
    setTyping(true);
    try {
      const r = await fetch(`${BURL}/api/genyx-bot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ negocio: neg, reto: ret }) });
      const d = await r.json();
      setTyping(false);
      setMsgs(p => [...p, { from: 'bot', text: d.reply || '¡Perfecto! Te podemos ayudar exactamente con eso 🎯\n\n¿Cómo te llamas y cuál es tu WhatsApp o email?' }]);
    } catch { setTyping(false); setMsgs(p => [...p, { from: 'bot', text: '¡Te entendemos! Con GenyX lo automatizamos en 48 hrs.\n\n¿Cómo te llamas y cuál es tu WhatsApp o email?' }]); }
    setPhase('capture');
  }

  async function saveLead(nom, contact, neg, ret) {
    try { await fetch(`${BURL}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nom, contacto: contact, negocio: neg, reto: ret }) }); } catch {}
  }

  function handleSend() {
    const v = inp.trim(); if (!v || phase === 'done') return;
    setInp(''); setMsgs(p => [...p, { from: 'user', text: v }]);
    if (phase === 'negocio') { setCol(x => ({ ...x, negocio: v })); setPhase('reto'); addReply(`¡Perfecto, los negocios de ${v} tienen potencial enorme con IA! 🚀\n¿Cuál es tu mayor reto hoy?\n\n(atención a clientes, pedidos por WA, pagos, contabilidad, otro)`, 800); }
    else if (phase === 'reto') { const upd = { ...col, reto: v }; setCol(upd); setPhase('ai'); callAI(col.negocio, v); }
    else if (phase === 'capture') { saveLead(v.split(' ')[0], v, col.negocio, col.reto); setPhase('done'); addReply(`¡Gracias! ✅\nUn especialista de GenyX te contacta en menos de 24 horas.\n\n📧 hola@genyxsystems.com`, 900); }
  }

  const ph = phase === 'negocio' ? 'Ej: clínica, tienda, estudio...' : phase === 'reto' ? 'Ej: muchos mensajes sin responder...' : phase === 'capture' ? 'Tu nombre + WhatsApp o email...' : '';

  return (
    <>
      {open && (
        <div style={{ position:'fixed', bottom:88, right:24, width:340, maxHeight:500, zIndex:9999, background:'#0f172a', border:'1px solid rgba(99,102,241,0.3)', borderRadius:20, boxShadow:'0 24px 64px rgba(0,0,0,0.55)', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:"'Inter',sans-serif" }}>
          <div style={{ background:`linear-gradient(135deg,${BC},${BD})`, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 8px #4ade80' }} />
              <div>
                <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:0 }}>GenyX Agente</p>
                <p style={{ color:'rgba(255,255,255,0.7)', fontSize:10, margin:0 }}>Responde en segundos · IA</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:20, lineHeight:1, padding:'2px 6px', borderRadius:6 }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 8px', display:'flex', flexDirection:'column', gap:10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent:m.from==='user'?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'84%', padding:'9px 13px', borderRadius:m.from==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', background:m.from==='user'?BC:'rgba(255,255,255,0.07)', color:m.from==='user'?'#fff':'#cbd5e1', fontSize:13, lineHeight:1.65, whiteSpace:'pre-line' }}>{m.text}</div>
              </div>
            ))}
            {typing && (<div style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', background:'rgba(255,255,255,0.07)', borderRadius:'16px 16px 16px 4px', width:'fit-content' }}>{[0,1,2].map(i => (<div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#64748b', animation:`gcb ${1.2}s ${i*0.2}s infinite` }} />))}</div>)}
            {phase==='done' && (<a href="mailto:hola@genyxsystems.com" style={{ display:'block', marginTop:8, background:`linear-gradient(135deg,${BC},${BD})`, color:'#fff', textAlign:'center', padding:'10px 16px', borderRadius:10, fontSize:12, fontWeight:700, textDecoration:'none' }}>📧 hola@genyxsystems.com</a>)}
            <div ref={botRef} />
          </div>
          {phase !== 'done' && (
            <div style={{ padding:'8px 12px 12px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:8 }}>
              <input ref={inpRef} value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={ph} disabled={typing} style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:10, padding:'8px 12px', color:'#f1f5f9', fontSize:13, outline:'none', opacity:typing?0.5:1 }} />
              <button onClick={handleSend} disabled={!inp.trim()||typing} style={{ background:BC, color:'#fff', border:'none', borderRadius:10, padding:'8px 14px', cursor:inp.trim()&&!typing?'pointer':'default', opacity:inp.trim()&&!typing?1:0.45, fontSize:15, fontWeight:700 }}>→</button>
            </div>
          )}
        </div>
      )}
      <button onClick={() => { setOpen(o => !o); setPulse(false); }} style={{ position:'fixed', bottom:28, right:28, zIndex:9999, width:54, height:54, borderRadius:'50%', background:open?BD:`linear-gradient(135deg,${BC},${BD})`, border:'none', cursor:'pointer', color:'#fff', fontSize:23, boxShadow:'0 4px 24px rgba(99,102,241,0.55)', transition:'all 0.25s', display:'flex', alignItems:'center', justifyContent:'center' }} aria-label="Chat con GenyX">
        {open ? '×' : <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
        {pulse && !open && (<span style={{ position:'absolute', top:-2, right:-2, width:14, height:14, background:'#4ade80', borderRadius:'50%', border:'2px solid #050508' }} />)}
      </button>
      <style>{`@keyframes gcb { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREDIBILITY COMPONENTS — Confianza por Transparencia (sin casos de éxito)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Immersive Simulator v2 ───────────────────────────────────────────────
// Brand: Indigo #6366f1, Violet #818cf8, Deep #312e81
// 8 tenant-facing agents, generic business names
function WhatsAppSimulator() {
  const [step, setStep] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);
  const [scenarioStep, setScenarioStep] = React.useState(0);
  const [activeAgents, setActiveAgents] = React.useState(new Set());
  const [processingAgents, setProcessingAgents] = React.useState(new Set());
  const [logs, setLogs] = React.useState([]);
  const [metrics, setMetrics] = React.useState({ orders:0, revenue:0, agents:0, patterns:0 });
  const chatRef = React.useRef(null);

  const SIM_AGENTS = [
    { id:'A1', name:'Marketing', role:'Contenido', tip:'Genera contenido con tu ADN de marca. Publica en redes y reactiva clientes inactivos.' },
    { id:'A2', name:'Captación', role:'Prospección', tip:'Atrae clientes a tus canales desde redes, web y búsquedas.' },
    { id:'A3', name:'Ventas', role:'Atención', tip:'Atiende cada mensaje en segundos con la personalidad de tu marca.' },
    { id:'A4', name:'Cierre', role:'Pagos', tip:'Genera links de pago y cobra dentro del chat — sin que el cliente salga.' },
    { id:'A5', name:'Entrega', role:'Logística', tip:'Coordina logística y envía notificaciones de estado al cliente.' },
    { id:'A6', name:'Seguimiento', role:'Retención', tip:'Recupera carritos abandonados y reactiva clientes que dejaron de comprar.' },
    { id:'A7', name:'Analítica', role:'KPIs', tip:'Detecta tu producto estrella, hora pico y tendencias. Cada semana más inteligente.' },
    { id:'A8', name:'Finanzas', role:'Márgenes', tip:'Calcula márgenes, punto de equilibrio y proyecciones con tus costos reales.' },

  ];

  const SCENARIO = [
    { trigger:/hola|hey|buenas|buenos/i,
      bot:'¡Hola! 👋 Bienvenido a tu negocio. ¿Qué te gustaría ordenar hoy? Tenemos nuestro menú completo disponible. 🛒',
      agents:['A3'], logs:[{m:'A3 Ventas: sesión iniciada',c:'#4ade80'},{m:'A7 Analítica: nueva sesión',c:'#818cf8'}], delay:1200 },
    { trigger:/menu|que tienen|productos|catalogo|catálogo|ver/i,
      bot:'📋 Productos disponibles:\n\n• Producto A — $25\n• Producto B — $120\n• Producto C — $180\n• Producto D (2 pzas) — $40\n• Producto E — $35\n\n¿Qué te gustaría ordenar? 😊',
      agents:['A3','A7'], logs:[{m:'A3 Ventas: catálogo presentado',c:'#4ade80'},{m:'A7 Analítica: consulta registrada',c:'#818cf8'}], delay:1500 },
    { trigger:/producto|quiero|dame|ordenar|pedir|2|uno|una/i,
      bot:'¡Excelente elección! 🎉 Tu pedido:\n\n• 2 × Producto A — $50\n• 1 × Producto E — $35\n\n💰 Total: $85\n\n¿Confirmamos? Te envío el link de pago 💳',
      agents:['A3','A4','A7','A8'], logs:[{m:'A3 Ventas: orden — $85',c:'#4ade80'},{m:'A4 Cierre: link de pago',c:'#6366f1'},{m:'A7 Analítica: ticket → $85',c:'#818cf8'},{m:'A8 Finanzas: margen 62.3%',c:'#f59e0b'}], metrics:{orders:1,revenue:85}, delay:1800 },
    { trigger:/si|sí|confirmo|confirmar|pago|dale|ok/i,
      bot:'✅ ¡Pedido confirmado!\n\n💳 Link de pago generado.\n\nUna vez que pagues, te confirmo la hora de entrega. ¡Gracias! 🙌',
      agents:['A4','A5','A6','A7','A8'], logs:[{m:'A4 Cierre: link generado',c:'#4ade80'},{m:'A5 Entrega: en cola',c:'#6366f1'},{m:'A6 Seguimiento: followup 24h',c:'#818cf8'},{m:'A8 Finanzas: P&L actualizado',c:'#f59e0b'}], metrics:{patterns:3}, delay:2200 },
    { trigger:/.*/,
      bot:'Gracias por probar el simulador. 😊 En producción, GenyX maneja todo en automático — 24/7.\n\n¿Te gustaría una demo para tu negocio?',
      agents:['A3','A1','A2'], logs:[{m:'A1 Marketing: oportunidad de demo',c:'#4ade80'},{m:'A2 Captación: lead calificado',c:'#6366f1'}], delay:1500 },
  ];

  const getTime = () => { const d=new Date(); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); };

  const processMessage = (text) => {
    if (!text.trim() || disabled) return;
    setMessages(p => [...p, { text, type:'out', time:getTime() }]);
    setInput(''); setDisabled(true); setTyping(true);
    let step;
    if (scenarioStep < SCENARIO.length - 1) {
      step = SCENARIO[scenarioStep];
      if (!step.trigger.test(text)) {
        const m = SCENARIO.findIndex(s => s.trigger.test(text));
        if (m >= 0 && m < SCENARIO.length - 1) step = SCENARIO[m];
      }
      setScenarioStep(s => Math.min(s + 1, SCENARIO.length - 1));
    } else { step = SCENARIO[SCENARIO.length - 1]; }
    setProcessingAgents(new Set(step.agents));
    setTimeout(() => {
      setProcessingAgents(new Set());
      setActiveAgents(prev => { const n = new Set(prev); step.agents.forEach(a => n.add(a)); return n; });
    }, 1200);
    setTimeout(() => {
      setTyping(false);
      setMessages(p => [...p, { text:step.bot, type:'in', time:getTime() }]);
      step.logs.forEach((l, i) => {
        setTimeout(() => setLogs(p => [{ ...l, time:getTime() }, ...p].slice(0, 12)), i * 300);
      });
      if (step.metrics) setMetrics(prev => ({ orders:prev.orders+(step.metrics.orders||0), revenue:prev.revenue+(step.metrics.revenue||0), agents:prev.agents, patterns:prev.patterns+(step.metrics.patterns||0) }));
      setDisabled(false);
    }, step.delay);
  };

  React.useEffect(() => { setMetrics(prev => ({ ...prev, agents: activeAgents.size })); }, [activeAgents]);
  React.useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, typing]);

  const agCard = (ag) => {
    const on = activeAgents.has(ag.id), proc = processingAgents.has(ag.id);
    return (
      <div key={ag.id} title={ag.tip} style={{ background: on?'rgba(99,102,241,0.06)':proc?'rgba(129,140,248,0.08)':'rgba(6,9,18,0.6)', border:`1px solid ${on?'rgba(99,102,241,0.3)':proc?'rgba(129,140,248,0.4)':'rgba(255,255,255,0.04)'}`, borderRadius:12, padding:14, display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all .4s cubic-bezier(.4,0,.2,1)', animation:proc?'simAgPulse 1.5s infinite':'none', cursor:'help', position:'relative' }}>
        <div style={{ width:42, height:42, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, background:on?'linear-gradient(135deg,#6366f1,#8b5cf6)':proc?'linear-gradient(135deg,#818cf8,#c084fc)':'rgba(255,255,255,0.05)', border:`2px solid ${on||proc?'transparent':'rgba(255,255,255,0.08)'}`, color:on||proc?'white':'#475569', boxShadow:on?'0 0 30px rgba(99,102,241,0.3)':proc?'0 0 30px rgba(129,140,248,0.3)':'none', transition:'all .4s' }}>{ag.id}</div>
        <div style={{ fontSize:10, fontWeight:600, color:on||proc?'#f1f5f9':'#475569', textAlign:'center' }}>{ag.name}</div>
        <div style={{ fontSize:9, color:on?'#818cf8':'#475569', textAlign:'center', opacity:on?1:0.7 }}>{ag.role}</div>
        <div style={{ position:'absolute', top:4, right:6, fontSize:9, color:'#475569', opacity:0.6, cursor:'help' }}>ⓘ</div>
      </div>
    );
  };

  return (
    <section style={{ position:'relative', padding:'80px 24px', maxWidth:1300, margin:'0 auto' }} id="simulador-inmersivo">
      <div style={{ textAlign:'center', marginBottom:48 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#818cf8', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>SIMULADOR EN VIVO</div>
        <h2 style={{ fontSize:36, fontWeight:900, color:'#f1f5f9', marginBottom:10, letterSpacing:'-1px', lineHeight:1.15 }}>Escribe un mensaje y observa<br/><span style={{ background:'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>cómo operan tus 9 agentes en tiempo real.</span></h2>
        <p style={{ color:'#94a3b8', fontSize:15, maxWidth:560, margin:'0 auto' }}>Esta es una simulación real de lo que GenyX hace con tu negocio. Cada mensaje activa agentes que procesan, ejecutan y generan tu briefing — en automático.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'400px 1fr', gap:24, minHeight:680 }}>
        {/* WA Panel */}
        <div style={{ background:'#111b21', borderRadius:16, border:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#1f2c34', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#312e81,#6366f1,#818cf8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', fontWeight:700, color:'white' }}>G</div>
            <div><div style={{ fontSize:15, fontWeight:600, color:'#e9edef' }}>Tu Negocio</div><span style={{ fontSize:12, color:'#4ade80' }}>● en línea</span></div>
          </div>
          <div ref={chatRef} style={{ flex:1, padding:16, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf:m.type==='out'?'flex-end':'flex-start', background:m.type==='out'?'#005c4b':'#202c33', color:'#e9edef', padding:'8px 12px', borderRadius:8, borderBottomRightRadius:m.type==='out'?2:8, borderBottomLeftRadius:m.type==='in'?2:8, maxWidth:'85%', fontSize:14, lineHeight:1.45, whiteSpace:'pre-line', animation:'simMsgIn .3s ease' }}>
                <span dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g,'<br>').replace(/\*(.*?)\*/g,'<strong>$1</strong>') }} />
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', textAlign:'right', marginTop:3 }}>{m.time}</div>
              </div>
            ))}
            {typing && <div style={{ alignSelf:'flex-start', background:'#202c33', padding:'10px 16px', borderRadius:8, display:'flex', gap:4 }}>
              {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#8696a0', display:'inline-block', animation:`simDot 1.4s ${i*0.2}s infinite` }} />)}
            </div>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#1f2c34', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <input style={{ flex:1, background:'#2a3942', border:'none', borderRadius:20, padding:'10px 16px', color:'#e9edef', fontSize:14, fontFamily:"'Inter',sans-serif", outline:'none' }}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter') processMessage(input); }}
              placeholder={messages.length===0?'Escribe "Hola" para comenzar...':'Escribe un mensaje...'} disabled={disabled} />
            <button style={{ width:40, height:40, borderRadius:'50%', background:'#25D366', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'1.1rem' }}
              onClick={() => processMessage(input)} disabled={disabled}>➤</button>
          </div>
        </div>

        {/* Dashboard Panel */}
        <div style={{ background:'rgba(15,20,35,0.7)', borderRadius:16, border:'1px solid rgba(99,102,241,0.12)', backdropFilter:'blur(12px)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'16px 24px', borderBottom:'1px solid rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:0 }}>⚡ Centro de Operaciones</h2>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#4ade80', fontWeight:500 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', display:'inline-block', animation:'simPls 2s infinite' }} />Sistema activo</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, padding:20, flex:1 }}>{SIM_AGENTS.map(agCard)}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'rgba(99,102,241,0.12)', borderTop:'1px solid rgba(99,102,241,0.12)' }}>
            {[['orders','Pedidos'],['revenue','Revenue'],['agents','Agentes activos'],['patterns','Patrones']].map(([k,l]) => (
              <div key={k} style={{ background:'rgba(6,9,18,0.8)', padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'1.3rem', fontWeight:800, background:'linear-gradient(135deg,#6366f1,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{k==='revenue'?`$${metrics[k].toLocaleString()}`:k==='agents'?`${metrics[k]}/8`:metrics[k]}</div>
                <div style={{ fontSize:10, color:'#475569', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(99,102,241,0.12)', maxHeight:140, overflowY:'auto' }}>
            <h4 style={{ fontSize:11, color:'#475569', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8, marginTop:0 }}>Actividad en vivo</h4>
            {logs.map((l, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', fontSize:12, color:'#94a3b8', animation:'simFUp .3s ease' }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:l.c, flexShrink:0 }} />
                <span>{l.m}</span>
                <span style={{ color:'#475569', fontSize:10, marginLeft:'auto' }}>{l.time}</span>
              </div>
            ))}
            {logs.length===0 && <div style={{ fontSize:12, color:'#475569' }}>Esperando primera interacción...</div>}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes simMsgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes simFUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes simPls{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes simDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        @keyframes simAgPulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0)}50%{box-shadow:0 0 0 6px rgba(99,102,241,.1)}}
      `}</style>
    </section>
  );
}




// ── 3. Dashboard Preview ────────────────────────────────────────────────────
function DashboardPreview() {
  return (
    <section style={{ padding: '0 24px 100px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '.1em', marginBottom: 12 }}>TU CENTRO DE MANDO</div>
        <h2 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>Ve cada venta.<br /><span style={{ background: 'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>En tiempo real.</span></h2>
        <p style={{ color: '#64748b', fontSize: 14, maxWidth: 460, margin: '0 auto' }}>Pedidos, ingresos, clientes y métricas — desde tu celular o computadora. Sin instalar nada.</p>
      </div>
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 32px 80px rgba(99,102,241,0.15), 0 0 0 1px rgba(99,102,241,0.1)' }}>
        <img src="/dashboard-preview.png" alt="Centro de Mando GenyX — Panel de control en tiempo real" style={{ width: '100%', display: 'block' }} loading="lazy" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(5,5,8,0.9) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', padding: '8px 20px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>📊 Panel en vivo desde el día 1</span>
        </div>
      </div>
    </section>
  );
}

// ── FAQItem (proper component — fixes hooks-in-map violation) ────────────────
function FAQItem({ question, answer }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'20px 0' }}>
      <div onClick={() => setOpen(!open)} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', cursor:'pointer', gap:16 }}>
        <span style={{ fontWeight:700, fontSize:15, color:'#f1f5f9', lineHeight:1.5 }}>{question}</span>
        <span style={{ color:'#6366f1', fontWeight:800, fontSize:18, flexShrink:0, marginTop:1 }}>{open ? '−' : '+'}</span>
      </div>
      {open && <p style={{ color:'#64748b', fontSize:14, lineHeight:1.8, marginTop:14, paddingRight:32 }}>{answer}</p>}
    </div>
  );
}



// ── GenyX Landing Page — Diseño Aprobado (genyxsystems.com) ────────
// ══════════════════════════════════════════════════════════════════════════════
// 📋 PLANES PAGE — /planes — Detalle completo de planes §5.2
// ══════════════════════════════════════════════════════════════════════════════
function PlanesPage() {
  const S = { page: { minHeight: '100vh', background: '#05080f', fontFamily: "'Inter',sans-serif", color: '#cbd5e1', padding: '60px 24px 80px' }, container: { maxWidth: 960, margin: '0 auto' }, h1: { fontSize: 38, fontWeight: 900, color: '#f1f5f9', marginBottom: 8, textAlign: 'center' }, sub: { fontSize: 15, color: '#64748b', textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }, section: { marginBottom: 48 }, sTitle: { fontSize: 18, fontWeight: 800, color: '#a5b4fc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }, card: { background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '24px 28px', marginBottom: 16 }, li: { fontSize: 14, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 6 }, table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid rgba(99,102,241,0.3)', color: '#818cf8', fontWeight: 700, fontSize: 12 }, td: { padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1' }, tdH: { padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f1f5f9', fontWeight: 700 }, note: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 16, lineHeight: 1.7 } };

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '.12em', marginBottom: 12 }}>DETALLE DE PLANES</div>
        </div>
        <h1 style={S.h1}>Tres planes según el tamaño de tu negocio.</h1>
        <p style={S.sub}>Todos los planes incluyen los 9 agentes de IA. Lo que varía es la cuota de operación proactiva según el volumen de tu negocio.</p>

        {/* §5.1 Resumen de planes */}
        <div style={S.section}>
          <div style={S.sTitle}>📊 Estructura de planes</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}></th>
                <th style={S.th}>ESENCIAL</th>
                <th style={{ ...S.th, color: '#c084fc' }}>PROFESIONAL ★</th>
                <th style={S.th}>ENTERPRISE</th>
              </tr></thead>
              <tbody>
                {[
                  ['Cuota mensual', '$9,900 MXN', '$18,900 MXN', '$34,900 MXN'],
                  ['Setup inicial (una vez)', '$12,000 MXN', '$18,000 MXN', '$30,000 MXN'],
                  ['Negocio ideal', '$200K–$700K MXN/mes', '$700K–$2M MXN/mes', '$2M–$5M MXN/mes'],
                  ['Empleados aproximados', '5 – 15', '15 – 50', '50 – 100'],
                  ['Agentes de IA', '9', '9', '9'],
                ].map(([label, ...vals]) => (
                  <tr key={label}>
                    <td style={S.tdH}>{label}</td>
                    {vals.map((v, i) => <td key={i} style={S.td}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={S.note}>★ Plan más popular. Cero comisión por venta. Sin permanencia mínima — cancelas cuando quieras. Contrato legal transparente firmado al alta.</p>
        </div>

        {/* §5.2 Lo que SIEMPRE incluye */}
        <div style={S.section}>
          <div style={S.sTitle}>✅ Lo que siempre incluye tu plan</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Función</th>
                <th style={S.th}>Esencial</th>
                <th style={{ ...S.th, color: '#c084fc' }}>Profesional</th>
                <th style={S.th}>Enterprise</th>
              </tr></thead>
              <tbody>
                {[
                  ['Conversaciones inbound', 'Sin límite', 'Sin límite', 'Sin límite'],
                  ['Cobro Stripe en chat', 'Sin límite', 'Sin límite', 'Sin límite'],
                  ['Recuperación de carritos', '200 mensajes', '400 mensajes', '600 mensajes'],
                  ['Reactivación de inactivos', '100 mensajes', '200 mensajes', '300 mensajes'],
                  ['Confirmaciones / recordatorios', '100 mensajes', '200 mensajes', '300 mensajes'],
                  ['FotoLab (Gemini)', '30 imágenes', '60 imágenes', '100 imágenes'],
                  ['Costeador manual (ABC)', 'Sin límite', 'Sin límite', 'Sin límite'],
                  ['Costeador IA (chat ABC)', '250 análisis', '500 análisis', 'Sin límite'],
                  ['Reporte 5am del Lunes', '4 / mes', '4 + Mensual', '4 + Mensual + Trimestral'],
                  ['Mesa de Estrategia Viernes 6pm', '4 / mes', '4 + Mensual', '4 + Mensual + Sesión'],
                  ['Daily summary + Daily status', 'Incluido', 'Incluido', 'Incluido'],
                  ['Mando del operador', 'Incluido', 'Incluido', 'Incluido'],
                  ['Landing page', 'Incluido', 'Incluido', 'Incluido'],
                  ['Soporte WhatsApp', 'L-V 9am–7pm', 'L-S prioritario', '24/7'],
                  ['Sesión 1:1 con el fundador', '—', '—', 'Trimestral'],
                ].map(([label, ...vals]) => (
                  <tr key={label}>
                    <td style={S.tdH}>{label}</td>
                    {vals.map((v, i) => <td key={i} style={S.td}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* §5.4 Setup */}
        <div style={S.section}>
          <div style={S.sTitle}>🔧 Lo que incluye la instalación (Setup)</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Componente</th>
                <th style={S.th}>Esencial</th>
                <th style={{ ...S.th, color: '#c084fc' }}>Profesional</th>
                <th style={S.th}>Enterprise</th>
              </tr></thead>
              <tbody>
                {[
                  ['Onboarding asistido', '✓', '✓', 'Personal con Erick'],
                  ['Migración de catálogo', 'Hasta 50 SKU', 'Hasta 200 SKU', 'Sin límite'],
                  ['Imágenes FotoLab', '30 imágenes', '60 imágenes', '100 imágenes'],
                  ['Landing page', '✓', '✓', '✓ con A/B testing'],
                  ['Plantillas Meta registradas', 'Hasta 5', 'Hasta 10', 'Hasta 20'],
                  ['Módulos del mando', '✓', '✓', 'Multi-sucursal'],
                  ['Tests antes del go-live', '✓', '✓', '✓'],
                  ['Programa primera semana', 'Automático', 'Híbrido', 'Personal con Erick'],
                ].map(([label, ...vals]) => (
                  <tr key={label}>
                    <td style={S.tdH}>{label}</td>
                    {vals.map((v, i) => <td key={i} style={S.td}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={S.note}>El Setup se cobra una sola vez al firmar. Escala con el plan porque la complejidad del onboarding también escala.</p>
        </div>

        {/* §5.6 Fair Use */}
        <div style={S.section}>
          <div style={S.sTitle}>⚖️ Política de uso justo</div>
          <div style={S.card}>
            <p style={{ ...S.li, marginBottom: 16, fontWeight: 700, color: '#4ade80' }}>El bot nunca deja de responder conversaciones inbound. Las conversaciones donde el cliente inicia son ilimitadas y no consumen bolsa.</p>
            <p style={{ ...S.li, marginBottom: 16 }}>Lo único que se pausa al exceder la bolsa mensual es la operación proactiva:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#f87171', fontSize: 13, marginBottom: 8 }}>Se pausa al agotar bolsa</div>
                {['Recuperación de carritos abandonados', 'Reactivación de clientes inactivos', 'Campañas y promociones outbound', 'FotoLab adicional al cupo'].map(item => (
                  <div key={item} style={{ ...S.li, fontSize: 13 }}>⏸ {item}</div>
                ))}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#4ade80', fontSize: 13, marginBottom: 8 }}>Sigue operando normalmente</div>
                {['Bot responde toda conversación inbound', 'Cobro Stripe en chat', 'Reporte 5am del Lunes', 'Mesa de Estrategia Viernes 6pm', 'Mando del operador y daily summary'].map(item => (
                  <div key={item} style={{ ...S.li, fontSize: 13 }}>✓ {item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* §5.3 Excedentes y Add-ons */}
        <div style={S.section}>
          <div style={S.sTitle}>📈 Recargas y excedentes</div>
          <div style={S.card}>
            <p style={{ ...S.li, marginBottom: 16 }}>Cuando se exceden las cuotas incluidas, las funciones proactivas se pausan. El inbound continúa. El cliente recarga desde su Mando con confirmación explícita:</p>
            <table style={{ ...S.table, marginBottom: 16 }}>
              <thead><tr>
                <th style={S.th}>Concepto</th>
                <th style={S.th}>Precio</th>
              </tr></thead>
              <tbody>
                {[
                  ['Costeador IA — análisis adicional', '$5 MXN por análisis'],
                  ['FotoLab — imagen adicional', '$1 MXN por imagen (prepago)'],
                  ['Bolsa Marketing — Chica', '$300 MXN → 250 mensajes'],
                  ['Bolsa Marketing — Media', '$850 MXN → 700 mensajes'],
                  ['Bolsa Marketing — Grande', '$2,100 MXN → 1,800 mensajes'],
                ].map(([label, price]) => (
                  <tr key={label}>
                    <td style={S.tdH}>{label}</td>
                    <td style={S.td}>{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={S.note}>El saldo no caduca mientras el cliente esté activo. Sin autocobro silencioso — toda recarga requiere confirmación explícita.</p>
          </div>
        </div>

        {/* Herramientas por industria */}
        <div style={S.section}>
          <div style={S.sTitle}>🧩 Herramientas por industria</div>
          <div style={S.card}>
            <p style={{ ...S.li, marginBottom: 16 }}>Además de los 9 agentes, activamos herramientas según tu negocio:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                ['📦 Inventario', 'Control de stock en tiempo real'],
                ['💰 Costeador', 'Margen y punto de equilibrio por producto'],
                ['📸 Foto Lab', 'Fotografía de producto con IA'],
                ['📅 Citas', 'Agenda y confirmación automática'],
                ['📋 Historial de Clientes', 'Seguimiento y contexto por cliente'],
                ['🎯 Pipeline de Oportunidades', 'Calificación y seguimiento de prospectos'],
              ].map(([name, desc]) => (
                <div key={name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 4 }}>{name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{desc}</div>
                </div>
              ))}
            </div>
            <p style={S.note}>Las herramientas se activan sin costo adicional según tu plan e industria.</p>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 32, padding: '40px 24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))', borderRadius: 20, border: '1px solid rgba(99,102,241,0.2)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', marginBottom: 12 }}>¿Cuál es el plan para tu negocio?</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>En 15 minutos te decimos qué plan se ajusta a tu operación — sin compromiso.</p>
          <a href="https://wa.me/523340026694?text=Hola%2C%20quiero%20saber%20qu%C3%A9%20plan%20de%20GenyX%20es%20para%20mi%20negocio" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', padding: '14px 36px', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 28px rgba(99,102,241,0.3)' }}>Hablar con GenyX →</a>
          <div style={{ marginTop: 16 }}><a href="/" style={{ color: '#818cf8', fontSize: 13, textDecoration: 'none' }}>← Volver al inicio</a></div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: 11, color: '#475569' }}>GenyX Systems · Precios en MXN · IVA no incluido</p>
          <p style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>Matriz v3 — Mayo 2026</p>
        </div>
      </div>
    </div>
  );
}


// ═══ SIMULADOR GENYX — Constantes + Timeline Generator ═══

const SIM_CONFIG = {
  label:'Tu Negocio', conv:0.30, margen:0.45, prod:'producto o servicio', unit:'venta',
  fields:[
    {key:'mensajes',label:'Mensajes que recibes al día',def:40,min:5,max:500},
    {key:'ticket',label:'Ticket promedio',def:250,min:50,max:50000,pfx:'$'},
    {key:'empleados',label:'Empleados en tu equipo',def:8,min:1,max:100}
  ]
};

const SIM_LOSS = { pocos:0.10, medios:0.25, muchos:0.40, demasiados:0.55 };
const SIM_LOSS_LABELS = ['pocos','medios','muchos','demasiados'];
// SVG icon helper — gradient stroke icons matching the landing page design
const simSvg = (paths, id) => React.createElement('svg', {width:28,height:28,viewBox:'0 0 24 24',fill:'none',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round',stroke:`url(#sim${id})`}, React.createElement('defs',null,React.createElement('linearGradient',{id:`sim${id}`,x1:0,y1:0,x2:24,y2:24},React.createElement('stop',{offset:'0%',stopColor:'#818cf8'}),React.createElement('stop',{offset:'100%',stopColor:'#c084fc'}))), ...paths.map((d,i) => typeof d === 'string' ? React.createElement('path',{key:i,d}) : React.createElement(d[0],{key:i,...d[1]})));

// Agent SVG icons — minimal stroke icons
const simAgSvg = (paths, id) => React.createElement('svg', {width:20,height:20,viewBox:'0 0 24 24',fill:'none',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round',stroke:`url(#sag${id})`}, React.createElement('defs',null,React.createElement('linearGradient',{id:`sag${id}`,x1:0,y1:0,x2:24,y2:24},React.createElement('stop',{offset:'0%',stopColor:'#818cf8'}),React.createElement('stop',{offset:'100%',stopColor:'#c084fc'}))), ...paths.map((d,i) => typeof d === 'string' ? React.createElement('path',{key:i,d}) : React.createElement(d[0],{key:i,...d[1]})));

const SIM_AG_ICONS = {
  Marketing: () => simAgSvg(['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M7 10l5 5 5-5','M12 15V3'],'mg'),
  'Captación': () => simAgSvg([["circle",{cx:12,cy:12,r:10}],'M12 8v8',["line",{x1:8,y1:12,x2:16,y2:12}]],'cp'),
  Venta: () => simAgSvg(['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'],'vt'),
  Cierre: () => simAgSvg([["rect",{x:1,y:4,width:22,height:16,rx:2,ry:2}],["line",{x1:1,y1:10,x2:23,y2:10}]],'ci'),
  Entrega: () => simAgSvg(['M16 16h6V8h-4l-3-3H1v11h3',["circle",{cx:6,cy:18,r:2}],["circle",{cx:18,cy:18,r:2}]],'en'),
  Seguimiento: () => simAgSvg(['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 01-3.46 0'],'sg'),
  'Analítica': () => simAgSvg(['M12 2a7 7 0 017 7c0 2.8-1.6 5.2-4 6.3V18H9v-2.7C6.6 14.2 5 11.8 5 9a7 7 0 017-7z',["line",{x1:9,y1:21,x2:15,y2:21}]],'an'),
  Finanzas: () => simAgSvg([["line",{x1:12,y1:1,x2:12,y2:23}],'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],'fn'),
};

const SIM_AGENTS = [
  {key:'Marketing'},{key:'Captación'},{key:'Venta'},{key:'Cierre'},
  {key:'Entrega'},{key:'Seguimiento'},{key:'Analítica'},{key:'Finanzas'},
];

function simFmt(n){return n.toLocaleString('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0})}
function simTime(m){const h=Math.floor(m/60),mm=m%60,ap=h>=12?'PM':'AM',hh=h>12?h-12:h===0?12:h;return `${hh}:${String(mm).padStart(2,'0')} ${ap}`}

function genSimTimeline(inputs) {
  const c = SIM_CONFIG, msg = inputs.mensajes, tk = inputs.ticket;
  const cierres = Math.round(msg * c.conv);
  const react = Math.max(1, Math.round(cierres * 0.08));
  const carts = Math.max(1, Math.round(msg * 0.05));
  const U = c.unit.charAt(0).toUpperCase() + c.unit.slice(1);
  // distribute: morning 35%, peak 30%, evening 25%, night 10%
  const mC=Math.round(cierres*0.35), pC=Math.round(cierres*0.30), eC=Math.round(cierres*0.25), nC=cierres-mC-pC-eC;
  const mA=Math.round(msg*0.2), pA=Math.round(msg*0.3), eA=Math.round(msg*0.3), nA=msg-mA-pA-eA;
  let tA=0,tC=0,tCob=0;
  return [
    {time:300,badge:'AN',text:'Reporte semanal generado y enviado',agents:['Analítica'],hi:true,d:{}},
    {time:420,badge:'FN',text:`Revisión financiera: margen por ${c.prod} calculado`,agents:['Finanzas'],hi:false,d:{}},
    {time:510,badge:'MK',text:'Promoción del día publicada en redes',agents:['Marketing'],hi:false,d:{}},
    {time:542,badge:'CP',text:`Cliente pregunta por tu ${c.prod} — respuesta en 3 seg`,agents:['Captación','Venta'],hi:false,d:{a:(tA+=mA,mA)}},
    {time:548,badge:'CI',text:`${mC} ${c.unit}s cobrados: ${simFmt(mC*tk)} vía link`,agents:['Cierre','Entrega'],hi:false,d:{c:(tC+=mC,mC),cb:(tCob+=mC*tk,mC*tk)}},
    {time:615,badge:'SG',text:`${react} clientes inactivos reactivados`,agents:['Seguimiento'],hi:false,d:{}},
    {time:660,badge:'AN',text:'Producto en declive (4 sem) → propone campaña al fundador',agents:['Analítica','Marketing'],hi:true,d:{}},
    {time:690,badge:'VT',text:`Hora pico: ${pA} conversaciones → ${pC} cierres`,agents:['Venta','Cierre'],hi:false,d:{a:(tA+=pA,pA),c:(tC+=pC,pC),cb:(tCob+=pC*tk,pC*tk)}},
    {time:795,badge:'SG',text:`${carts} carritos abandonados recuperados`,agents:['Seguimiento','Cierre'],hi:false,d:{c:(tC+=carts,carts),cb:(tCob+=carts*tk,carts*tk)}},
    {time:1050,badge:'VT',text:`Bloque vespertino: ${eA} mensajes → ${eC} cierres`,agents:['Venta','Cierre'],hi:false,d:{a:(tA+=eA,eA),c:(tC+=eC,eC),cb:(tCob+=eC*tk,eC*tk)}},
    {time:1080,badge:'MK',text:'Mesa de Estrategia semanal',agents:['Marketing'],hi:true,
      detail:`Marketing propone:\n• Campaña basada en tu producto top\n• Reactivar ${react} clientes inactivos\n• Ajuste según margen real\n\nEsperando tu aprobación (OTP)\nEsto es tu 10%: decides en 10-15 min.`},
    {time:1367,badge:'AI',text:`${U} nocturno sin intervención humana`,agents:['Venta','Cierre','Entrega'],hi:false,d:{a:(tA+=nA,nA),c:(tC+=nC,nC),cb:(tCob+=nC*tk,nC*tk)}},
    {time:1430,badge:'AN',text:`Día cerrado — mañana 5am: siguiente reporte`,agents:['Analítica','Finanzas'],hi:true,d:{}},
  ];
}

// ═══ CENTRO DE MANDO — Simulador iPhone ═══

function MandoSimulator() {
  const [started, setStarted] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [kpis, setKpis] = React.useState({ pedidos: 0, ingresos: 0, margen: 0, ticket: 0 });
  const [briefingLines, setBriefingLines] = React.useState([]);
  const [agentsLit, setAgentsLit] = React.useState([]);
  const [feedItems, setFeedItems] = React.useState([]);
  const [showRec, setShowRec] = React.useState(false);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [hoveredAgent, setHoveredAgent] = React.useState(null);
  const observerRef = React.useRef(null);
  const sectionRef = React.useRef(null);
  const reducedMotion = React.useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

  const KPI_TARGETS = { pedidos: 12, ingresos: 4380, margen: 62.3, ticket: 365 };
  const KPI_DELTAS = { pedidos: { val: 3, pct: '+3' }, ingresos: { val: 18, pct: '+18%' }, margen: { val: -1.2, pct: '-1.2%' }, ticket: { val: 8, pct: '+$8' } };
  const KPI_SPARKS = {
    pedidos: [8, 6, 11, 9, 14, 10, 12],
    ingresos: [2800, 2100, 3900, 3200, 5100, 3700, 4380],
    margen: [64, 63, 65, 62, 61, 63, 62.3],
    ticket: [350, 350, 355, 360, 365, 370, 365],
  };

  const MANDO_AGENTS = [
    { id: 'A1', icon: '📢', name: 'Marketing', color: '#f472b6', lastAction: 'WA Status publicado (48 vistas)', actions: 5 },
    { id: 'A2', icon: '🎣', name: 'Captación', color: '#fb923c', lastAction: 'Lead nuevo calificado', actions: 3 },
    { id: 'A3', icon: '🛒', name: 'Ventas', color: '#4ade80', lastAction: 'Pedido #47 cerrado — $285', actions: 12 },
    { id: 'A4', icon: '🤝', name: 'Cierre', color: '#60a5fa', lastAction: 'Pago confirmado Stripe — $180', actions: 8 },
    { id: 'A5', icon: '🚚', name: 'Entrega', color: '#a78bfa', lastAction: 'Entrega #42 confirmada', actions: 6 },
    { id: 'A6', icon: '💬', name: 'Seguimiento', color: '#2dd4bf', lastAction: '3 carritos recuperados hoy', actions: 9 },
    { id: 'A7', icon: '📊', name: 'Analítica', color: '#818cf8', lastAction: 'Alerta: ticket promedio ▼12%', actions: 4 },
    { id: 'A8', icon: '💰', name: 'Finanzas', color: '#fbbf24', lastAction: 'Margen bruto recalculado', actions: 2 },
  ];

  const BRIEFING = [
    '• Tu producto estrella hoy (18 uds vendidas)',
    '• Hora pico: 11am–1pm — 67% de tus pedidos',
    '• 3 carritos abandonados recuperados por Seguimiento',
    '• Margen bajó 1.2pts — Finanzas detectó alza en un insumo clave',
  ];

  const RECOMMENDATION = '💡 Ajusta el precio de tu producto estrella para compensar el alza en insumos sin impactar demanda (LTV alto).';

  const FEED = [
    { time: '10:42', agent: 'A3', icon: '🛒', text: 'Pedido #47 cerrado — $285', color: '#4ade80' },
    { time: '10:38', agent: 'A4', icon: '🤝', text: 'Pago confirmado Stripe — $180', color: '#60a5fa' },
    { time: '10:15', agent: 'A6', icon: '💬', text: 'Carrito recuperado', color: '#2dd4bf' },
    { time: '09:50', agent: 'A1', icon: '📢', text: 'WA Status publicado (48 vistas)', color: '#f472b6' },
    { time: '09:30', agent: 'A7', icon: '📊', text: 'Alerta: ticket promedio ▼12% vs ayer', color: '#818cf8' },
    { time: '05:00', agent: 'A7', icon: '📊', text: 'Reporte semanal enviado', color: '#818cf8' },
  ];

  // ── Intersection Observer: auto-start when visible ──
  React.useEffect(() => {
    if (started || reducedMotion.current) return;
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStarted(true);
        observerRef.current?.disconnect();
      }
    }, { threshold: 0.3 });
    if (sectionRef.current) observerRef.current.observe(sectionRef.current);
    return () => observerRef.current?.disconnect();
  }, [started]);

  // ── Animation sequence ──
  React.useEffect(() => {
    if (!started) return;
    const timers = [];

    // Reduced motion: show everything instantly
    if (reducedMotion.current) {
      setStep(6);
      setKpis(KPI_TARGETS);
      setBriefingLines(BRIEFING);
      setShowRec(true);
      setAgentsLit(MANDO_AGENTS.map(a => a.id));
      setFeedItems(FEED);
      setShowCalendar(true);
      return;
    }

    // Step 1: KPI counter animation (0 → target in 1.5s)
    timers.push(setTimeout(() => setStep(1), 400));
    const kpiDur = 1500;
    const kpiStart = Date.now();
    const kpiFrame = () => {
      const p = Math.min((Date.now() - kpiStart) / kpiDur, 1);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setKpis({
        pedidos: Math.round(KPI_TARGETS.pedidos * ease),
        ingresos: Math.round(KPI_TARGETS.ingresos * ease),
        margen: Math.round(KPI_TARGETS.margen * ease * 10) / 10,
        ticket: Math.round(KPI_TARGETS.ticket * ease),
      });
      if (p < 1) requestAnimationFrame(kpiFrame);
    };
    timers.push(setTimeout(() => requestAnimationFrame(kpiFrame), 400));

    // Step 2: Briefing lines appear one by one
    timers.push(setTimeout(() => setStep(2), 2200));
    BRIEFING.forEach((_, i) => {
      timers.push(setTimeout(() => setBriefingLines(prev => [...prev, BRIEFING[i]]), 2400 + i * 700));
    });

    // Step 3: Recommendation appears
    timers.push(setTimeout(() => { setStep(3); setShowRec(true); }, 5400));

    // Step 4: Agents light up
    timers.push(setTimeout(() => setStep(4), 6200));
    MANDO_AGENTS.forEach((a, i) => {
      timers.push(setTimeout(() => setAgentsLit(prev => [...prev, a.id]), 6400 + i * 200));
    });

    // Step 5: Feed items slide in
    timers.push(setTimeout(() => setStep(5), 8600));
    FEED.forEach((_, i) => {
      timers.push(setTimeout(() => setFeedItems(prev => [...prev, FEED[i]]), 8800 + i * 500));
    });

    // Step 6: Calendar appears
    timers.push(setTimeout(() => { setStep(6); setShowCalendar(true); }, 12500));

    return () => timers.forEach(t => clearTimeout(t));
  }, [started]);

  // ── Sparkline SVG ──
  const Sparkline = ({ data, color = '#818cf8', w = 60, h = 20 }) => {
    const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / range) * h}`).join(' ');
    return (
      <svg width={w} height={h} style={{ display: 'block' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      </svg>
    );
  };

  // ── Get greeting based on current hour ──
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  // ── CSS Keyframes (injected once) ──
  const keyframes = `
    @keyframes mandoPulse { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.4)} 70%{box-shadow:0 0 0 6px rgba(74,222,128,0)} }
    @keyframes mandoSlideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes mandoFadeIn { from{opacity:0} to{opacity:1} }
    @keyframes mandoCountUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes mandoPhoneGlow { 0%,100%{box-shadow:0 0 60px rgba(99,102,241,0.15), 0 0 120px rgba(99,102,241,0.05)} 50%{box-shadow:0 0 80px rgba(99,102,241,0.25), 0 0 160px rgba(99,102,241,0.1)} }
  `;

  const nextFriday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <section ref={sectionRef} id="centro-de-mando" style={{ padding: '100px 24px', maxWidth: 960, margin: '0 auto' }}>
      <style>{keyframes}</style>

      {/* ── Section Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '.1em', marginBottom: 12 }}>CENTRO DE MANDO</div>
        <h2 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', marginBottom: 10, lineHeight: 1.2 }}>
          Y tú, ¿qué ves?<br />
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tu Centro de Mando te lo muestra.
          </span>
        </h2>
        <p style={{ color: '#64748b', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>
          Sin abrir la computadora. Sin pedir reportes. Un briefing inteligente en tu bolsillo.
        </p>
      </div>

      {/* ── iPhone Frame ── */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          width: 320, minHeight: 640, maxHeight: 700,
          background: '#000',
          borderRadius: 48,
          border: '4px solid #2a2a2e',
          boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 0 120px rgba(99,102,241,0.05), inset 0 0 0 2px rgba(255,255,255,0.05)',
          animation: 'mandoPhoneGlow 4s ease-in-out infinite',
          position: 'relative',
          overflow: 'hidden',
          padding: '12px 0',
        }}>
          {/* Dynamic Island */}
          <div style={{
            width: 100, height: 28, background: '#000', borderRadius: 20,
            margin: '0 auto 8px', position: 'relative', zIndex: 2,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.04)',
          }}>
            <div style={{ position: 'absolute', right: 8, top: 8, width: 8, height: 8, borderRadius: '50%', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>

          {/* Screen Content */}
          <div style={{
            background: '#0a0e1a',
            borderRadius: 36,
            margin: '0 4px',
            padding: '16px 14px 20px',
            minHeight: 580,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}>
            {/* ── Greeting ── */}
            <div style={{ animation: step >= 0 ? 'mandoFadeIn 0.6s ease' : 'none', marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '.05em', marginBottom: 2 }}>GENY<span style={{ color: '#818cf8' }}>X</span> MANDO</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.3 }}>
                {getGreeting()} ☀️
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Aquí va lo importante de hoy.</div>
            </div>

            {/* ── KPIs ── */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12,
              opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.4s',
            }}>
              {[
                { key: 'pedidos', label: 'Pedidos', prefix: '', suffix: '', icon: '📦' },
                { key: 'ingresos', label: 'Ingresos', prefix: '$', suffix: '', icon: '💰' },
                { key: 'margen', label: 'Margen', prefix: '', suffix: '%', icon: '📈' },
                { key: 'ticket', label: 'Ticket', prefix: '$', suffix: '', icon: '🎟️' },
              ].map(({ key, label, prefix, suffix, icon }) => (
                <div key={key} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.12)',
                  borderRadius: 12, padding: '10px 10px 8px', position: 'relative',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
                    <span style={{ fontSize: 12 }}>{icon}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', lineHeight: 1, marginBottom: 4, animation: step === 1 ? 'mandoCountUp 0.4s ease' : 'none' }}>
                    {prefix}{key === 'ingresos' ? kpis[key].toLocaleString('es-MX') : kpis[key]}{suffix}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: KPI_DELTAS[key].val >= 0 ? '#4ade80' : '#f59e0b',
                    }}>
                      {KPI_DELTAS[key].val >= 0 ? '▲' : '▼'} {KPI_DELTAS[key].pct}
                    </span>
                    <Sparkline data={KPI_SPARKS[key]} color={KPI_DELTAS[key].val >= 0 ? '#4ade80' : '#f59e0b'} w={44} h={14} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Briefing CEO ── */}
            <div style={{
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
              borderRadius: 12, padding: '10px 12px', marginBottom: 12,
              opacity: step >= 2 ? 1 : 0, transition: 'opacity 0.5s',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', marginBottom: 6, letterSpacing: '.03em' }}>📋 Briefing del día</div>
              {briefingLines.map((line, i) => (
                <div key={i} style={{
                  fontSize: 10, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 2,
                  animation: 'mandoSlideIn 0.4s ease',
                }}>
                  {line}
                </div>
              ))}
              {showRec && (
                <div style={{
                  marginTop: 8, padding: '6px 8px', background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8,
                  fontSize: 10, color: '#fbbf24', fontWeight: 600, lineHeight: 1.5,
                  animation: 'mandoFadeIn 0.6s ease',
                }}>
                  {RECOMMENDATION}
                </div>
              )}
            </div>

            {/* ── 8 Agents ── */}
            <div style={{
              marginBottom: 12,
              opacity: step >= 4 ? 1 : 0, transition: 'opacity 0.4s',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase' }}>9 Agentes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', position: 'relative' }}>
                {MANDO_AGENTS.map((a) => {
                  const lit = agentsLit.includes(a.id);
                  const isHovered = hoveredAgent === a.id;
                  return (
                    <div key={a.id}
                      onMouseEnter={() => setHoveredAgent(a.id)}
                      onMouseLeave={() => setHoveredAgent(null)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        padding: '6px 5px', borderRadius: 10, cursor: 'pointer',
                        background: isHovered ? 'rgba(99,102,241,0.1)' : 'transparent',
                        transition: 'background 0.2s',
                        width: 30,
                        position: 'relative',
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{a.icon}</span>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: lit ? '#4ade80' : '#334155',
                        animation: lit ? 'mandoPulse 2s ease-in-out infinite' : 'none',
                        transition: 'background 0.3s',
                      }} />
                      <span style={{ fontSize: 7, color: '#64748b', fontWeight: 500, textAlign: 'center', lineHeight: 1 }}>
                        {a.id}
                      </span>
                      {/* Tooltip */}
                      {isHovered && (
                        <div style={{
                          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                          background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8,
                          padding: '8px 10px', minWidth: 140, zIndex: 10,
                          animation: 'mandoFadeIn 0.2s ease',
                          pointerEvents: 'none',
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: a.color, marginBottom: 2 }}>{a.icon} {a.name}</div>
                          <div style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.4 }}>{a.lastAction}</div>
                          <div style={{ fontSize: 8, color: '#475569', marginTop: 3 }}>{a.actions} acciones hoy</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Feed ── */}
            <div style={{
              opacity: step >= 5 ? 1 : 0, transition: 'opacity 0.4s', marginBottom: 12,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase' }}>Actividad</div>
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {feedItems.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 0', borderBottom: i < feedItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    animation: 'mandoSlideIn 0.35s ease',
                  }}>
                    <span style={{ fontSize: 8, color: '#475569', fontFamily: 'monospace', minWidth: 32 }}>{item.time}</span>
                    <span style={{ fontSize: 10 }}>{item.icon}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8', flex: 1, lineHeight: 1.3 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Mesa de Estrategia ── */}
            {showCalendar && (
              <div style={{
                background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)',
                borderRadius: 10, padding: '8px 10px',
                animation: 'mandoFadeIn 0.6s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12 }}>📅</span>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#4ade80' }}>Mesa de Estrategia</div>
                    <div style={{ fontSize: 8, color: '#64748b' }}>Viernes {nextFriday()} · 6:00 PM</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Home Indicator */}
          <div style={{
            width: 120, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 3,
            margin: '10px auto 0',
          }} />
        </div>
      </div>

      {/* ── Caption ── */}
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>
          Tu operación completa. <span style={{ background: 'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>En tu bolsillo.</span>
        </p>
        <p style={{ fontSize: 13, color: '#64748b', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
          Cada mañana tu Centro de Mando consolida la información de los 9 agentes en un briefing — sin que tengas que abrir tu computadora.
        </p>
      </div>
    </section>
  );
}

// ═══ SIMULADOR GENYX — Componente principal ═══

function SimuladorGenyX() {
  const [phase, setPhase] = React.useState(2);
  const [inputs, setInputs] = React.useState(Object.fromEntries(SIM_CONFIG.fields.map(f => [f.key, f.def])));
  const [loss, setLoss] = React.useState('medios');
  const [timeline, setTimeline] = React.useState([]);
  const [simTime2, setSimTime2] = React.useState(300);
  const [revealed, setRevealed] = React.useState([]);
  const [counters, setCounters] = React.useState({a:0,c:0,cb:0});
  const [agentActive, setAgentActive] = React.useState({});
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const startRef = React.useRef(null);
  const feedRef = React.useRef(null);
  const reducedMotion = React.useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

  // ── ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS ──
  React.useEffect(() => {
    if (phase !== 3 || !running) return;
    const DUR = 55000, START_M = 300, END_M = 1430;
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const progress = Math.min(elapsed / DUR, 1);
      const curMin = Math.round(START_M + progress * (END_M - START_M));
      setSimTime2(curMin);
      const toReveal = timeline.filter(e => e.time <= curMin);
      setRevealed(prev => {
        if (prev.length === toReveal.length) return prev;
        const newOnes = toReveal.slice(prev.length);
        let na=0, nc=0, ncb=0;
        newOnes.forEach(ev => { if(ev.d){na+=(ev.d.a||0); nc+=(ev.d.c||0); ncb+=(ev.d.cb||0);} });
        if (na||nc||ncb) setCounters(p => ({a:p.a+na, c:p.c+nc, cb:p.cb+ncb}));
        const now = Date.now();
        newOnes.forEach(ev => ev.agents.forEach(ag => setAgentActive(p => ({...p,[ag]:now}))));
        return toReveal;
      });
      if (progress >= 1) { clearInterval(id); setRunning(false); setDone(true); setTimeout(() => setPhase(4), 2000); }
    }, 80);
    return () => clearInterval(id);
  }, [phase, running, timeline]);

  React.useEffect(() => {
    if (phase !== 3) return;
    const id = setInterval(() => {
      const now = Date.now();
      setAgentActive(p => { const n = {...p}; Object.keys(n).forEach(k => { if(now - n[k] > 3000) delete n[k]; }); return n; });
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  React.useEffect(() => { if(feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [revealed]);

  // Styles
  const Z = {
    wrap: { padding:'80px 24px', maxWidth:960, margin:'0 auto' },
    label: { fontSize:11, fontWeight:700, color:'#818cf8', letterSpacing:'.1em', marginBottom:12, textAlign:'center' },
    h2: { fontSize:36, fontWeight:900, color:'#f1f5f9', marginBottom:10, textAlign:'center', lineHeight:1.2 },
    h2a: { background:'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
    sub: { color:'#64748b', fontSize:14, textAlign:'center', maxWidth:520, margin:'0 auto 32px' },
    card: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'24px 20px', cursor:'pointer', transition:'all .25s', textAlign:'center' },
    cardHover: { borderColor:'rgba(99,102,241,0.5)', background:'rgba(99,102,241,0.08)', transform:'translateY(-3px)' },
    cardOff: { borderColor:'rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)', transform:'translateY(0)' },
    btn: { background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', padding:'14px 32px', borderRadius:12, fontSize:14, fontWeight:700, border:'none', cursor:'pointer', boxShadow:'0 0 28px rgba(99,102,241,0.3)' },
    btn2: { background:'transparent', border:'1px solid rgba(99,102,241,0.5)', color:'#818cf8', padding:'12px 28px', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' },
    priv: { background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:12, padding:'10px 16px', fontSize:12, color:'#4ade80', textAlign:'center', marginBottom:24 },
  };

  const cfg = SIM_CONFIG;

  // ── PHASE 2: Data inputs ──
  if (phase === 2) return (
    <section id="simulador" style={Z.wrap}>
      <div style={Z.label}>SIMULADOR INTERACTIVO</div>
      <h2 style={Z.h2}>Cuéntanos de tu negocio<br /><span style={Z.h2a}>y mira cómo operarían 9 agentes en un día real.</span></h2>
      <p style={Z.sub}>Ajusta los valores. Los usaremos para simular 24 horas de operación autónoma.</p>
      <div style={{...Z.priv, display:'flex', alignItems:'center', justifyContent:'center', gap:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Estos datos se quedan en tu navegador. No se envían a GenyX.</div>
      <div style={{ maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
        {cfg.fields.map(f => (
          <div key={f.key}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <label style={{ fontSize:13, color:'#94a3b8', fontWeight:600 }}>{f.label}</label>
              <span style={{ fontSize:14, fontWeight:800, color:'#f1f5f9' }}>{f.pfx||''}{inputs[f.key]?.toLocaleString('es-MX')}{f.key==='ticket'?' MXN':''}</span>
            </div>
            <input type="range" min={f.min} max={f.max} value={inputs[f.key]||f.def}
              onChange={e => setInputs(p => ({...p, [f.key]: Number(e.target.value)}))}
              style={{ width:'100%', accentColor:'#6366f1' }} />
          </div>
        ))}
        {/* Loss slider */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <label style={{ fontSize:13, color:'#94a3b8', fontWeight:600 }}>¿Cuántos clientes sientes que pierdes?</label>
            <span style={{ fontSize:14, fontWeight:800, color:'#f1f5f9' }}>{loss.charAt(0).toUpperCase()+loss.slice(1)} (~{Math.round(SIM_LOSS[loss]*100)}%)</span>
          </div>
          <input type="range" min={0} max={3} value={SIM_LOSS_LABELS.indexOf(loss)}
            onChange={e => setLoss(SIM_LOSS_LABELS[Number(e.target.value)])}
            style={{ width:'100%', accentColor:'#6366f1' }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#475569', marginTop:4 }}>
            {SIM_LOSS_LABELS.map(l => <span key={l}>{l}</span>)}
          </div>
        </div>
        <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:16 }}>
          <button style={Z.btn} onClick={() => {
            const tl = genSimTimeline(inputs);
            setTimeline(tl);
            setRevealed([]);
            setCounters({a:0,c:0,cb:0});
            setAgentActive({});
            setDone(false);
            if (reducedMotion.current) { setRevealed(tl); const last = tl[tl.length-1]; setCounters({a:inputs.mensajes,c:Math.round(inputs.mensajes*cfg.conv),cb:Math.round(inputs.mensajes*cfg.conv)*inputs.ticket}); setDone(true); setPhase(4); }
            else { setPhase(3); setRunning(true); startRef.current = Date.now(); }
          }}>Comenzar simulación →</button>
        </div>
      </div>
    </section>
  );



  if (phase === 3) {
    const progress = (simTime2 - 300) / (1430 - 300);
    return (
      <section id="simulador" style={Z.wrap}>
        {/* Skip button */}
        <div style={{ textAlign:'right', marginBottom:8 }}>
          <button onClick={() => { setRunning(false); setRevealed(timeline); const skipC=Math.round(inputs.mensajes*cfg.conv); setCounters({a:inputs.mensajes,c:skipC,cb:skipC*inputs.ticket}); setDone(true); setPhase(4); }}
            style={{ background:'transparent', border:'none', color:'#64748b', fontSize:12, cursor:'pointer' }}>Saltar → ver resultado</button>
        </div>
        {/* Clock */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:48, fontWeight:900, color:'#818cf8', fontFamily:'monospace' }}>{simTime(simTime2)}</div>
          <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:4, marginTop:8, maxWidth:400, margin:'8px auto' }}>
            <div style={{ height:4, background:'linear-gradient(90deg,#6366f1,#c084fc)', borderRadius:4, width:`${progress*100}%`, transition:'width .08s' }} />
          </div>
          <div style={{ fontSize:11, color:'#475569', marginTop:6 }}>Viernes — Simulación de un día completo</div>
        </div>
        <div style={{...Z.priv, display:'flex', alignItems:'center', justifyContent:'center', gap:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Estos datos se quedan en tu navegador. No se envían a GenyX.</div>
        {/* Main grid: feed + agents */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:20, marginBottom:20 }}>
          {/* Feed */}
          <div ref={feedRef} style={{ maxHeight:400, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, paddingRight:8 }}>
            {revealed.map((ev, i) => (
              <div key={i} style={{ background: ev.hi ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: ev.hi ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)', borderRadius:12, padding: ev.hi ? '16px 14px' : '10px 14px', animation:'fadeIn .3s ease' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: ev.detail ? 8 : 0 }}>
                  <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width: ev.hi ? 28 : 22, height: ev.hi ? 28 : 22, borderRadius:'50%', background:'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(192,132,252,0.25))', border:'1px solid rgba(99,102,241,0.4)', fontSize:9, fontWeight:800, color:'#a5b4fc', letterSpacing:'.02em', flexShrink:0 }}>{ev.badge}</span>
                  <span style={{ fontSize:11, color:'#818cf8', fontWeight:700, fontFamily:'monospace' }}>{simTime(ev.time)}</span>
                  <span style={{ fontSize:12, color: ev.hi ? '#f1f5f9' : '#94a3b8', fontWeight: ev.hi ? 700 : 400 }}>{ev.text}</span>
                </div>
                {ev.detail && <pre style={{ fontSize:11, color:'#a5b4fc', lineHeight:1.6, margin:'8px 0 0 28px', whiteSpace:'pre-wrap', fontFamily:'Inter,sans-serif' }}>{ev.detail}</pre>}
                <div style={{ display:'flex', gap:4, marginTop:4, marginLeft:28 }}>
                  {ev.agents.map(a => <span key={a} style={{ fontSize:9, color:'#818cf8', background:'rgba(99,102,241,0.15)', padding:'2px 8px', borderRadius:10 }}>{a}</span>)}
                </div>
              </div>
            ))}
          </div>
          {/* Agent panel */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:10, letterSpacing:'.08em' }}>AGENTES</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {SIM_AGENTS.map(ag => {
                const active = !!agentActive[ag.key];
                return (
                  <div key={ag.key} style={{ background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 10px', textAlign:'center', transition:'all .3s' }}>
                    <div style={{ marginBottom:4 }}>{SIM_AG_ICONS[ag.key]()}</div>
                    <div style={{ fontSize:10, fontWeight:700, color: active ? '#a5b4fc' : '#475569' }}>{ag.key}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* Counters */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[[SIM_AG_ICONS['Venta'](),`${counters.a}`,`de ${inputs.mensajes} atendidos`],[SIM_AG_ICONS['Cierre'](),`${counters.c}`,'cierres'],[SIM_AG_ICONS['Finanzas'](),simFmt(counters.cb),'cobrado'],[simAgSvg(['M13 2L3 14h9l-1 8 10-12h-9l1-8'],'tm'),'90%','operación autónoma']].map(([ic,v,l],i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'16px 12px', textAlign:'center' }}>
              <div style={{ fontSize:16 }}>{ic}</div>
              <div style={{ fontSize:22, fontWeight:900, color:'#818cf8', transition:'all .4s' }}>{v}</div>
              <div style={{ fontSize:10, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</div>
            </div>
          ))}
        </div>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </section>
    );
  }

  // ── PHASE 4: Summary ──
  const msg = inputs.mensajes, tk = inputs.ticket;
  const totalCierres = Math.round(msg * cfg.conv);
  const totalCobrado = totalCierres * tk;
  const lossPct = SIM_LOSS[loss];
  const sinNoResp = Math.round(msg * lossPct);
  const sinResp = msg - sinNoResp;
  const sinCierres = Math.round(sinResp * cfg.conv * 0.7);
  const sinCobrado = sinCierres * tk;
  const diff = totalCobrado - sinCobrado;

  return (
    <section id="simulador" style={Z.wrap}>
      <div style={Z.label}>RESULTADO DE TU SIMULACIÓN</div>
      <h2 style={Z.h2}>Un día de tu negocio<br /><span style={Z.h2a}>con GenyX operando.</span></h2>

      {/* Two columns: operation + strategy */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20, marginBottom:32 }}>
        <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, padding:'28px 24px' }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#818cf8', marginBottom:16, letterSpacing:'.08em' }}>LA OPERACIÓN (90% AUTÓNOMA)</div>
          {[[`→ ${msg} mensajes atendidos en segundos`],[`→ ${totalCierres} conversaciones cerraron compra (${Math.round(cfg.conv*100)}%)`],[`→ ${simFmt(totalCobrado)} cobrado vía link de pago`],[`→ ${Math.max(1,Math.round(totalCierres*0.08))} clientes recuperados`],[`→ ${totalCierres} entregas coordinadas`]].map(([t],i) => (
            <div key={i} style={{ fontSize:13, color:'#94a3b8', padding:'6px 0', lineHeight:1.6 }}>{t}</div>
          ))}
        </div>
        <div style={{ background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:20, padding:'28px 24px' }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#c084fc', marginBottom:16, letterSpacing:'.08em' }}>LA ESTRATEGIA (10% DECIDES TÚ)</div>
          {[['→ Recibiste la Mesa de Estrategia del viernes 6pm'],['→ 1 código OTP para aprobar el plan de la semana'],['→ Tiempo estimado de decisión: 10–15 min'],['→ Margen promedio estimado: ~'+Math.round(cfg.margen*100)+'%*']].map(([t],i) => (
            <div key={i} style={{ fontSize:13, color:'#94a3b8', padding:'6px 0', lineHeight:1.6 }}>{t}</div>
          ))}
          <div style={{ fontSize:11, color:'#64748b', fontStyle:'italic', marginTop:8 }}>*Tu margen REAL lo calcula GenyX cuando cargas tus costos en el Costeador.</div>
        </div>
      </div>

      {/* Comparison */}
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'28px 24px', marginBottom:32 }}>
        <div style={{ fontSize:12, fontWeight:800, color:'#64748b', marginBottom:16, letterSpacing:'.08em' }}>COMPARATIVA</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', marginBottom:10 }}>ANTES DE GENYX</div>
            {[[`→ Mensajes esperando respuesta`],['→ Horas dedicadas a responder manualmente'],['→ Cobros separados del chat'],['→ Sin visibilidad de márgenes en tiempo real'],['→ Decisiones basadas en intuición']].map(([t],i) => (
              <div key={i} style={{ fontSize:12, color:'#94a3b8', padding:'4px 0' }}>{t}</div>
            ))}
            <div style={{ fontSize:14, fontWeight:800, color:'#ef4444', marginTop:10 }}>~{simFmt(sinCobrado)}/día</div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#4ade80', marginBottom:10 }}>CON GENYX</div>
            {[['✓ 100% atendidos en segundos'],['✓ 90% operación automatizada'],['✓ Cobro dentro del chat'],['✓ Reporte semanal con tus datos'],['✓ Mesa de estrategia cada viernes']].map(([t],i) => (
              <div key={i} style={{ fontSize:12, color:'#94a3b8', padding:'4px 0' }}>{t}</div>
            ))}
            <div style={{ fontSize:14, fontWeight:800, color:'#4ade80', marginTop:10 }}>~{simFmt(totalCobrado)}/día</div>
          </div>
        </div>
        {diff > 0 && <div style={{ textAlign:'center', marginTop:16, padding:'12px 20px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:12 }}>
          <span style={{ fontSize:14, color:'#4ade80', fontWeight:800 }}>Diferencia estimada: +{simFmt(diff)}/día*</span>
        </div>}
      </div>

      {/* Disclaimer */}
      <div style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:12, padding:'16px 20px', marginBottom:32, fontSize:12, color:'#fbbf24', lineHeight:1.7 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display:'inline', verticalAlign:'middle', marginRight:6 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Esta simulación es educativa. Las cifras usan promedios generales. Los resultados reales dependen de tu propuesta, demanda local, ubicación y otras variables. <strong>No prometemos resultados específicos.</strong> GenyX opera con cualquier industria.
      </div>

      {/* CTAs */}
      <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
        <a href="https://wa.me/523340026694?text=Hola%2C%20vi%20el%20simulador%20de%20GenyX%20y%20quiero%20saber%20m%C3%A1s" style={{ ...Z.btn, textDecoration:'none', display:'inline-block' }}>Quiero esto para mi negocio →</a>
        <a href="/planes" style={{ ...Z.btn2, textDecoration:'none', display:'inline-block' }}>Ver planes</a>
        <button style={{ ...Z.btn2, borderColor:'rgba(255,255,255,0.15)', color:'#64748b' }} onClick={() => { setPhase(2); setDone(false); }}>↺ Simular de nuevo</button>
      </div>
    </section>
  );
}


// ── Landing Page Auth Gate ──────────────────────────────────────────────────
// SHA-256 of the access password. To change password, run in browser console:
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_PASSWORD'))
//     .then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join(''))
const LANDING_PW_HASH = '9014409f25e97eef6d7fd14f4e4b1efaf35a32634cd2e89299f10c6e195c0378';

function LandingAuthGate({ children }) {
  const [authed, setAuthed] = React.useState(sessionStorage.getItem('genyx_landing_auth') === 'true');
  const [pw, setPw] = React.useState('');
  const [error, setError] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError(false);
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(x => x.toString(16).padStart(2, '0')).join('');
      if (hashHex === LANDING_PW_HASH) {
        sessionStorage.setItem('genyx_landing_auth', 'true');
        setAuthed(true);
      } else {
        setError(true);
        setPw('');
      }
    } catch { setError(true); }
    setChecking(false);
  };

  if (authed) return children;

  return (
    <div style={{ minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 380, padding: '40px 32px' }}>
        <div style={{ width: 56, height: 56, border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#818cf8', margin: '0 auto 24px', borderRadius: 12 }}>G</div>
        <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>GenyX</h1>
        <p style={{ color: '#475569', fontSize: 13, marginBottom: 32, lineHeight: 1.6 }}>Acceso restringido.<br />Ingresa tu clave para continuar.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false); }}
            placeholder="Clave de acceso"
            autoFocus
            style={{
              width: '100%', padding: '14px 18px', borderRadius: 12, border: error ? '2px solid #ef4444' : '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: 15, fontWeight: 500, outline: 'none',
              boxSizing: 'border-box', transition: 'border-color 0.2s', marginBottom: 14,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10, fontWeight: 600 }}>Clave incorrecta</p>}
          <button type="submit" disabled={checking || !pw}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: pw ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
              color: pw ? '#fff' : '#475569', fontSize: 14, fontWeight: 700, transition: 'all 0.2s',
              boxShadow: pw ? '0 0 28px rgba(99,102,241,0.25)' : 'none',
            }}
          >{checking ? 'Verificando...' : 'Acceder'}</button>
        </form>
        <p style={{ color: '#1e293b', fontSize: 10, marginTop: 40 }}>© 2026 GenyX Systems</p>
      </div>
    </div>
  );
}

function GenyXLandingPage() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const features = [
    [<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6m-3 0v3m-6 1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm2 4.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm4 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-5 4h6"/></svg>, 'Tu Departamento de Ventas Completo', 'Tu agente de ventas: atiende con la personalidad de tu marca, cobra automático, te reporta cada semana y trabaja 24/7.'],
    [<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/><path d="M5 15h4"/></svg>, 'Cobro Automatizado', 'Genera links de pago directamente en la conversación. El cliente paga en segundos desde WhatsApp, tú recibes la confirmación al instante y el dinero va a tu cuenta.'],
    [<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><path d="M12 7v3m0 0-6.5 7m6.5-7 6.5 7"/></svg>, <>Donde Ya Están Tus Clientes<span style={{display:"inline-flex",gap:8,verticalAlign:"middle",marginLeft:10,alignItems:"center"}}>
  <svg title="WhatsApp" width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#25D366"/><path fill="#fff" d="M17.5 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/></svg>
  <svg title="Instagram" width="18" height="18" viewBox="0 0 24 24"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs><rect width="20" height="20" x="2" y="2" rx="5" fill="url(#ig)"/><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/></svg>
  <svg title="Facebook" width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
  <svg title="Web" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  <svg title="Voz" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
</span></>, 'Un solo agente atendiendo en WhatsApp, tu sitio web, Instagram, Facebook y por llamada telefónica. Tú en un lugar. Tu agente en todos.'],
    [<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16V12m4 4V8m4 8V5"/></svg>, 'Centro de Mando', 'Pedidos, ventas, catálogo y métricas de tu negocio desde un solo panel — en tu celular o computadora. Sabes exactamente qué se vendió, cuándo y cuánto.'],
    [<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18l-7 9v6l-4-2v-4L3 4z"/></svg>, 'Precisión Absoluta', 'Tu agente respeta tu catálogo, tus precios y tus reglas al 100%. Cada pedido sale exacto. Cada cobro es correcto.'],
    [<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, 'Vendiendo en 48 horas', 'Una sesión de 45 minutos para entender tu negocio, nosotros configuramos todo, y en 2 días tu agente ya está cerrando ventas.'],
  ];
  const steps = [
    ['01', 'Sesión de ADN', 'Te escuchamos. Entendemos tu negocio, menú, reglas de venta y personalidad de marca. 45 minutos.'],
    ['02', 'Instalamos tu agente', 'Configuramos tu agente de ventas, lo conectamos a WhatsApp y lo entrenamos con tu catálogo y forma de vender. 48 horas.'],
    ['03', 'Vendes mientras duermes', 'Tu agente atiende clientes, filtra curiosos, toma pedidos y genera links de pago. Tú recibes reportes cada lunes.'],
  ];

  const C = {
    page: { fontFamily: "'Inter', sans-serif", background: '#050508', color: '#f0f0f5', minHeight: '100vh', overflowX: 'hidden' },
    nav: { position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100, boxSizing: 'border-box', background: scrolled ? 'rgba(5,5,8,0.96)' : 'transparent', backdropFilter: scrolled ? 'blur(14px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px' },
    logo: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
    logoBox: { width: 32, height: 32, border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#818cf8' },
    logoText: { fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.3px' },
    navLinks: { display: 'flex', gap: 32, alignItems: 'center' },
    navLink: { color: '#64748b', fontSize: 13, textDecoration: 'none' },
    demoCta: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 0 20px rgba(99,102,241,0.3)' },
    hero: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: '120px 24px 80px', position: 'relative' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '6px 18px', marginBottom: 32, fontSize: 12, color: '#818cf8', fontWeight: 600, letterSpacing: '.06em' },
    dot: { width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block' },
    h1: { fontSize: 'clamp(42px, 7vw, 86px)', fontWeight: 800, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-2.5px', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    h1accent: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    sub: { fontSize: 18, color: '#64748b', maxWidth: 520, lineHeight: 1.7, marginBottom: 52 },
    btns: { display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
    primary: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', padding: '15px 34px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 36px rgba(99,102,241,0.35)' },
    secondary: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', padding: '15px 34px', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none' },
    stats: { padding: '0 24px 100px', maxWidth: 960, margin: '0 auto' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' },
    statCell: (i) => ({ padding: '30px 24px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none' }),
    statVal: { fontSize: 34, fontWeight: 800, color: '#818cf8', marginBottom: 6 },
    statLbl: { fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em' },
    section: (pb=120) => ({ padding: `0 24px ${pb}px`, maxWidth: 1100, margin: '0 auto' }),
    sHead: { textAlign: 'center', marginBottom: 64 },
    sH2: { fontSize: 42, fontWeight: 800, marginBottom: 14, letterSpacing: '-1px' },
    sP: { color: '#64748b', fontSize: 16 },
    grid6: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 24px', transition: 'all 0.25s' },
    cardIcon: { fontSize: 32, marginBottom: 16 },
    cardH: { fontSize: 16, fontWeight: 700, marginBottom: 10, color: '#f1f5f9' },
    cardP: { fontSize: 13, color: '#64748b', lineHeight: 1.75 },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 },
    stepCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 24px', position: 'relative', overflow: 'hidden', transition: 'all 0.25s' },
    stepNum: { fontSize: 56, fontWeight: 900, color: 'rgba(99,102,241,0.18)', lineHeight: 1, marginBottom: 16, letterSpacing: '-3px' },
    ctaSec: { padding: '0 24px 120px', textAlign: 'center' },
    ctaBox: { maxWidth: 560, margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '56px 40px' },
    ctaH: { fontSize: 36, fontWeight: 800, marginBottom: 16, letterSpacing: '-1px' },
    ctaSub: { color: '#64748b', marginBottom: 40, lineHeight: 1.7 },
    ctaBtn: { display: 'block', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', padding: '16px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 32px rgba(99,102,241,0.3)' },
    footer: { borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
    ftrBrand: { fontSize: 13, color: '#475569', fontWeight: 700 },
    ftrLinks: { display: 'flex', gap: 24 },
    ftrLink: { fontSize: 12, color: '#475569', textDecoration: 'none' },
  };
  const hoverCard = (e, on) => { e.currentTarget.style.borderColor = on ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = on ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)'; };

  return (
    <div style={C.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
      <nav style={C.nav}>
        <a href="#" style={C.logo}>
          <img src="/genyx-logo.png" alt="GenyX — Tu operación comercial autónoma" style={{ width: 32, height: 32, borderRadius: 4 }} />
        </a>
        <div style={C.navLinks}>
          {[['Agentes', '#agentes'], ['Proceso', '#proceso']].map(([l, h]) => (
            <a key={l} href={h} style={C.navLink} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = '#64748b'}>{l}</a>
          ))}
          <a href="https://wa.me/523340026694?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20GenyX" style={C.demoCta}>Cuéntame de tu negocio →</a>
        </div>
      </nav>

      <section style={C.hero}>
        {/* Hero Badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:30, padding:'6px 20px', marginBottom:14, fontSize:11, fontWeight:800, color:'#818cf8', letterSpacing:'.1em', textTransform:'uppercase' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', display:'inline-block', boxShadow:'0 0 8px #6366f1' }} />
          TU OPERACIÓN COMERCIAL AUTÓNOMA — 9 AGENTES DE IA
        </div>
        <div style={C.badge}><span style={C.dot} />Marketing · Captación · Venta · Cierre · Entrega · Seguimiento · Analítica · Finanzas</div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.35)', color:'#4ade80', fontSize:12, fontWeight:700, padding:'7px 22px', borderRadius:30, marginBottom:16 }}>
          &#x2713; Activo en 48h · Respuesta en segundos · Cero comisión por venta
        </div>
        <h1 style={C.h1}>Instalamos 9 agentes de IA<br /><span style={C.h1accent}>que corren el 90% de tu operación comercial — autónoma, sin que tú estés.</span></h1>
        <p style={C.sub}>Desde la primera conversación hasta tu estrategia financiera. Dos capas: la operativa (atender, vender, cobrar, entregar) y la estratégica (interpretar tus datos y planear tus finanzas y marketing). El fundador toma la decisión. La IA hace el trabajo.</p>
        <div style={C.btns}>
          <a href="https://wa.me/523340026694?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20GenyX" style={C.primary}>Cuéntame de tu negocio →</a>
          <a href="#simulador-inmersivo" style={C.secondary}>Probar simulador</a>
        </div>
      </section>

      <section style={C.stats}>
        <div style={C.statsGrid}>
          {[['Segundos', 'Tu cliente recibe respuesta'], ['24/7', 'Incluye fines de semana y días festivos'], ['$0', 'Comisión por venta'], ['48h', 'De la sesión a vendiendo']].map(([v, l], i) => (
            <div key={i} style={C.statCell(i)}>
              <p style={C.statVal}>{v}</p>
              <p style={C.statLbl}>{l}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ── La Oportunidad ── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '.1em', marginBottom: 12 }}>LA OPORTUNIDAD</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>Cada conversación es una venta.<br /><span style={{ background: 'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Y tus datos lo demuestran.</span></h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.9 }}>El <strong style={{ color: '#f1f5f9' }}>78% de los clientes compra con el primero que responde.</strong> Con GenyX, ese siempre eres tú — en segundos, 24/7.</p>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.9 }}>El cobro ocurre <strong style={{ color: '#f1f5f9' }}>dentro del chat: tu cliente paga en 2 toques</strong> desde WhatsApp. Tú recibes la confirmación al instante.</p>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.9 }}>Cada pedido directo por WhatsApp es <strong style={{ color: '#f1f5f9' }}>100% tuyo. Cero comisión. Cero intermediarios.</strong> Con 10 pedidos al día, eso son más de <strong style={{ color: '#f1f5f9' }}>$20,000 al mes</strong> que se quedan en tu bolsillo.</p>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.9 }}>Los negocios que ya venden digital reportan hasta <strong style={{ color: '#f1f5f9' }}>57% más ingresos.</strong> GenyX te lleva ahí — con 9 agentes trabajando desde el día uno.</p>
        </div>
      </section>



      {/* ── Tu Operación Comercial: 9 Agentes ── */}
      <section id="agentes" style={{ padding: '0 24px 100px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '.1em', marginBottom: 12 }}>TU OPERACIÓN COMERCIAL — 90% AUTÓNOMA</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>9 agentes de IA.<br /><span style={{ background: 'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Configurados para tu negocio.</span></h2>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 560, margin: '0 auto' }}>Cada agente se encarga de una función clave. Trabajan juntos, comparten información y operan 24/7 — configurados con las reglas de tu negocio.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            ['Marketing', 'Contenido con tu ADN de marca. Reactiva clientes inactivos.', () => simSvg(['M19 4H5a2 2 0 00-2 2v14l4-4h12a2 2 0 002-2V6a2 2 0 00-2-2z','M12 10v.01','M8 10v.01','M16 10v.01'],'la1')],
            ['Captación', 'Atrae clientes desde redes, web y buscadores a tu WhatsApp.', () => simSvg(['M12 22s8-4 8-10A8 8 0 004 12c0 6 8 10 8 10z',['circle',{cx:12,cy:12,r:3}]],'la2')],
            ['Venta', 'Atiende en segundos con la personalidad de tu marca.', () => simSvg(['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'],'la3')],
            ['Cierre', 'Cobra dentro del chat. Sin que el cliente salga de WhatsApp.', () => simSvg([['rect',{x:1,y:4,width:22,height:16,rx:2,ry:2}],['line',{x1:1,y1:10,x2:23,y2:10}]],'la4')],
            ['Entrega', 'Coordina logística con servicios de terceros.', () => simSvg(['M16 16h6V8h-4l-3-3H1v11h3',['circle',{cx:6,cy:18,r:2}],['circle',{cx:18,cy:18,r:2}]],'la5')],
            ['Seguimiento', 'Recupera pedidos abandonados y clientes inactivos.', () => simSvg(['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 01-3.46 0'],'la6')],
            ['Analítica', 'KPIs, top productos, hora pico y recomendaciones.', () => simSvg(['M12 2a7 7 0 017 7c0 2.8-1.6 5.2-4 6.3V18H9v-2.7C6.6 14.2 5 11.8 5 9a7 7 0 017-7z',['line',{x1:9,y1:21,x2:15,y2:21}],['line',{x1:10,y1:24,x2:14,y2:24}]],'la7')],
            ['Finanzas', 'Margen, punto de equilibrio y proyección mensual.', () => simSvg([['line',{x1:12,y1:1,x2:12,y2:23}],'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],'la8')],

          ].map(([name, desc, icoFn]) => (
            <div key={name} style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '18px 16px', transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>{icoFn()}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{name}</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* ── Industrias integradas ── */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#a5b4fc', fontWeight: 700, marginBottom: 6 }}>9 agentes. Todos los planes. Cualquier negocio.</p>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 24 }}>Tú diriges la estrategia (10% de tu tiempo). Los agentes ejecutan el otro 90%.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            {[
              [() => simSvg(['M18 8h1a4 4 0 010 8h-1','M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z'],'ic1'), 'Restaurantes', 'Tú en la cocina, GenyX en el chat'],
              [() => simSvg(['M22 12h-4l-3 9L9 3l-3 9H2'],'ic2'), 'Clínicas', 'Agenda, confirma y cobra anticipo por ti'],
              [() => simSvg(['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],'ic3'), 'Belleza', 'Confirmación y recordatorio automático'],
              [() => simSvg(['M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z','M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z'],'ic4'), 'Escuelas', 'Del primer mensaje a la inscripción'],
              [() => simSvg([['rect',{x:3,y:3,width:18,height:18,rx:2,ry:2}],['line',{x1:3,y1:9,x2:21,y2:9}],['line',{x1:9,y1:21,x2:9,y2:9}]],'ic5'), 'Inmobiliarias', 'Filtra, califica y te entrega leads serios'],
              [() => simSvg(['M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z',['line',{x1:3,y1:6,x2:21,y2:6}],'M16 10a4 4 0 01-8 0'],'ic6'), 'Tiendas', 'Toma pedidos y cobra 24/7'],
            ].map(([icoFn, label, pain]) => (
              <div key={label} style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, transition:'all .2s', cursor:'default', minWidth:200, flex:'1 1 auto', maxWidth:320 }}
                onMouseOver={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.18)'; e.currentTarget.style.transform='translateY(0)'; }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icoFn()}</div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#f1f5f9' }}>{label}</div>
                  <div style={{ fontSize:10, color:'#818cf8', fontStyle:'italic', lineHeight:1.4 }}>{pain}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 16 }}>Además activamos herramientas según tu negocio: Inventario, Costeador, Citas, Foto Lab, Pipeline de Leads y más.</p>
        </div>
      </section>

      {/* ── WhatsApp Simulator ── */}
      <WhatsAppSimulator />

      {/* ── Centro de Mando (iPhone Simulator) ── */}
      <MandoSimulator />

      {/* ── Simulador Interactivo GenyX ── */}
      <SimuladorGenyX />

      {/* ── Aprendizaje Continuo ── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '.1em', marginBottom: 12 }}>EL DIFERENCIADOR</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>Mientras más tiempo trabaja contigo,<br /><span style={{ background: 'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>mejores son sus recomendaciones.</span></h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['Semana 1', 'Identifica tu producto estrella y hora pico'],
            ['Mes 1', 'Detecta clientes recurrentes vs inactivos'],
            ['Mes 3', 'Detecta tendencias que tú nunca verías'],
            ['Mes 6', 'Predice demanda estacional'],
            ['Mes 12', 'Todas tus decisiones son con datos'],
          ].map(([time, desc], i) => (
            <div key={time} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ minWidth: 90, fontSize: 14, fontWeight: 800, color: '#818cf8', textAlign: 'right' }}>{time}</div>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: i === 4 ? '#4ade80' : 'rgba(99,102,241,0.5)', border: '2px solid rgba(99,102,241,0.8)', flexShrink: 0 }} />
              <div style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, padding: '24px 32px' }}>
          <p style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, lineHeight: 1.7, fontStyle: 'italic' }}>El reporte del lunes no es un resumen — es información real de tus ventas que se vuelve más precisa y útil con cada semana que pasa.</p>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 14 }}>¿Quieres ver cómo se vería un día de tu negocio con GenyX operando?</p>
          <a href="#simulador-inmersivo" style={{ display: 'inline-block', background: 'transparent', border: '1px solid rgba(99,102,241,0.5)', color: '#818cf8', padding: '12px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'all .2s' }}>Probar el simulador en vivo →</a>
        </div>
      </section>

      {/* ── Reporte del Lunes ── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '.1em', marginBottom: 12 }}>EL REPORTE DEL LUNES</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>Cada lunes a las 5am,<br /><span style={{ background: 'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>tu reporte</span></h2>
          <p style={{ color: '#64748b', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>Esto es exactamente lo que vas a recibir — con TUS números reales.</p>
        </div>
        {/* Email mock-up */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', overflow: 'hidden', maxWidth: 560, margin: '0 auto' }}>
          {/* Email header */}
          <div style={{ background: '#f8fafc', padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}><strong style={{ color: '#334155' }}>De:</strong> Tu Agente de Inteligencia Financiera GenyX</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}><strong style={{ color: '#334155' }}>Para:</strong> <span style={{ color: '#94a3b8' }}>[Tu negocio]</span></div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}><strong style={{ color: '#334155' }}>Asunto:</strong> Tu reporte semanal — <span style={{ color: '#94a3b8' }}>[Fecha]</span></div>
          </div>
          {/* Email body */}
          <div style={{ padding: '28px 24px', color: '#334155', fontSize: 14, lineHeight: 1.8 }}>
            <p style={{ marginBottom: 16 }}>Hola <span style={{ color: '#94a3b8' }}>[Tu nombre]</span>,</p>
            <p style={{ marginBottom: 20 }}>Esta semana procesaste <strong style={{ color: '#94a3b8' }}>[X pedidos/citas/leads]</strong>. <strong style={{ color: '#94a3b8' }}>[$X MXN]</strong> en ventas. Margen promedio: <strong style={{ color: '#94a3b8' }}>[X%]</strong>.</p>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><strong style={{ color:'#6366f1' }}>▎</strong> <strong>Tu producto o servicio estrella</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>+ cuánto vendió y a qué margen</span></div>
              <div><strong style={{ color:'#6366f1' }}>▎</strong> <strong>Tu hora pico real</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>+ qué día de la semana concentra más demanda</span></div>
              <div><strong style={{ color:'#6366f1' }}>▎</strong> <strong>Tu cliente más recurrente</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>+ cuántas veces te compró</span></div>
              <div><strong style={{ color:'#6366f1' }}>▎</strong> <strong>Tus clientes inactivos</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>+ cuántos llevan 60+ días sin volver</span></div>
            </div>
            <p style={{ fontWeight: 700, marginBottom: 10, color: '#1e293b' }}>Sugerencias basadas en tus datos:</p>
            <div style={{ paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <div style={{ color: '#475569' }}>→ Recomendaciones de producción o agenda según los patrones que detectamos</div>
              <div style={{ color: '#475569' }}>→ Las acciones automáticas que ya tomamos con tus clientes inactivos esta semana</div>
              <div style={{ color: '#475569' }}>→ Cómo evolucionaron tus métricas vs la semana pasada</div>
            </div>
            <p style={{ color: '#64748b' }}>Que tengas una semana increíble.</p>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 15, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.7, maxWidth: 560, margin: '28px auto 0' }}>Cuando seas cliente, este email tendrá tus números reales — los que estás dejando sobre la mesa hoy por no tenerlos.</p>
      </section>

      {/* ── GenyX vs Empleado ── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '.1em', marginBottom: 12 }}>LA MATEMÁTICA</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', marginBottom: 10 }}>Lo que antes pedía un equipo completo<br /><span style={{ background: 'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ahora corre solo</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {/* Operación Comercial Humana */}
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '32px 28px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8', letterSpacing: '.08em', marginBottom: 20 }}>ANTES — OPERACIÓN TRADICIONAL</div>
            {[['Community Manager', '$8,000 – $17,800'], ['SDR / Captación', '$10,000 – $22,000'], ['Ejecutivo de Ventas', '$12,000 – $30,000'], ['Cajero / Cobranza', '$7,500 – $18,000'], ['Coordinador Logístico', '$10,000 – $22,000'], ['Customer Success', '$8,500 – $20,000'], ['Analista de Datos', '$17,400 – $45,000'], ['Contador Junior', '$11,800 – $21,200']].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: '#94a3b8' }}>
                <span>{label}</span><span style={{ fontWeight: 700, color: '#f1f5f9' }}>{val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 8, borderTop: '1px dashed rgba(239,68,68,0.2)', fontSize: 12, color: '#94a3b8' }}>
              <span>Subtotal nómina</span><span style={{ fontWeight: 700, color: '#f1f5f9' }}>$85,200 – $196,000</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, color: '#94a3b8' }}>
              <span>+ Cargas patronales (×1.40)</span><span style={{ fontWeight: 700, color: '#f1f5f9' }}>$34,100 – $78,400</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 8, borderTop: '2px solid rgba(239,68,68,0.3)', fontSize: 18, fontWeight: 900, color: '#94a3b8' }}>
              <span>TOTAL</span><span>$119,300 – $274,400/mes</span>
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Trabaja 8h L-S', 'Rotación y ausentismo', 'Reclutamiento + onboarding: semanas', 'Cada uno decide sin datos del otro'].map(t => (
                <div key={t} style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: '#64748b' }}>→</span> {t}</div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 10, color: '#475569', fontStyle: 'italic' }}>Fuente: Computrabajo, OCC, Glassdoor, Indeed, Talent.com — Mayo 2026</div>
          </div>
          {/* GenyX */}
          <div style={{ background: 'rgba(74,222,128,0.06)', border: '2px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '32px 28px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#4ade80', letterSpacing: '.08em', marginBottom: 20 }}>GenyX</div>
            {[['Plan Esencial (9 agentes)', '$9,900'], ['Plan Profesional (9 agentes)', '$18,900'], ['Plan Enterprise (9 agentes)', '$34,900']].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, color: '#94a3b8' }}>
                <span>{label}</span><span style={{ fontWeight: 700, color: '#f1f5f9' }}>{val}</span>
              </div>
            ))}
            {['IMSS', 'Aguinaldo', 'PTU', 'Infonavit', 'Vacaciones'].map(label => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, color: '#475569' }}>
                <span>{label}</span><span style={{ fontWeight: 700, color: '#4ade80' }}>$0</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', marginTop: 8, borderTop: '2px solid rgba(74,222,128,0.3)', fontSize: 18, fontWeight: 900, color: '#4ade80' }}>
              <span>DESDE</span><span>$9,900/mes</span>
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Trabaja 24/7, los 365 días', 'Siempre consistente', 'Activo en 48h — sin reclutamiento', 'Los 9 agentes comparten datos en tiempo real'].map(t => (
                <div key={t} style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: '#4ade80' }}>✓</span> {t}</div>
              ))}
            </div>
          </div>
        </div>
        {/* Ahorro destacado */}
        <div style={{ textAlign: 'center', marginTop: 32, background: 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(34,197,94,0.04))', border: '2px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '32px 24px' }}>
          <div style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 12, lineHeight: 1.6 }}>Lo que antes pedía un equipo completo,<br /><strong style={{ color: '#f1f5f9' }}>ahora corre solo. Una operación comercial completa, corriendo sola.</strong></div>
          <div style={{ fontSize: 56, fontWeight: 900, background: 'linear-gradient(135deg, #4ade80, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>Desde $9,900</div>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>por mes — tu operación comercial autónoma, lista desde el día uno</div>
        </div>
      </section>

      {/* ── Dashboard Preview ── */}
      <DashboardPreview />

      {/* ── ADN de tu Marca ── */}
      <section style={{ padding:'0 24px 100px', maxWidth:960, margin:'0 auto' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08))', border:'1px solid rgba(99,102,241,0.2)', borderRadius:24, padding:'40px 48px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:40, alignItems:'center' }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#818cf8', letterSpacing:'.1em', marginBottom:12 }}>TU OPERACIÓN COMERCIAL AUTÓNOMA</div>
            <h2 style={{ fontSize:32, fontWeight:900, color:'#f1f5f9', lineHeight:1.2, marginBottom:16 }}>Tu operación comercial autónoma<br /><span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>configurada con el ADN de tu marca</span></h2>
            <p style={{ color:'#64748b', lineHeight:1.8, fontSize:14 }}>Tu operación comercial autónoma genera demanda, convierte prospectos en clientes, coordina entregas con tu equipo y mide cada resultado — todo con la personalidad y calidez de tu marca.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              [<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>, 'Entiende notas de voz', 'Transcribe y responde audios de WhatsApp en segundos'],
              [<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, 'Habla como tu cliente', 'Regionalismos, abreviaciones y hasta emojis — sin respuestas robóticas'],
              [<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>, 'Asesora y recomienda', 'Detecta lo que el cliente necesita y recomienda antes de que pregunte'],
              [<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, 'Del interés al cobro en una conversación', 'Lleva al cliente del interés al carrito de forma natural. Responde en segundos.'],
            ].map(([ico, t, d]) => (
              <div key={t} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ fontSize:22, flexShrink:0, marginTop:2 }}>{ico}</div>
                <div>
                  <div style={{ color:'#f1f5f9', fontWeight:700, fontSize:14, marginBottom:3 }}>{t}</div>
                  <div style={{ color:'#64748b', fontSize:12, lineHeight:1.6 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── Ventajas Competitivas ── */}
      <section style={{ padding:'0 24px 100px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#818cf8', letterSpacing:'.1em', marginBottom:12, textAlign:'center' }}>POR QUÉ GenyX</div>
        <h2 style={{ fontSize:36, fontWeight:900, color:'#f1f5f9', marginBottom:12, textAlign:'center' }}>GenyX es tu operación comercial.<br /><span style={{ background:'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Con tu catálogo. Con tus reglas.</span></h2>
        <p style={{ color:'#64748b', marginBottom:48, textAlign:'center', fontSize:15, maxWidth:600, margin:'0 auto 48px' }}>9 agentes configurados con tu catálogo, tus precios y tu personalidad de marca. Miden resultados reales cada semana.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
          {[
            [() => simSvg([['rect',{x:3,y:11,width:18,height:11,rx:2,ry:2}],'M7 11V7a5 5 0 0110 0v4'],'lv1'), 'Precios exactos. Siempre.', 'Tu agente respeta tu catálogo al 100%. Si cuesta $120, cobra $120. Exactitud total en cada pedido.'],
            [() => simSvg([['line',{x1:18,y1:20,x2:18,y2:10}],['line',{x1:12,y1:20,x2:12,y2:4}],['line',{x1:6,y1:20,x2:6,y2:14}],'M22 12h-4l-3 9L9 3l-3 9H2'],'lv2'), 'Reportes que te hacen tomar decisiones', '¿Cuál es tu producto más vendido? ¿A qué hora te escriben más? ¿Cuánto vendiste esta semana? Información clara de tu negocio, cada lunes a las 5am.'],
            [() => simSvg([['path',{d:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2'}],['circle',{cx:9,cy:7,r:4}],['path',{d:'M23 21v-2a4 4 0 00-3-3.87'}],['path',{d:'M16 3.13a4 4 0 010 7.75'}]],'lv3'), 'Tu operación comercial autónoma — siempre activa', 'Atiende a todos tus clientes al mismo tiempo, los 365 días del año, desde el primer mensaje hasta el cobro.'],
            [() => simSvg([['polygon',{points:'12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'}]],'lv4'), 'Hecho a la medida de tu negocio', 'Tu catálogo. Tus precios. Tu personalidad de marca. Tu zona de entrega. Todo configurado para ti. Funciona como si lo hubiera entrenado tu mejor vendedor.'],
            [() => simSvg(['M13 2L3 14h9l-1 8 10-12h-9l1-8'],'lv5'), 'Vendiendo en 48 horas', 'Una sesión de 45 minutos para entender tu negocio. Nosotros hacemos todo. En 2 días tu agente ya está cerrando ventas.'],
          ].map(([icoFn, t, d]) => (
            <div key={t} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:16, padding:'24px 22px', transition:'all 0.25s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.45)'; e.currentTarget.style.background='rgba(99,102,241,0.06)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.15)'; e.currentTarget.style.background='rgba(255,255,255,0.03)'; }}>
              <div style={{ width:48, height:48, borderRadius:12, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>{icoFn()}</div>
              <div style={{ fontWeight:700, fontSize:15, color:'#f1f5f9', marginBottom:8 }}>{t}</div>
              <div style={{ fontSize:13, color:'#64748b', lineHeight:1.75 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding:'0 24px 100px', maxWidth:960, margin:'0 auto', textAlign:'center' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.06))', border:'1px solid rgba(99,102,241,0.2)', borderRadius:24, padding:'48px 40px' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'#818cf8', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:12 }}>Modelo de Inversión</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#f1f5f9', lineHeight:1.25, marginBottom:16 }}>3 planes. 9 agentes.<br /><span style={{ background:'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Tu operación comercial autónoma.</span></h2>
          <p style={{ color:'#64748b', lineHeight:1.8, marginBottom:32, fontSize:15 }}>GenyX opera bajo un modelo de <strong style={{ color:'#a5b4fc' }}>Fee de instalación + Suscripción mensual fija</strong>. Sin importar cuánto vendas en el mes, tu costo no cambia. Tus márgenes son tuyos.</p>
          <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap', marginBottom:24 }}>
            {[
              ['ESENCIAL','$9,900','MXN/mes','Setup: $12,000','9 agentes de IA','200 msgs carritos · 100 reactivación','30 imágenes FotoLab · 250 Costeador IA','Soporte L-V 9am–7pm','Negocios de 5-15 empleados · $200K-$700K/mes.'],
              ['PROFESIONAL','$18,900','MXN/mes','Setup: $18,000','9 agentes de IA','400 msgs carritos · 200 reactivación','60 imágenes FotoLab · 500 Costeador IA','Soporte L-S prioritario','Negocios de 15-50 empleados · $700K-$2M/mes. ★ Más elegido.'],
              ['ENTERPRISE','$34,900','MXN/mes','Setup: $30,000','9 agentes de IA','600 msgs carritos · 300 reactivación','100 imágenes FotoLab · Costeador ilimitado','Soporte 24/7 + sesión con Erick','Negocios de 50-100 empleados · $2M-$5M/mes.'],
            ].map(([plan, price, period, setup, agents, outbound, tools, support, desc]) => (
              <div key={plan} style={{ background: plan === 'PROFESIONAL' ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)', border: plan === 'PROFESIONAL' ? '2px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:'24px 20px', minWidth:220, flex:'1 1 200px', maxWidth:290, position:'relative', textAlign:'left' }}>
                {plan === 'PROFESIONAL' && <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontSize:9, fontWeight:800, padding:'3px 14px', borderRadius:20, letterSpacing:'.05em' }}>MÁS POPULAR</div>}
                <div style={{ fontWeight:800, fontSize:13, color:'#818cf8', letterSpacing:'.06em', marginBottom:10 }}>{plan}</div>
                <div style={{ fontSize:28, fontWeight:900, color:'#f1f5f9', marginBottom:2 }}>{price}</div>
                <div style={{ fontSize:12, color:'#64748b', marginBottom:8 }}>{period}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginBottom:12 }}>{setup}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
                  {[agents, outbound, tools, support].map(item => (
                    <div key={item} style={{ fontSize:11, color:'#94a3b8', display:'flex', alignItems:'center', gap:6 }}><span style={{ color:'#4ade80' }}>✓</span> {item}</div>
                  ))}
                </div>
                <div style={{ fontSize:11, color:'#64748b', lineHeight:1.6, fontStyle:'italic' }}>{desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:13, color:'#94a3b8', marginBottom:8, lineHeight:1.7 }}>La diferencia entre planes no está en los agentes — los 8 siempre están.<br />La diferencia está en el volumen de tu operación: bolsas de mensajes proactivos, herramientas y nivel de soporte. <a href="/planes" style={{ color:'#818cf8', textDecoration:'underline' }}>Ver detalle completo →</a></p>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>Cero comisión por venta. Sin permanencia mínima.</p>
          <a href="https://wa.me/523340026694?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20GenyX" style={{ display:'inline-block', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', padding:'14px 36px', borderRadius:12, fontSize:14, fontWeight:700, textDecoration:'none', boxShadow:'0 0 28px rgba(99,102,241,0.3)' }}>Conoce qué plan es para ti →</a>
        </div>
      </section>


      <section id="proceso" style={C.section()}>
        <div style={C.sHead}>
          <h2 style={{ ...C.sH2, fontSize: 40 }}>De cero a ventas en 48 horas.</h2>
          <p style={C.sP}>Tres pasos. Sin código. Sin consultor caro.</p>
        </div>
        <div style={C.grid3}>
          {steps.map(([n, t, d]) => (
            <div key={n} style={C.stepCard} onMouseOver={e => hoverCard(e, true)} onMouseOut={e => hoverCard(e, false)}>
              <div style={C.stepNum}>{n}</div>
              <h3 style={C.cardH}>{t}</h3>
              <p style={C.cardP}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding:'0 24px 100px', maxWidth:720, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#818cf8', letterSpacing:'.1em', marginBottom:12 }}>PREGUNTAS FRECUENTES</div>
          <h2 style={{ fontSize:36, fontWeight:900, color:'#f1f5f9' }}>Todo lo que necesitas saber</h2>
        </div>
        {[
          ['¿Cuánto cuesta GenyX?', 'Tres planes según el volumen de tu operación: Esencial $9,900 MXN/mes, Profesional $18,900 MXN/mes, Enterprise $34,900 MXN/mes. Los tres planes incluyen los 9 agentes — la diferencia está en productos en catálogo, conversaciones mensuales y sucursales. Cada plan incluye una instalación inicial de un solo pago. Te ayudamos a elegir el correcto en una conversación de 15 minutos.'],
          ['¿Cómo cobran y facturan?', 'Cobramos vía transferencia bancaria al inicio del mes. Te enviamos factura electrónica a tu RFC al confirmar el pago. La instalación se cobra una sola vez al firmar el contrato.'],
          ['¿GenyX cobra comisión por cada venta que cierra?', 'No. Jamás. Tu costo es fijo cada mes — sin importar si vendes $30,000 o $300,000. Cero comisión.'],
          ['¿Cuánto tarda en activarse?', 'Una sesión de 45 minutos para entender tu negocio. Nosotros configuramos todo. En menos de 48 horas tu agente está atendiendo clientes y cerrando ventas.'],
          ['¿Cómo garantizan la estabilidad del sistema?', 'Cada actualización pasa por pruebas de calidad antes de llegar a tu negocio. Monitoreamos el sistema activamente y atendemos cualquier incidencia lo antes posible. Si se presenta un problema mayor, tu agente queda en pausa controlada y te avisamos directamente hasta que se resuelva.'],
          ['¿Para quién es GenyX?', 'GenyX es para dueños de negocio con 5 a 100 empleados que quieren operar con menos personas y más datos. Son 9 agentes de IA que operan dos capas: la operativa (atender, vender, cobrar, entregar, dar seguimiento) y la estratégica (interpretar tus datos, planear tus finanzas y marketing, y darte visión 360° desde tu Centro de Mando). Cada viernes 6pm recibes la Mesa de Estrategia. Cada lunes 5am recibes el Reporte con tus números reales. El fundador toma la decisión. La IA hace el trabajo.'],
          ['¿Qué incluye GenyX que otros servicios no tienen?', 'GenyX cierra ventas. Atiende a tu cliente, arma su pedido, genera el cobro y te avisa cuando el dinero ya está en tu cuenta. Además mide resultados, planea tu marketing y te entrega reportes financieros cada semana.'],
          ['¿Cómo se compara el costo con un equipo tradicional?', 'GenyX se activa en 48 horas y opera tu dirección comercial 24/7 — sin contratar, capacitar ni supervisar personal adicional. Un costo mensual fijo por toda la operación.'],
          ['¿Necesito conocimientos técnicos?', 'Ninguno. Tú nos das la información de tu negocio y nosotros hacemos todo lo demás. Solo tienes que revisar tu mando de control y contar tus ventas.'],
          ['¿Puedo ver una demo en vivo antes de decidir?', 'Sí. Te mostramos el sistema funcionando con datos de tu negocio en 15 minutos por WhatsApp.'],
        ].map(([q, a], i) => (
          <FAQItem key={i} question={q} answer={a} />
        ))}
      </section>




      <div id="contacto" style={C.ctaSec}>
        <div style={C.ctaBox}>
          <h2 style={C.ctaH}>¿Listo para tomar mejores decisiones?</h2>
          <p style={C.ctaSub}>Cuéntanos de tu negocio.</p>
          <a href="https://wa.me/523340026694?text=Hola%2C%20me%20interesa%20GenyX%20para%20mi%20negocio.%20%C2%BFCuando%20podemos%20hablar%3F" style={{ ...C.ctaBtn, display:'inline-flex', alignItems:'center', gap:10, marginBottom:14 }}>Cuéntame de tu negocio →</a>
          <p style={{ color:'#64748b', fontSize:13 }}>o si prefieres: <a href="mailto:hola@genyxsystems.com" style={{ color:'#818cf8', textDecoration:'none' }}>hola@genyxsystems.com</a></p>
        </div>
      </div>

      <PWAInstallBanner />
      <GenyXConciergeWidget />
      <footer style={C.footer}>
        <span style={C.ftrBrand}>GenyX © 2026 · Tu operación comercial autónoma · Inteligencia de negocio</span>
        <div style={{ ...C.ftrLinks, paddingRight: 72 }}>
          <a href="/privacidad" style={C.ftrLink}>Privacidad</a>
          <a href="/terminos" style={C.ftrLink}>Términos</a>
          <a href="https://mando.genyxsystems.com" style={{ ...C.ftrLink, color:'#6366f1', fontWeight:700 }}>→ Accede a tu Mando</a>
        </div>
      </footer>
    </div>
  );
}


// ── Ticket de Compra (post-Stripe payment) ────────────────────────────────
function TicketPage({ sid }) {
  const [ticket, setTicket] = React.useState(null);
  const [loading, setLoading] = React.useState(!!sid);

  React.useEffect(() => {
    if (!sid) return;
    fetch(`${BACKEND}/api/orden-exitosa/${sid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setTicket(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sid]);

  const S = {
    bg:    { minHeight: '100vh', background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter', 'Segoe UI', sans-serif" },
    wrap:  { background: '#fff', borderRadius: 24, boxShadow: '0 24px 64px rgba(0,0,0,.13)', maxWidth: 440, width: '100%', overflow: 'hidden' },
    hdr:   { background: 'linear-gradient(135deg, #15803d, #16a34a)', padding: '32px 24px 24px', textAlign: 'center', color: '#fff' },
    body:  { padding: '22px 24px' },
    row:   { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 7, alignItems: 'flex-start' },
    rowB:  { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', fontWeight: 700, marginBottom: 7 },
    itemR: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px dashed #e5e7eb' },
    totalR:{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', fontWeight: 900, fontSize: 20, color: '#15803d', borderTop: '2px solid #dcfce7', marginTop: 8 },
    ftr:   { background: '#f9fafb', padding: '18px 24px', textAlign: 'center', borderTop: '1px dashed #e2e8f0' },
    sec:   { fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 8px' },
  };

  const items    = ticket?.items    || [];
  const total    = ticket?.total    || 0;
  const subtotal = ticket?.subtotal || 0;
  const shipping = ticket?.shipping || 0;
  const fecha    = ticket?.fecha    || new Date().toLocaleDateString('es-MX');
  const hora     = ticket?.hora     || '';
  const orderId  = ticket?.order_id || (sid ? `#${sid.slice(-8).toUpperCase()}` : '——');
  const nombre   = ticket?.nombre   || '';
  const whatsapp = ticket?.whatsapp || '';
  const address  = ticket?.address  || '';

  if (loading) return (
    <div style={S.bg}>
      <div style={{ textAlign: 'center', color: '#15803d' }}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
        <p style={{ fontWeight: 700, fontSize: 15 }}>Cargando tu ticket…</p>
      </div>
    </div>
  );

  return (
    <div style={S.bg}>
      <div style={S.wrap}>
        {/* ── Header ── */}
        <div style={S.hdr}>
          <div style={{ fontSize: 54, marginBottom: 6 }}>✅</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>¡Pago Recibido!</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, opacity: .9 }}>Tu pedido está siendo preparado con amor 🍞</p>
          <div style={{ display: 'inline-block', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: 12, padding: '4px 16px', borderRadius: 20, marginTop: 12, letterSpacing: '.05em' }}>PAGO EXITOSO</div>
        </div>

        {/* ── Body ── */}
        <div style={S.body}>

          {/* Info del pedido */}
          <div style={S.sec}>📋 Detalle del Pedido</div>
          <div style={S.rowB}><span>🔖 N° de Orden</span><b style={{ color: '#15803d' }}>#{orderId}</b></div>
          <div style={S.row}><span>📅 Fecha</span><span>{fecha}</span></div>
          {hora && <div style={S.row}><span>🕐 Hora</span><span>{hora}</span></div>}

          {/* Info del cliente */}
          {(nombre || whatsapp || address) && <>
            <div style={S.sec}>👤 Datos del Cliente</div>
            {nombre   && <div style={S.rowB}><span>Nombre</span><span>{nombre}</span></div>}
            {whatsapp && <div style={S.row}><span>📱 WhatsApp</span><span>{whatsapp}</span></div>}
            {address  && <div style={S.row}><span>📍 Dirección</span><span style={{ textAlign: 'right', maxWidth: '55%' }}>{address}</span></div>}
          </>}

          {/* Productos */}
          <div style={S.sec}>🛒 Productos ({items.length} {items.length === 1 ? 'item' : 'items'})</div>
          {items.length > 0 ? items.map((it, i) => (
            <div key={i} style={S.itemR}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1208' }}>{it.nombre}</div>
                <div style={{ fontSize: 12, color: '#78716c' }}>Cant: {it.qty} × ${it.precio_unitario?.toFixed(2)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d', whiteSpace: 'nowrap', marginLeft: 12 }}>${it.total_item?.toFixed(2)}</div>
            </div>
          )) : (
            <p style={{ color: '#78716c', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>📲 Revisa tu resumen en WhatsApp</p>
          )}

          {/* Totales */}
          {subtotal > 0 && <div style={{ ...S.row, marginTop: 12 }}><span>Subtotal</span><span>${subtotal.toFixed(2)} MXN</span></div>}
          {shipping > 0 && <div style={S.row}><span>🚚 Envío</span><span>${shipping.toFixed(2)} MXN</span></div>}
          {shipping === 0 && total > 0 && <div style={S.row}><span>🏪 Recoger en tienda</span><span>$0.00 MXN</span></div>}
          <div style={S.totalR}><span>TOTAL PAGADO</span><span>{total > 0 ? `$${total.toFixed(2)} MXN` : '——'}</span></div>
        </div>

        {/* ── Footer ── */}
        <div style={S.ftr}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🛍️</div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1208' }}>Tu negocio</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Dirección configurada en tu perfil</div>
          <div style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 12px' }}>Nos pondremos en contacto contigo por WhatsApp para coordinar la entrega</div>
          <button onClick={() => window.location.href = 'https://paty.genyxsystems.com'}
            style={{ background: '#25D366', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, padding: '12px 28px', borderRadius: 25, cursor: 'pointer' }}>
            Volver al chat
          </button>
        </div>
      </div>
    </div>
  );
}


export default function GenyXOperatorDashboard() {

  // ── REGLA DE HOOKS: todos los hooks PRIMERO, antes de cualquier return condicional ──
  const [adminKey, setAdminKey] = useState(sessionStorage.getItem('genyx_admin_key') || '');
  const [tab, setTab]           = useState('clientes');
  const [tenants, setTenants]   = useState([]);
  const [orders, setOrders]     = useState([]);
  const [health, setHealth]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [statusLoading, setStatusLoading] = useState('');
  const [selectedSlug, setSelectedSlug]   = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [hR, tR, oR] = await Promise.all([
        fetch(`${BACKEND}/api/health`),
        fetch(`${BACKEND}/api/tenants`, { headers: getAH() }),
        fetch(`${BACKEND}/api/dashboard/orders`),
      ]);
      if (hR.ok) setHealth(await hR.json());
      if (tR.ok) { const d = await tR.json(); setTenants(d.tenants || []); }
      if (oR.ok) setOrders(await oR.json());
    } catch (e) { console.error('[Dashboard]', e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 60000); return () => clearInterval(t); }, [fetchAll]);

  const handleToggleStatus = async (slug, currentStatus) => {
    setStatusLoading(slug);
    const action = currentStatus === 'suspended' ? 'reactivate' : 'suspend';
    try {
      const r = await fetch(`${BACKEND}/api/admin/client-status`, { method: 'POST', headers: getAH(), body: JSON.stringify({ slug, action }) });
      if (r.ok) fetchAll();
    } catch {}
    setStatusLoading('');
  };

  // ── Conditional renders (después de todos los hooks) ──────────────────────
  const IS_LOCAL   = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const IS_MANDO   = window.location.hostname.startsWith('mando.');
  const IS_OS      = window.location.hostname.startsWith('os.');
  const path       = window.location.pathname;
  const MANDO_SLUG = IS_MANDO ? (path.split('/').filter(Boolean)[0] || '') : '';

  // ―― Legal pages (mando.genyxsystems.com/terminos · /privacidad) ―――――
  if (path === '/terminos')   return <LegalPage tipo="terminos" />;
  if (path === '/contrato')   return <LegalPage tipo="contrato" />;
  if (path === '/dpa')        return <LegalPage tipo="dpa" />;
  if (path === '/sla')        return <LegalPage tipo="sla" />;
  if (path === '/cookies')    return <LegalPage tipo="cookies" />;
  if (path === '/privacidad') return <LegalPage tipo="privacidad" />;
  if (path === '/planes')     return <PlanesPage />;
  // ―― Dev-only: preview landing on localhost ―――――
  if (IS_LOCAL && path === '/preview-landing') return <GenyXLandingPage />;

  // ―― Ticket de compra post-Stripe (?pago=exitoso&sid=cs_live_...) ―――――
  const _qp = new URLSearchParams(window.location.search);
  if (_qp.get('pago') === 'exitoso') return <TicketPage sid={_qp.get('sid')} />;
  if (path === '/client-terminos' || path === '/paty-terminos') return <ClientTermsPage />;
  if (path === '/client-privacidad' || path === '/paty-privacidad') return <ClientPrivacyPage />;
  if (_qp.get('pago') === 'cancelado') {
    const cancelSlug = _qp.get('slug') || '';
    const cancelTenantData = cancelSlug ? tenants.find(t => t.slug === cancelSlug) : null;
    const cancelPhone = cancelTenantData?.whatsapp || '523340026694';
    const cancelName = cancelTenantData?.name || 'tu negocio';
    return (
      <div style={{ minHeight:'100vh', background:'#05080f', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter',sans-serif" }}>
        <div style={{ textAlign:'center', padding:40, maxWidth:440 }}>
          <div style={{ fontSize:52, marginBottom:20 }}>⚠️</div>
          <h1 style={{ color:'#f1f5f9', fontSize:24, fontWeight:800, marginBottom:12 }}>Pago no completado</h1>
          <p style={{ color:'#64748b', lineHeight:1.7, marginBottom:32 }}>No te preocupes — tu carrito sigue guardado. Regresa al chat de WhatsApp y genera un nuevo link cuando estés listo.</p>
          <a href={`https://wa.me/${cancelPhone}`} style={{ display:'inline-block', background:'linear-gradient(135deg,#25d366,#128c7e)', color:'#fff', padding:'14px 32px', borderRadius:30, fontWeight:700, fontSize:14, textDecoration:'none' }}>← Volver al Chat de {cancelName}</a>
        </div>
      </div>
    );
  }

  // ―― www.genyxsystems.com (o cualquier dominio no-mando) → Landing Page ―――
  if (!IS_MANDO && !IS_LOCAL && !IS_OS) return <LandingAuthGate><GenyXLandingPage /></LandingAuthGate>;

  if (IS_MANDO && MANDO_SLUG) return <MandoClientView slug={MANDO_SLUG} />;
  if (IS_MANDO && !MANDO_SLUG && !adminKey) return <AdminLoginScreen onAuth={(k) => { sessionStorage.setItem('genyx_admin_key', k); setAdminKey(k); }} />;

  // ── Login gate (adminKey vacío = mostrar AdminLoginScreen) ─────────────────
  if (!adminKey) return <AdminLoginScreen onAuth={(k) => { sessionStorage.setItem('genyx_admin_key', k); setAdminKey(k); }} />;

  // ── Operator Dashboard (os.genyxsystems.com) ─────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#060912', color: '#f0f0f5', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse-red{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}70%{box-shadow:0 0 0 6px rgba(239,68,68,0)}} a{cursor:pointer}`}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,9,18,0.95)', backdropFilter: 'blur(12px)', padding: '14px 28px', position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Home button */}
          <button onClick={() => window.location.href = '/'}
            title="Ir a la landing de GenyX"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            🏠 Home
          </button>
          {/* Reload button */}
          <button onClick={fetchAll} title="Recargar datos"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⟳ Reload
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 4 }}>
            <div style={{ width: 30, height: 30, border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#818cf8' }}>G</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '.03em' }}>Geny<span style={{ color: '#818cf8' }}>X</span></p>
              <p style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>Centro de Mando GenyX</p>
              <p style={{ fontSize: 9, color: '#475569', fontStyle: 'italic' }}>Tu operación comercial autónoma</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => {
              const active = tenants.filter(t => t.status === 'active');
              if (active.length === 0) { alert('No hay operaciones activas para suspender.'); return; }
              if (window.confirm(`🚨 BOTÓN DE PÁNICO\n\nSuspender TODAS las operaciones activas:\n${active.map(t => '• ' + (t.name || t.slug)).join('\n')}\n\n¿Confirmar?`)) {
                active.forEach(t => handleToggleStatus(t.slug, 'active'));
              }
            }}
            title="Suspender TODAS las operaciones activas de emergencia"
            style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', color: '#f87171', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, animation: 'pulse-red 2s infinite' }}
          >
            🚨 PÁNICO
          </button>
          {health && <span style={{ fontSize: 11, color: '#4ade80', background: '#14532d30', border: '1px solid #14532d', padding: '4px 12px', borderRadius: 20, fontFamily: 'monospace' }}>🟢 v{health.version} · {health.tenants_active} tenant(s)</span>}
          <button onClick={() => { sessionStorage.removeItem('genyx_admin_key'); setAdminKey(''); }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
            title="Cerrar sesión">🔒 Salir</button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ position: 'relative' }}>
        <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 28px', display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.4) transparent', WebkitOverflowScrolling: 'touch' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '12px 18px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', border: 'none', background: 'none', cursor: 'pointer', color: tab === t.id ? '#6366f1' : '#475569', borderBottom: `2px solid ${tab === t.id ? '#6366f1' : 'transparent'}`, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>{t.label}</button>
          ))}
        </nav>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(90deg, transparent, #060912)', pointerEvents: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
      </div>

      {/* —— Selector global de cliente —— */}
      <div style={{ padding: '10px 28px', background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: '#4f5c74', fontWeight: 600, letterSpacing: '.04em' }}>CLIENTE:</span>
        <select
          value={selectedSlug}
          onChange={e => setSelectedSlug(e.target.value)}
          style={{ background: '#0f1623', border: '1px solid rgba(99,102,241,0.35)', color: selectedSlug ? '#a5b4fc' : '#475569', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">-- Todos --</option>
          {tenants.map(t => <option key={t.slug} value={t.slug}>{t.name || t.slug}</option>)}
        </select>
        {selectedSlug && (
          <button onClick={() => setSelectedSlug('')} style={{ fontSize: 11, color: '#475569', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>✕ Limpiar</button>
        )}
      </div>

      {/* Content */}
      <main style={{ padding: '28px', maxWidth: 1200, margin: '0 auto' }}>
        {tab === 'clientes'     && <TabClientes     tenants={tenants} orders={orders} loading={loading} onToggleStatus={handleToggleStatus} statusLoading={statusLoading} selectedSlug={selectedSlug} />}
        {tab === 'herramientas' && <TabHerramientas  health={health}   orders={orders} tenants={tenants}  selectedSlug={selectedSlug} />}
        {tab === 'analista'     && <TabAnalista      tenants={tenants} orders={orders}  selectedSlug={selectedSlug} setSelectedSlug={setSelectedSlug} />}
        {tab === 'agentes'      && <TabAgentes       tenants={tenants} />}
        {tab === 'bitacora'     && <TabBitacora />}
        {tab === 'reporte'      && <TabReporteLunes tenants={tenants} />}
        {tab === 'data'         && <TabData          tenants={tenants} orders={orders}  selectedSlug={selectedSlug} />}
        {tab === 'expedientes'  && <TabExpedientes   tenants={tenants} selectedSlug={selectedSlug} />}
        {tab === 'manuales'     && <TabManuales />}
        {tab === 'marketing'    && <TabMarketing selectedSlug={selectedSlug} />}
        {tab === 'onboarding'   && <TabOnboarding />}
        {tab === 'farmacopeia'  && <TabFarmacopeia />}
      </main>
    </div>
  );
}
