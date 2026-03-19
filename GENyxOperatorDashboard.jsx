import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * GENyx Systems OS — Operator Dashboard v2.0
 * Tabs: Clientes · Órdenes · Herramientas · Analista · Manuales
 */

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://paty-backend-dkzk.onrender.com';
// ── SEGURIDAD: admin key nunca en el bundle — se solicita en login y vive en sessionStorage
const getAH = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Key': sessionStorage.getItem('genyx_admin_key') || '',
});
const isAuthed = () => !!sessionStorage.getItem('genyx_admin_key');

const fmt = (x) => new Date(x).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
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
  { id: 'herramientas', label: '🛠️ Herramientas' },
  { id: 'analista',     label: '📊 Analista' },
  { id: 'data',         label: '📈 DATA' },
  { id: 'expedientes',  label: '🗄️ Expedientes' },
  { id: 'manuales',     label: '📚 Manuales' },
  { id: 'onboarding',   label: '🚀 Onboarding' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CLIENTES
// ═══════════════════════════════════════════════════════════════════════════════
const TabClientes = ({ tenants, orders, loading, onToggleStatus, statusLoading, selectedSlug }) => {
  const [orgSettings, setOrgSettings] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [savingSlug, setSavingSlug] = useState(null);
  const [localEdits, setLocalEdits] = useState({});
  const [onboardingUrl, setOnboardingUrl] = useState(null);

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

  const clientKPIs = useMemo(() => {
    return tenants.map(t => {
      const org = orgSettings[t.slug] || {};
      const totalRevenue  = parseFloat(org.total_revenue)    || 0;
      const feePct        = parseFloat(org.fee_percent)      || 8;
      const commission    = parseFloat(org.genyx_commission) || (totalRevenue * feePct / 100);
      const pending       = parseFloat(org.pending_transfer) || (totalRevenue - commission);
      return { ...t, ...org, revenueMonth: totalRevenue, commission, pending };
    });
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
    <section>
      {onboardingUrl && (
        <div style={{ ...CARD, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', marginBottom: 20 }}>
          <p style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 8 }}>🔗 Link de Onboarding Stripe Connect</p>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Envía este link al cliente para que conecte su cuenta Stripe. Expira en 24h.</p>
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
      
      {/* ── GENyx #000 — solo visible cuando no hay cliente filtrado ─── */}
      {!selectedSlug && (
      <div style={{ marginBottom: 20 }}>
        <p style={{ ...MONO, color: '#6366f1', fontSize: 10, marginBottom: 8, letterSpacing: '.08em' }}>CLIENTE 000 — OPERADOR</p>
        <div style={{ ...CARD, border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: '#a5b4fc' }}>GENyx Systems</h3>
              <p style={{ fontSize: 12, color: '#6366f1', marginTop: 2 }}>Plataforma Operadora</p>
            </div>
            <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '2px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>OPERADOR</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <KpiMini label="Revenue plataforma" value={$$( clientKPIs.reduce((s,t)=>s+(t.revenueMonth||0),0) )} />
            <KpiMini label="Comisión GENyx" value={$$( clientKPIs.reduce((s,t)=>s+(t.commission||0),0) )} />
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
                    {(t.payout_mode || 'manual') === 'connect' ? '⚡ Connect' : '🏦 SPEI Manual'}
                  </span>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                <KpiMini label="Ingresos/mes" value={$$(t.revenueMonth)} />
                <KpiMini label={`GENyx (${t.fee_percent || 8}%)`} value={$$(t.commission)} />
                <KpiMini label="→ Al cliente" value={$$(t.pending)} />
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
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ÓRDENES
// ═══════════════════════════════════════════════════════════════════════════════
const TabOrdenes = ({ orders, tenants, loading }) => {
  const [selectedSlug, setSelectedSlug] = useState('all');

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => o.created_at && new Date(o.created_at) >= today);
  const weekOrders = orders.filter(o => {
    if (!o.created_at) return false;
    const d = new Date(); d.setDate(d.getDate() - 7);
    return new Date(o.created_at) >= d;
  });
  const weekRevenue = weekOrders.reduce((s, o) => {
    const od = typeof o.order_data === 'object' ? o.order_data : {};
    return s + parseFloat(od.total_estimated || od.total || 0);
  }, 0);

  const displayed = selectedSlug === 'all' ? orders : orders.filter(o => {
    const od = typeof o.order_data === 'object' ? o.order_data : {};
    return od.slug === selectedSlug || o.slug === selectedSlug;
  });
  const recent = displayed.slice(0, 30);

  if (loading) return <Spinner />;

  return (
    <section>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        <KpiCard label="Comandas hoy" value={todayOrders.length} icon="📋" />
        <KpiCard label="Esta semana" value={weekOrders.length} icon="📅" />
        <KpiCard label="Revenue semana" value={$$(weekRevenue)} icon="💰" />
        <KpiCard label="Total histórico" value={orders.length} icon="📦" />
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ ...H2, margin: 0 }}>Órdenes Recientes</h2>
        <select value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '6px 12px', borderRadius: 8, fontSize: 12 }}>
          <option value="all">Todos los clientes</option>
          <option value="__genyx__" style={{ color: '#818cf8' }}>🟣 GENyx Systems — Plataforma</option>
          {tenants.map(t => <option key={t.slug} value={t.slug}>{t.name || t.slug}</option>)}
        </select>
        <span style={MONO}>{recent.length} orden(es)</span>
      </div>

      {recent.length === 0 ? <Empty icon="📋" msg="No hay órdenes registradas aún." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recent.map((order, i) => {
            const od = typeof order.order_data === 'object' ? order.order_data : {};
            const items = Array.isArray(od.items) ? od.items : [];
            const total = od.total_estimated || od.total;
            return (
              <div key={order.id || i} style={{ ...CARD, display: 'flex', gap: 16, flexWrap: 'wrap', padding: '14px 18px' }}>
                <div style={{ flex: 2, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ ...MONO, background: '#1e40af20', color: '#60a5fa', padding: '2px 8px', borderRadius: 4 }}>#{order.id}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{order.created_at ? fmt(order.created_at) : '—'}</span>
                    <span style={{ marginLeft: 'auto', background: order.status === 'pending' ? '#78350f30' : '#14532d30', color: order.status === 'pending' ? '#fbbf24' : '#4ade80', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{order.status?.toUpperCase()}</span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9' }}>{order.customer_name || 'Cliente Directo'}</p>
                  {order.whatsapp && <p style={{ fontSize: 11, color: '#64748b' }}>📱 {order.whatsapp}</p>}
                </div>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{items.length} artículo(s)</p>
                  {items.slice(0, 3).map((item, j) => (
                    <p key={j} style={{ fontSize: 12, color: '#94a3b8' }}>· {typeof item === 'string' ? item : (item.item || item.name || '?')} {item.quantity ? `×${item.quantity}` : ''}</p>
                  ))}
                  {items.length > 3 && <p style={{ fontSize: 11, color: '#64748b' }}>+{items.length - 3} más</p>}
                </div>
                {total && <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#fb923c' }}>{$$(total)}</span>
                </div>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: NEWS FEED — 15 Minutos de Lectura
// ═══════════════════════════════════════════════════════════════════════════════
const NewsFeed = ({ health, orders, tenants }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = () => {
    setLoading(true);
    fetch(`${BACKEND}/api/news?t=${Date.now()}`) // bypass cache
      .then(r => r.json())
      .then(d => { setNews(d.articles || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchNews(); }, []);

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
// TAB: DATA — GENyx Intelligence Hub
// ═══════════════════════════════════════════════════════════════════════════════
const TabData = ({ tenants, orders }) => {
  const [genyxData, setGenyxData] = useState(null);

  useEffect(() => {
    const allOrders = orders || [];
    const paid = allOrders.filter(o => o.estado !== 'cancelado');
    const totalRevenue = paid.reduce((s, o) => {
      const od = typeof o.order_data === 'object' ? o.order_data : {};
      return s + parseFloat(od.total_estimated || od.total || o.total || 0);
    }, 0);
    const feePercent = 8;
    const totalCommission = totalRevenue * feePercent / 100;
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
        commission: clientRevenue * feePercent / 100,
      };
    });
    setGenyxData({ totalRevenue, totalCommission, avgTicket, totalOrders: paid.length, clientBreakdown });
  }, [tenants, orders]);

  if (!genyxData) return <Spinner />;
  const g = genyxData;
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={H2}>📈 GENyx — Intelligence Hub</h2>
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
          { label: 'Comisión GENyx', value: $$(g.totalCommission), icon: '⚡', color: '#818cf8' },
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
              <div><div style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>{$$(c.commission)}</div><div style={{ fontSize: 10, color: '#64748b' }}>Comisión</div></div>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{c.orders}</div><div style={{ fontSize: 10, color: '#64748b' }}>Pedidos</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* GENyx as a Business */}
      <div style={{ ...CARD, background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
        <h3 style={{ ...H2, fontSize: 14, marginBottom: 16, color: '#a5b4fc' }}>⚡ GENyx Systems — Como Negocio</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <p style={{ ...MONO, fontSize: 10, color: '#64748b', marginBottom: 8 }}>INGRESOS (COMISIONES)</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#818cf8' }}>{$$(g.totalCommission)}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Acumulado de {g.clientBreakdown.length} cliente(s)</p>
          </div>
          <div>
            <p style={{ ...MONO, fontSize: 10, color: '#64748b', marginBottom: 8 }}>MÉTRICAS PLATAFORMA</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['Clientes activos', tenants.filter(t => t.status === 'active').length],
                ['MRR estimado', $$(g.totalCommission)],
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => handlePanic('suspend')} disabled={!panicSlug}
            style={{ ...BTN_SM_RED, opacity: panicSlug ? 1 : 0.5, fontSize: 12, padding: '8px 18px' }}>
            ⏸ Suspender Bot
          </button>
          <button onClick={() => handlePanic('reactivate')} disabled={!panicSlug}
            style={{ ...BTN_SM_GREEN, opacity: panicSlug ? 1 : 0.5, fontSize: 12, padding: '8px 18px' }}>
            ▶ Reactivar Bot
          </button>
        </div>
        {panicStatus && <p style={{ marginTop: 10, fontSize: 12, ...MONO, color: panicStatus.startsWith('✅') ? '#4ade80' : '#f87171' }}>{panicStatus}</p>}
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
    return { totalOrders, totalRevenue, commission: totalRevenue * 0.08, byTenant };
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
            <KpiCard label="Comisión GENyx (8%)" value={$$(platformStats.commission)} icon="🏷️" />
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
          {platformStats.totalOrders === 0 && <Empty icon="🟣" msg="Sin órdenes en plataforma aún." sub="Los datos aparecerán cuando el bot cierre sus primeras ventas." />}
        </div>
      )}

      {loading && <Spinner />}
      {error && <p style={{ color: '#f87171', fontSize: 13 }}>❌ {error}</p>}
      {data?.empty && <Empty icon="📊" msg="Aún no hay órdenes registradas." sub="Los datos aparecerán aquí cuando el bot cierre sus primeras ventas." />}


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
// TAB: EXPEDIENTES
// ═══════════════════════════════════════════════════════════════════════════════
const CHECKLIST_SECTIONS = [
  { key: 'contacto', label: '📞 Contacto', fields: ['Nombre titular', 'RFC', 'Email principal', 'WhatsApp', 'Ciudad / Estado', 'Nombre comercial'] },
  { key: 'ids', label: '🏦 IDs Oficiales', fields: ['INE / Pasaporte', 'Comprobante domicilio', 'Constancia SAT'] },
  { key: 'legal', label: '⚖️ Legal', fields: ['Contrato GENyx firmado', 'NDA incluido', 'Aviso de privacidad (ARCO)', 'Términos y Condiciones', 'Fecha inicio relación', 'Vigencia contrato'] },
  { key: 'adn', label: '🧭 ADN Negocio', fields: ['Catálogo de productos', 'Precios actualizados', 'Horarios de atención', 'Zona de entrega', 'FAQ del negocio', 'Tono del bot', 'Políticas de devolución'] },
  { key: 'tecnico', label: '⚙️ Técnico', fields: ['Slug asignado', 'Clone ID en DB', 'URL sitio web', 'Meta Phone Number ID', 'CLABE bancaria', 'Email correo lunes', 'Dashboard token'] },
  { key: 'comercial', label: '💰 Financiero', fields: ['Comisión acordada (%)', 'Cuota mensual', 'Método de pago', 'Stripe Connect activo', 'Último pago registrado'] },
];

const GENYX_EXPEDIENTE = {
  id: '__genyx__', name: 'GENyx Systems', slug: '000-genyx', industry: 'Plataforma Operadora',
  startDate: '2025-01-01', status: 'active', phone: '+52 (55) XXXX-XXXX',
  email: 'admin@genyxsys.com', city: 'México', rfc: 'GXS250101XXX',
  contacto: { 'Nombre titular': '✅', 'RFC': '✅', 'Email principal': '✅', 'WhatsApp': '✅', 'Ciudad / Estado': '✅', 'Nombre comercial': '✅' },
  ids: { 'INE / Pasaporte': '✅', 'Comprobante domicilio': '✅', 'Constancia SAT': '✅' },
  legal: { 'Contrato GENyx firmado': 'N/A', 'NDA incluido': 'N/A', 'Aviso de privacidad (ARCO)': '✅', 'Términos y Condiciones': '✅', 'Fecha inicio relación': '✅', 'Vigencia contrato': 'N/A' },
  adn: { 'Catálogo de productos': '✅', 'Precios actualizados': '✅', 'Horarios de atención': '✅', 'Zona de entrega': 'N/A', 'FAQ del negocio': '✅', 'Tono del bot': '✅', 'Políticas de devolución': 'N/A' },
  tecnico: { 'Slug asignado': '✅', 'Clone ID en DB': '✅', 'URL sitio web': '✅', 'Meta Phone Number ID': '⚠️', 'CLABE bancaria': 'N/A', 'Email correo lunes': '✅', 'Dashboard token': '✅' },
  comercial: { 'Comisión acordada (%)': 'N/A', 'Cuota mensual': 'N/A', 'Método de pago': 'N/A', 'Stripe Connect activo': 'N/A', 'Último pago registrado': 'N/A' },
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
    [GENYX_EXPEDIENTE, ...tenants.map(t => ({ ...t, id: t.slug }))]
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

  const allClients = [GENYX_EXPEDIENTE, ...tenants.map((t, i) => ({ ...t, id: t.slug, idx: i + 1 }))];
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
            const isGenyx = id === '__genyx__';
            return (
              <div key={id} onClick={() => selectClient(id)}
                style={{ ...CARD, cursor: 'pointer',
                  border: selected === id ? '1px solid #6366f1' : isGenyx ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.07)',
                  background: selected === id ? 'rgba(99,102,241,0.1)' : isGenyx ? 'rgba(99,102,241,0.05)' : undefined,
                  padding: '14px 16px', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <p style={{ ...MONO, fontSize: 9, color: isGenyx ? '#6366f1' : '#64748b', marginBottom: 3 }}>
                      {isGenyx ? 'CLIENTE 000' : `CLIENTE ${String(i).padStart(3, '0')}`}
                    </p>
                    <p style={{ fontWeight: 700, fontSize: 13, color: isGenyx ? '#a5b4fc' : '#f1f5f9' }}>{c.name || c.slug}</p>
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
                ['Comisión GENyx', exp.fee_percent ? `${exp.fee_percent}%` : '8% (default)'],
                ['CLABE bancaria', exp.bank_clabe || '—'],
                ['Email correo lunes', exp.owner_email || '—'],
                ['URL sitio web', exp.website_url || '—'],
                ['Stripe Connect', exp.payout_mode === 'connect' ? `✅ ${exp.stripe_account_id}` : '🏦 SPEI Manual'],
                ['Número WaB (GENyx)', exp.meta_phone || '⚠️ Pendiente asignar'],
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
    { emoji: '🧠', title: 'Bot con amnesia / contexto viejo', desc: 'El bot repite saludos o recuerda pedidos viejos de prueba.', cmd: `curl -X DELETE "${BASE}/api/admin/purge-all-history" -H "X-Admin-Key: <TU_ADMIN_KEY>"`, cmdId: 'purge-history', expected: '{"deleted": N, "status": "ok"}' },
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
        <span style={{ fontSize: 10, ...MONO, color: '#64748b', background: '#1e293b', padding: '4px 10px', borderRadius: 6 }}>GENyx OS v5.1 · CHASSIS-STABLE</span>
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
        {['Negocio', 'Bot', 'Catálogo'].map((label, i) => (
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
            {[['Nombre comercial *', 'name', 'Ej: Tacos El Güero'], ['Giro', 'industry', 'Ej: Restaurante, Panadería, Floriste...'], ['Email del dueño', 'owner_email', 'Para reportes semanales'], ['Sitio web', 'website_url', 'https://...'], ['Dirección de la tienda', 'store_address', 'Calle, Número, Colonia, Ciudad']].map(([label, key, placeholder]) => (
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
            <h3 style={H3}>Configuración del Bot</h3>
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
            <p style={{ fontSize: 12, color: '#64748b' }}>Escribe el catálogo en texto libre. El bot lo usa como referencia de precios y productos disponibles. Se puede actualizar después sin redespliegue.</p>
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
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', letterSpacing: '.02em', margin: 0 }}>GENyx <span style={{ color: '#6366f1' }}>Systems</span></h1>
          <p style={{ fontSize: 11, color: '#334155', fontFamily: 'JetBrains Mono, monospace', marginTop: 6, letterSpacing: '.08em' }}>OPERATOR CONTROL CENTER</p>
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
        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 10, marginTop: 20, fontFamily: 'monospace' }}>GENyx OS v3.4 · Sesión segura</p>
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
const MANDO_TABS = [
  { id: 'pedidos', label: '🚦 Pedidos' },
  { id: 'kpis',    label: '📊 KPIs' },
  { id: 'inv',     label: '📦 Inventario' },
  { id: 'cost',    label: '💰 Costeador' },
  { id: 'exp',     label: '📋 Expediente' },
];
const EXPEDIENTE_DOCS = [
  { label: 'INE / Pasaporte', key: 'ine' },
  { label: 'Comprobante de domicilio', key: 'dom' },
  { label: 'Constancia de Situación Fiscal (SAT)', key: 'sat' },
  { label: 'Contrato firmado', key: 'contrato' },
  { label: 'CLABE bancaria registrada', key: 'clabe' },
  { label: 'Cuenta Stripe configurada', key: 'stripe' },
  { label: 'Catálogo de productos cargado', key: 'catalogo' },
  { label: 'Recetas registradas en Costeador', key: 'recetas' },
];

// ── Legal Pages (✕ /terminos ✕ /privacidad) ────────────────────────────────
function LegalPage({ tipo }) {
  const isTC = tipo === 'terminos';
  const LS = { fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#faf9f7', color: '#292524', padding: '32px 20px', maxWidth: 720, margin: '0 auto' };
  const H1 = { fontSize: 22, fontWeight: 800, color: '#92400e', marginBottom: 6 };
  const H2 = { fontSize: 14, fontWeight: 700, color: '#44403c', margin: '22px 0 8px', borderBottom: '1px solid #e7e5e4', paddingBottom: 6 };
  const P  = { fontSize: 13, lineHeight: 1.7, color: '#57534e', marginBottom: 10 };
  const UL = { fontSize: 13, lineHeight: 1.7, color: '#57534e', paddingLeft: 20, marginBottom: 10 };
  const HL = { color: '#92400e', fontWeight: 700 };
  return (
    <div style={{ background: '#faf9f7', minHeight: '100vh' }}>
      <div style={LS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <a href="/" style={{ color: '#92400e', fontSize: 13, textDecoration: 'none' }}>← Inicio</a>
          <span style={{ color: '#d6d3d1' }}>|</span>
          <span style={{ fontSize: 11, color: '#a8a29e', fontFamily: 'monospace' }}>GENyx Systems</span>
        </div>
        {isTC ? (
          <>
            <h1 style={H1}>Términos y Condiciones de Uso</h1>
            <p style={{ ...P, color: '#a8a29e', fontSize: 11 }}>GENyx Systems · Versión 1.0 · Última actualización: Marzo 2026</p>
            <h2 style={H2}>1. Aceptación</h2>
            <p style={P}>Al activar el servicio o acceder al Centro de Mando, el Cliente acepta expresamente estos Términos y Condiciones, el Aviso de Privacidad y el Contrato de Servicios vigentes.</p>
            <h2 style={H2}>2. Descripción del Servicio</h2>
            <p style={P}>GENyx Systems provee una plataforma SaaS de automatización comercial con bot de ventas IA vía WhatsApp Business, Centro de Mando, procesamiento de pagos (Stripe Connect) y análisis de datos.</p>
            <h2 style={H2}>3. Cuentas y Seguridad</h2>
            <ul style={UL}>
              <li><span style={HL}>Credenciales:</span> El Cliente es único responsable de su PIN de acceso.</li>
              <li><span style={HL}>Líneas WaB:</span> Los números de WhatsApp están en custodia exclusiva de GENyx bajo la cuenta corporativa de Meta.</li>
              <li><span style={HL}>Expediente Digital (KYC):</span> GENyx puede suspender el acceso si el expediente no está al 100%.</li>
            </ul>
            <h2 style={H2}>4. Pagos y Comisiones</h2>
            <p style={P}>El procesamiento usa Stripe Connect. El Cliente autoriza el descuento automático de la comisión GENyx antes de cada liquidación. Los precios pueden ajustarse en renovación anual con 30 días de aviso.</p>
            <h2 style={H2}>5. Inteligencia Artificial y Limitación de Responsabilidad</h2>
            <p style={P}>El bot opera con IA generativa de naturaleza probabilística y puede cometer <strong>errores conversacionales</strong> (“alucinaçiones”). GENyx no garantiza precisión del 100%. <strong>GENyx no será responsable</strong> por pérdidas económicas, productos mal cotizados, daños a la reputación o cualquier daño indirecto o consecuencial. La responsabilidad máxima de GENyx se limita a los <strong>3 meses de suscripción pagados</strong> anteriores al evento.</p>
            <h2 style={H2}>6. Fuerza Mayor y Caídas de Terceros</h2>
            <p style={P}>GENyx no responde por interrupciones de Meta/WhatsApp, OpenAI, Stripe, Render, Vercel u otros proveedores de infraestructura. Estos tiempos no computan para el SLA del 99%.</p>
            <h2 style={H2}>7. Uso Aceptable</h2>
            <p style={P}>Queda prohibido usar la Plataforma para vender productos ilegales, enviar spam, o intentar vulnerar el código o infraestructura de GENyx.</p>
            <h2 style={H2}>8. Propiedad Intelectual</h2>
            <p style={P}>El código, algoritmos, prompts, ADN del bot, flujos de venta y herramientas son propiedad exclusiva de GENyx. El Cliente retiene derechos sobre su catálogo, recetas y marca.</p>
            <h2 style={H2}>9. Jurisdicción</h2>
            <p style={P}>Ley aplicable: Estados Unidos Mexicanos. Jurisdicción: Tribunales Federales de Guadalajara, Jalisco.</p>
            <p style={{ ...P, marginTop: 24, fontSize: 11, color: '#a8a29e' }}>Consultas: legal@genyxsystems.com</p>
          </>
        ) : (
          <>
            <h1 style={H1}>Aviso de Privacidad</h1>
            <p style={{ ...P, color: '#a8a29e', fontSize: 11 }}>GENyx Systems · Versión 1.0 · Última actualización: Marzo 2026 · Conforme a LFPDPPP</p>
            <h2 style={H2}>1. Responsable del Tratamiento</h2>
            <p style={P}><strong>GENyx Systems</strong>, representado por Erick Naveda, Guadalajara, Jalisco, México. Contacto: <strong>privacidad@genyxsystems.com</strong></p>
            <h2 style={H2}>2. Roles de Tratamiento</h2>
            <ul style={UL}>
              <li><span style={HL}>GENyx como Responsable:</span> Datos del dueño del negocio (nombre, RFC, CLABE, etc.).</li>
              <li><span style={HL}>GENyx como Encargado:</span> Datos de los compradores finales (nombre, teléfono, dirección). El <strong>Cliente es el Responsable</strong> frente a sus compradores.</li>
            </ul>
            <h2 style={H2}>3. Datos Recabados del Cliente</h2>
            <p style={P}>Nombre, RFC, INE, correo, CLABE, comprobante de domicilio, catálogo, recetas, horarios y configuración del bot.</p>
            <h2 style={H2}>4. Finalidades</h2>
            <ul style={UL}>
              <li>Activación y mantenimiento del servicio (Centro de Mando, bot WaB)</li>
              <li>Procesamiento de pagos y dispersión de fondos (Stripe Connect)</li>
              <li>Generación de análisis comerciales (Correo del Lunes)</li>
              <li>Cumplimiento legal y fiscal</li>
            </ul>
            <h2 style={H2}>5. Transferencia a Terceros</h2>
            <ul style={UL}>
              <li><span style={HL}>Stripe:</span> KYB y procesamiento de pagos</li>
              <li><span style={HL}>Meta Platforms:</span> Operación de WhatsApp Business API</li>
              <li><span style={HL}>OpenAI:</span> Procesamiento de lenguaje (datos anonimizados, no se usan para entrenar modelos públicos)</li>
              <li><span style={HL}>Render / Vercel:</span> Infraestructura cloud</li>
            </ul>
            <h2 style={H2}>6. Derechos ARCO</h2>
            <p style={P}>Acceso, Rectificación, Cancelación u Oposición: envía solicitud a <strong>privacidad@genyxsystems.com</strong>. Respuesta en máximo 20 días hábiles.</p>
            <h2 style={H2}>7. Cookies y Session Storage</h2>
            <p style={P}>Solo usamos session storage y cookies técnicas estrictamente necesarias para la seguridad de las sesiones. No usamos cookies publicitarias ni de rastreo.</p>
            <p style={{ ...P, marginTop: 24, fontSize: 11, color: '#a8a29e' }}>privacidad@genyxsystems.com · GENyx Systems · Guadalajara, Jalisco, México</p>
          </>
        )}
      </div>
    </div>
  );
}

function MandoClientView({ slug }) {
  // ── Auth
  const [pin, setPin]             = useState('');
  const [token, setToken]         = useState(null);
  const [name, setName]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
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
  const [opEx,       setOpEx]       = useState(0);     // gastos operativos por unidad
  const [showInfo,   setShowInfo]   = useState(null);  // tooltip (i) activo
  const [kpiPeriod,  setKpiPeriod]  = useState('month'); // filtro ingresos: day/week/month
  const [genyxFee,   setGenyxFee]   = useState(false);  // +8% fee GENyx opcional
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

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try { const r = await fetch(`${BACKEND}/api/dashboard/${slug}/analytics`, { headers: { 'X-Dashboard-Token': token } }); if (r.ok) setAnalytics(await r.json()); } catch {}
    setAnalyticsLoading(false);
  }, [token, slug]);
  useEffect(() => { if (tab === 'kpis' && token && !analytics) fetchAnalytics(); }, [tab, token, analytics, fetchAnalytics]);

  const fetchInventory = useCallback(async () => {
    if (!token) return; setInvLoading(true);
    try { const r = await fetch(`${BACKEND}/api/dashboard/${slug}/inventory`, { headers: { 'X-Dashboard-Token': token } }); if (r.ok) { const d = await r.json(); setInventory(d.items || []); } } catch {}
    setInvLoading(false);
  }, [token, slug]);
  useEffect(() => { if (tab === 'inv' && token) fetchInventory(); }, [tab, token, fetchInventory]);

  const patchInventory = async (productName, stock, unit) => {
    try {
      const r = await fetch(`${BACKEND}/api/dashboard/${slug}/inventory`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token },
        body: JSON.stringify({ product_name: productName, stock: parseInt(stock) || 0, unit: unit || 'pza', updated_by: 'Propietario' }),
      });
      if (r.ok) { fetchInventory(); setEditStock(prev => { const n = { ...prev }; delete n[productName]; return n; }); }
    } catch {}
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

  // ── Login
  if (!token) return (
    <div style={{ ...CS, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 360, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/paty-icon.png" alt="Paty HomeBakery" style={{ width: 80, height: 80, borderRadius: 16, marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1208' }}>Paty HomeBakery</h1>
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
                style={{ marginTop: 2, width: 16, height: 16, accentColor: '#92400e', cursor: 'pointer', flexShrink: 0 }}
              />
              <label htmlFor={`terms-${slug}`} style={{ fontSize: 11, color: '#78716c', lineHeight: 1.5, cursor: 'pointer' }}>
                He leído y acepto los{' '}
                <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: '#92400e', fontWeight: 700 }}>Términos y Condiciones</a>{' '}
                y el{' '}
                <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: '#92400e', fontWeight: 700 }}>Aviso de Privacidad</a>{' '}
                de GENyx Systems.
              </label>
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{error}</p>}
            <button type="submit" disabled={loading || !termsAccepted}
              style={{ ...BTN('#92400e'), width: '100%', padding: 13, fontSize: 15, opacity: (loading || !termsAccepted) ? 0.5 : 1, cursor: !termsAccepted ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Entrando…' : 'Entrar ✓'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: '#c4b5a5', fontSize: 10, marginTop: 12 }}>GENyx OS · {slug}</p>
      </div>
    </div>
  );

  const activos   = orders.filter(o => o.production_status !== 'entregado');
  const historial = orders.filter(o => o.production_status === 'entregado');

  return (
    <div style={CS}>
      {/* Header */}
      <header style={{ background: '#92400e', color: '#fff', padding: '12px 20px 0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/paty-icon.png" alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{name || 'Mi Panadería'}</div>
              <div style={{ fontSize: 9, opacity: .7 }}>Centro de Mando</div>
            </div>
          </div>
          <button onClick={fetchOrders} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>⟳</button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 0 }}>
          {MANDO_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.55)', borderBottom: `2px solid ${tab === t.id ? '#fff' : 'transparent'}`, whiteSpace: 'nowrap', letterSpacing: '.03em' }}>{t.label}</button>
          ))}
        </div>
      </header>

      <main style={{ padding: 18, maxWidth: 720, margin: '0 auto', width: '100%', flex: 1 }}>

        {/* ═══ TAB: PEDIDOS ═══ */}
        {tab === 'pedidos' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#44403c' }}>🚦 Pedidos Activos ({activos.length})</h2>
          {/* ━━ Contadores de status ━━ */}
          {(() => {
            const cNuevo    = activos.filter(o => !o.production_status || o.production_status === 'nuevo').length;
            const cProd     = activos.filter(o => o.production_status === 'en_produccion').length;
            const cTotal    = historial.length;
            const STAT = [
              { label: '🆕 Nuevos',     count: cNuevo, bg: '#eff6ff', txt: '#1d4ed8' },
              { label: '⚙️ En Proceso', count: cProd,  bg: '#fefce8', txt: '#b45309' },
              { label: '✅ Entregados', count: cTotal, bg: '#f0fdf4', txt: '#15803d' },
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                {STAT.map(({ label, count, bg, txt }) => (
                  <div key={label} style={{ background: bg, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: txt }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: txt, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          {/* Leyenda */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {Object.values(PROD_STATUS).map(s => <span key={s.label} style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30`, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.label}</span>)}
          </div>
          {activos.length === 0 && <div style={{ ...CARD, textAlign: 'center', color: '#a8a29e', fontSize: 14 }}>No hay pedidos activos.</div>}
          {activos.map(o => {
            const ps = o.production_status || 'nuevo';
            const sp = PROD_STATUS[ps] || PROD_STATUS.nuevo;
            const items = o.items || []; const total = o.total || o.total_estimated || 0; const isUpd = updating === o.id;
            return (
              <div key={o.id} style={{ ...CARD, borderLeft: `4px solid ${sp.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>#{o.id} · {o.customer_name || 'Cliente'}</div>
                    <div style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>
                      {o.whatsapp && <span>📱 {o.whatsapp}</span>}
                      {o.address && <span style={{ marginLeft: 6 }}>📍 {o.address}</span>}
                    </div>
                  </div>
                  <span style={{ background: sp.bg, color: sp.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, border: `1px solid ${sp.color}30` }}>{sp.label}</span>
                </div>
                <div style={{ background: '#faf7f2', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12 }}>
                  {items.map((it, i) => <div key={i}>• {it.nombre || it.name} ×{it.cantidad || it.qty || 1} — <b>${(it.subtotal || it.precio || 0).toLocaleString()}</b></div>)}
                  {items.length === 0 && <span style={{ color: '#a8a29e' }}>Sin detalle.</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#78716c', fontSize: 11 }}>{fmt(o.created_at)}</span>
                  <span style={{ fontWeight: 800, color: '#92400e', fontSize: 15 }}>${total.toLocaleString('es-MX')} MXN</span>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {sp.next && <button onClick={() => updateProdStatus(o.id, sp.next)} disabled={isUpd} style={{ ...BTN(PROD_STATUS[sp.next].color), flex: 1, opacity: isUpd ? 0.5 : 1 }}>{isUpd ? '...' : sp.nextLabel}</button>}
                  {ps === 'en_produccion' && <button onClick={() => updateProdStatus(o.id, 'nuevo')} disabled={isUpd} style={{ ...BTN('#f3f4f6', '#6b7280'), border: '1px solid #e5e7eb' }}>← Regresar</button>}
                </div>
              </div>
            );
          })}
          {historial.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, color: '#78716c', cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>🗂 Historial entregados ({historial.length})</summary>
              {historial.slice(0, 15).map(o => (
                <div key={o.id} style={{ ...CARD, opacity: 0.65, fontSize: 12 }}>
                  #{o.id} · <b>{o.customer_name}</b> — ${(o.total || 0).toLocaleString('es-MX')} MXN · ✅ Entregado · {fmt(o.created_at)}
                </div>
              ))}
            </details>
          )}
        </>)}

        {/* ═══ TAB: KPIs ═══ */}
        {tab === 'kpis' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#44403c' }}>📊 KPIs de mi Negocio</h2>
          {analyticsLoading && <div style={{ textAlign: 'center', color: '#a8a29e', padding: 40 }}>Cargando datos…</div>}
          {!analyticsLoading && analytics && (
            <>
              {analytics.empty ? (
                <div style={{ ...CARD, textAlign: 'center', color: '#a8a29e', fontSize: 14 }}>Aún no hay pedidos registrados. Los KPIs aparecerán cuando uses el sistema.</div>
              ) : (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div style={{ ...CARD, textAlign: 'center', margin: 0 }}>
                    <div style={{ fontSize: 11, color: '#78716c', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>🎫 Ticket Promedio</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e' }}>${(analytics.ticket_promedio || 0).toLocaleString('es-MX')}</div>
                    <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 4 }}>MXN por pedido</div>
                  </div>
                  <div style={{ ...CARD, textAlign: 'center', margin: 0 }}>
                    <div style={{ fontSize: 11, color: '#78716c', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>📦 Total Pedidos</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e' }}>{analytics.total_orders || 0}</div>
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
                  const revenue = filtered.reduce((s, o) => s + (o.total || o.total_estimated || 0), 0);
                  const labels  = { day: 'Hoy', week: 'Esta Semana', month: 'Este Mes' };
                  return (
                    <div style={{ background: 'linear-gradient(135deg,#92400e 0%,#b45309 100%)', borderRadius: 14, padding: '14px 16px', marginBottom: 14, color: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase' }}>💵 Ingresos</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {['day','week','month'].map(p => (
                            <button key={p} onClick={() => setKpiPeriod(p)}
                              style={{ fontSize: 10, padding: '3px 9px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700,
                                background: kpiPeriod === p ? '#fff' : 'rgba(255,255,255,0.22)',
                                color:      kpiPeriod === p ? '#92400e' : '#fff' }}>
                              {labels[p]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: 34, fontWeight: 900 }}>${revenue.toLocaleString('es-MX')}</div>
                      <div style={{ fontSize: 10, opacity: .8, marginTop: 4 }}>MXN · {labels[kpiPeriod]} · {filtered.length} pedido(s)</div>
                    </div>
                  );
                })()}
                <div style={CARD}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#44403c', marginBottom: 10 }}>🏆 Top Productos</div>
                  {(analytics.top_productos || []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < (analytics.top_productos.length - 1) ? '1px solid #f5f0ea' : 'none' }}>
                      <span style={{ fontSize: 13 }}><b style={{ color: '#92400e' }}>#{i + 1}</b> {p.name}</span>
                      <span style={{ background: '#faf0e6', color: '#92400e', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{p.qty} vendidos</span>
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
          {!analyticsLoading && !analytics && <button onClick={fetchAnalytics} style={{ ...BTN('#92400e'), width: '100%' }}>Cargar KPIs</button>}
        </>)}

        {/* ═══ TAB: INVENTARIO ═══ */}
        {tab === 'inv' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#44403c' }}>📦 Inventario</h2>
          {/* Agregar producto */}
          <div style={{ ...CARD }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#44403c', marginBottom: 10 }}>+ Agregar / Actualizar producto</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input placeholder="Nombre del producto" value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} style={{ ...INP, flex: 2, minWidth: 140 }} />
              <input placeholder="Stock" type="number" value={newProd.stock} onChange={e => setNewProd(p => ({ ...p, stock: e.target.value }))} style={{ ...INP, width: 70 }} />
              <select value={newProd.unit} onChange={e => setNewProd(p => ({ ...p, unit: e.target.value }))} style={{ ...INP }}>
                {['pza', 'kg', 'lt', 'paq', 'caja', 'bolsa'].map(u => <option key={u}>{u}</option>)}
              </select>
              <button onClick={addInventoryItem} style={BTN('#92400e')}>Guardar</button>
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
                    style={{ ...INP, width: 70, textAlign: 'center', border: `1.5px solid ${isEditing ? '#92400e' : '#e7e0d8'}` }} />
                  <span style={{ color: '#78716c', fontSize: 12 }}>{item.unit}</span>
                  <span style={{ color: stockColor, fontWeight: 800, fontSize: 12 }}>{item.stock <= 0 ? '🔴 Agotado' : item.stock <= 3 ? '🟡 Bajo' : '🟢 OK'}</span>
                  {isEditing && <button onClick={() => patchInventory(item.product_name, stockVal, item.unit)} style={BTN('#92400e', '#fff')}>Guardar</button>}
                </div>
              </div>
            );
          })}
        </>)}

        {/* ═══ TAB: COSTEADOR ═══ */}
        {tab === 'cost' && (<>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#44403c' }}>💰 Costeador de Productos</h2>
          <p style={{ fontSize: 12, color: '#78716c', marginBottom: 14 }}>Calcula el costo real y precio justo de cada producto de tu menú con la fórmula contable completa.</p>

          {/* ── Tooltip helper ── */}
          {showInfo && (
            <div onClick={() => setShowInfo(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, maxWidth: 340, width: '100%' }} onClick={e => e.stopPropagation()}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e', marginBottom: 8 }}>{showInfo.title}</div>
                <div style={{ fontSize: 13, color: '#44403c', lineHeight: 1.6 }}>{showInfo.text}</div>
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#faf0e6', borderRadius: 8, fontSize: 12, color: '#78400e' }}>
                  <b>Ejemplo:</b> {showInfo.ex}
                </div>
                <button onClick={() => setShowInfo(null)} style={{ marginTop: 12, width: '100%', padding: 9, background: '#92400e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Entendido ✓</button>
              </div>
            </div>
          )}

          {/* ── SECCIÓN 1: Materia Prima Directa (MPD) ── */}
          {(() => {
            const INP = { padding: '8px 11px', border: '1.5px solid #e7e0d8', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' };
            const BTN = (bg, col='#fff') => ({ padding: '8px 14px', background: bg, color: col, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' });
            const INFO = (info) => (
              <button onClick={() => setShowInfo(info)} style={{ background: 'none', border: '1.5px solid #d4c9be', color: '#92400e', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 900, cursor: 'pointer', lineHeight: '16px', padding: 0, flexShrink: 0 }}>i</button>
            );
            const SECHEAD = (title, info) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#44403c' }}>{title}</div>
                {INFO(info)}
              </div>
            );
            const CARD = { background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', marginBottom: 14 };

            return (<>
              {/* 1. MPD */}
              <div style={CARD}>
                {SECHEAD('1️⃣ Materia Prima Directa (MPD)', {
                  title: '1. Materia Prima Directa (MPD)',
                  text: 'Son todos los ingredientes o materiales que se incorporan DIRECTAMENTE al producto terminado. Es el costo base de lo que tu producto contiene físicamente.',
                  ex: 'Para una hogaza: harina ($8), mantequilla ($4), sal ($0.50), levadura ($1.20) = MPD $13.70 por hogaza.'
                })}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <input placeholder="Ingrediente (ej. Harina)" value={newIng.name} onChange={e => setNewIng(p => ({ ...p, name: e.target.value }))} style={{ ...INP, flex: 2, minWidth: 100 }} />
                  <input placeholder="Costo $" type="number" value={newIng.cost} onChange={e => setNewIng(p => ({ ...p, cost: e.target.value }))} style={{ ...INP, width: 80 }} />
                  <select value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))} style={{ ...INP }}>
                    {['pz', 'kg', 'g', 'lt', 'ml', 'taza', 'cda'].map(u => <option key={u}>{u}</option>)}
                  </select>
                  <button onClick={() => {
                    if (!newIng.name.trim() || !newIng.cost) return;
                    const next = [...ings.filter(i => i.name !== newIng.name.trim()), { name: newIng.name.trim(), unit: newIng.unit, cost: parseFloat(newIng.cost) }];
                    saveIngs(next); setNewIng({ name: '', unit: 'pz', cost: '' });
                  }} style={BTN('#92400e')}>+ Agregar</button>
                </div>
                {ings.length === 0 && <p style={{ fontSize: 12, color: '#a8a29e' }}>Sin ingredientes aún — agrega los materiales de tu menú.</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ings.map(ing => (
                    <span key={ing.name} style={{ background: '#faf0e6', color: '#92400e', border: '1px solid #e7d5c0', padding: '4px 10px', borderRadius: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <b>{ing.name}</b> — ${ing.cost}/{ing.unit}
                      <span onClick={() => saveIngs(ings.filter(i => i.name !== ing.name))} style={{ cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>×</span>
                    </span>
                  ))}
                </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ fontSize: 12, color: '#78716c', fontWeight: 600 }}>CIF = % de (MPD + MOD)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="range" min={0} max={40} value={cifPct} onChange={e => setCifPct(Number(e.target.value))} style={{ width: 120 }} />
                    <span style={{ fontWeight: 800, color: '#92400e', fontSize: 14 }}>{cifPct}%</span>
                  </div>
                </div>
              </div>

              {/* 4-5-6: Recetas con cálculo completo */}
              <div style={CARD}>
                {SECHEAD('📖 Recetas del Menú', {
                  title: 'Recetas del Menú',
                  text: 'Conecta tus ingredientes (MPD) con cada producto de tu menú especificando cuánto usa de cada ingrediente. El sistema calculará automáticamente los 6 rubros de costo.',
                  ex: 'Hogaza: Harina 500g, Mantequilla 80g, Sal 5g, Levadura 3g → calcula MPD automáticamente.'
                })}
                {(() => {
                  // Productos únicos del menú (extraídos del historial de pedidos)
                  const menuItems = [...new Set(orders.flatMap(o =>
                    (o.items || []).map(it => it.nombre || it.name).filter(Boolean)
                  ))].sort();
                  return menuItems.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <select value={recName} onChange={e => setRecName(e.target.value)} style={{ ...INP, flex: 1 }}>
                        <option value="">-- Selecciona un producto de tu menú --</option>
                        {menuItems.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input placeholder="Nombre del producto (ej. Hogaza Artesanal)" value={recName} onChange={e => setRecName(e.target.value)} style={{ ...INP, flex: 1 }} />
                      <div style={{ fontSize: 11, color: '#a8a29e', alignSelf: 'center', whiteSpace: 'nowrap' }}>Aún sin pedidos</div>
                    </div>
                  );
                })()}
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

                {/* Gastos Operativos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 12, color: '#78716c', fontWeight: 600, whiteSpace: 'nowrap' }}>5️⃣ Gastos Operativos / unidad $</label>
                    {INFO({ title: '5. Costo Total (Gastos Operativos)', text: 'Son los gastos del negocio que NO son de producción pero son necesarios para operar: empaque (bolsas, cajas), entrega, comisiones de plataformas de pago, marketing ligero. Se agregan por unidad vendida.', ex: 'Caja $2.50 + bolsa $1.00 + comisión Stripe 3% aprox = ~$5 de gastos operativos por pedido.' })}
                  </div>
                  <input type="number" step="0.5" value={opEx} onChange={e => setOpEx(Number(e.target.value))} style={{ ...INP, width: 80 }} />
                </div>

                {/* Margen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={{ fontSize: 12, color: '#78716c', fontWeight: 600 }}>6️⃣ Margen de ganancia</label>
                    {INFO({ title: '6. Precio de Venta con Margen', text: 'El margen se aplica SOBRE el costo total. Fórmula: Precio = Costo Total ÷ (1 - Margen%). Un margen del 50% significa que de cada peso que cobras, 50 centavos son ganancia neta.', ex: 'Costo Total $27 con margen 50% → Precio = $27 / (1-0.50) = $54. Tu ganancia = $27.' })}
                  </div>
                  <input type="range" min={20} max={80} value={margin} onChange={e => setMargin(Number(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontWeight: 800, color: '#92400e', fontSize: 14 }}>{margin}%</span>
                </div>

                <button disabled={!recName.trim() || recItems.length === 0} onClick={() => {
                  const rec = { name: recName.trim(), items: recItems };
                  const next = [...recs.filter(r => r.name !== rec.name), rec];
                  saveRecs(next); setRecName(''); setRecItems([]);
                }} style={{ ...BTN('#92400e'), opacity: (!recName.trim() || recItems.length === 0) ? 0.5 : 1 }}>Guardar Receta</button>
              </div>

              {/* Resultados: desglose contable por receta */}
              {recs.length > 0 && recs.map(rec => {
                const mpd     = calcCost(rec);
                const mod     = modRate * modHours / batchUnits;
                const cif     = (mpd + mod) * cifPct / 100;
                const costoProd = mpd + mod + cif;
                const costoTotal = costoProd + opEx;
                const precio   = costoTotal / (1 - margin / 100);
                const ganancia = precio - costoTotal;
                const priceFmt = Math.ceil(precio / 5) * 5;

                return (
                  <div key={rec.name} style={{ ...CARD, border: '1px solid #e7e0d8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: '#1a1208' }}>📊 {rec.name}</span>
                      <span onClick={() => saveRecs(recs.filter(r => r.name !== rec.name))} style={{ cursor: 'pointer', color: '#dc2626', fontSize: 12 }}>eliminar</span>
                    </div>

                    {/* Tabla de fórmula */}
                    <div style={{ fontSize: 12 }}>
                      {[
                        { n: '① MPD', label: 'Materia Prima Directa',         val: mpd,        color: '#1e40af', bg: '#eff6ff' },
                        { n: '② MOD', label: 'Mano de Obra Directa',          val: mod,        color: '#7c3aed', bg: '#f5f3ff' },
                        { n: '③ CIF', label: `CIF (${cifPct}% de MPD+MOD)`,   val: cif,        color: '#0f766e', bg: '#f0fdfa' },
                        { n: '④ CP',  label: 'Costo de Producción (①+②+③)',   val: costoProd,  color: '#b45309', bg: '#fef3c7', bold: true },
                        { n: '⑤ GO',  label: 'Gastos Operativos',              val: opEx,       color: '#9f1239', bg: '#fff1f2' },
                        { n: '⑥ CT',  label: 'Costo Total (④+⑤)',             val: costoTotal, color: '#dc2626', bg: '#fef2f2', bold: true },
                      ].map(row => (
                        <div key={row.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 7, marginBottom: 4, background: row.bg }}>
                          <span style={{ color: row.color, fontWeight: row.bold ? 800 : 600 }}>{row.n} <span style={{ fontWeight: 400, color: '#78716c' }}>{row.label}</span></span>
                          <span style={{ fontWeight: row.bold ? 800 : 700, color: row.color }}>${row.val.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Precio sugerido */}
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: '1.5px solid #86efac' }}>
                        <div style={{ fontSize: 10, color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>💵 Precio Sugerido</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d' }}>${priceFmt}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>redondeado al $5</div>
                      </div>
                      <div style={{ background: '#faf0e6', borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: '1.5px solid #e7d5c0' }}>
                        <div style={{ fontSize: 10, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>📈 Tu Ganancia ({margin}%)</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#92400e' }}>${(priceFmt - costoTotal).toFixed(2)}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>por unidad</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 10, color: '#a8a29e', marginTop: 8 }}>
                      Ingredientes: {rec.items.map(it => `${it.ing} ×${it.qty}`).join(' · ')}
                    </div>

                    {/* Fee GENyx +8% (opcional) */}
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#faf9f7', borderRadius: 10, border: '1.5px solid #e7e0d8', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="checkbox" id={`fee-${rec.name}`} checked={genyxFee} onChange={e => setGenyxFee(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#92400e', cursor: 'pointer', flexShrink: 0 }} />
                      <label htmlFor={`fee-${rec.name}`} style={{ fontSize: 11, color: '#78716c', cursor: 'pointer', lineHeight: 1.4 }}>
                        Agregar comisión GENyx (+8%) al precio de venta
                      </label>
                      {genyxFee && (
                        <span style={{ marginLeft: 'auto', fontWeight: 900, color: '#92400e', fontSize: 16, whiteSpace: 'nowrap' }}>
                          ${Math.ceil(priceFmt * 1.08 / 5) * 5}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>);
          })()} 
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
            <div style={{ fontSize: 12, color: '#78716c', marginBottom: 12 }}>Marca cada documento como entregado a GENyx:</div>
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
            GENyx confirmará cada entrega y actualizará tu expediente.
          </div>
        </>)}

        <p style={{ textAlign: 'center', color: '#c4b5a5', fontSize: 10, marginTop: 20 }}>GENyx OS · {slug} · Actualiza cada 30s</p>
      </main>
    </div>
  );
}

export default function GENyxOperatorDashboard() {
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
  const IS_MANDO   = window.location.hostname.startsWith('mando');
  const path       = window.location.pathname;
  const MANDO_SLUG = IS_MANDO ? (path.split('/').filter(Boolean)[0] || '') : '';

  // ―― Legal pages (mando.genyxsystems.com/terminos · /privacidad) ―――――
  if (path === '/terminos')   return <LegalPage tipo="terminos" />;
  if (path === '/privacidad') return <LegalPage tipo="privacidad" />;

  if (IS_MANDO && MANDO_SLUG) return <MandoClientView slug={MANDO_SLUG} />;
  if (IS_MANDO && !MANDO_SLUG) return (
    <div style={{ minHeight: '100vh', background: '#060912', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
        <h1 style={{ fontSize: 18, color: '#f1f5f9', margin: '0 0 10px' }}>GENyx Systems OS</h1>
        <p style={{ fontSize: 13, color: '#64748b', maxWidth: 320, lineHeight: 1.6 }}>
          Centro de Mando. Por favor ingresa a la URL específica proporcionada por tu administrador.
        </p>
      </div>
    </div>
  );

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
            title="Ir a la landing de GENyx"
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
              <p style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '.03em' }}>GENyx <span style={{ color: '#6366f1' }}>Systems</span> OS</p>
              <p style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>Operator Control Center</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => {
              const active = tenants.filter(t => t.status === 'active');
              if (active.length === 0) { alert('No hay bots activos para suspender.'); return; }
              if (window.confirm(`🚨 BOTÓN DE PÁNICO\n\nSuspender TODOS los bots activos:\n${active.map(t => '• ' + (t.name || t.slug)).join('\n')}\n\n¿Confirmar?`)) {
                active.forEach(t => handleToggleStatus(t.slug, 'active'));
              }
            }}
            title="Suspender TODOS los bots activos de emergencia"
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
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 28px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '12px 18px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', border: 'none', background: 'none', cursor: 'pointer', color: tab === t.id ? '#6366f1' : '#475569', borderBottom: `2px solid ${tab === t.id ? '#6366f1' : 'transparent'}`, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>{t.label}</button>
        ))}
      </nav>

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
        {tab === 'data'         && <TabData          tenants={tenants} orders={orders}  selectedSlug={selectedSlug} />}
        {tab === 'expedientes'  && <TabExpedientes   tenants={tenants} selectedSlug={selectedSlug} />}
        {tab === 'manuales'     && <TabManuales />}
        {tab === 'onboarding'   && <TabOnboarding />}
      </main>
    </div>
  );
}
