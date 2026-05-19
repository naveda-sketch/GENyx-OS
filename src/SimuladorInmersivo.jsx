import React from 'react';

const SIM_AGENTS = [
  { id:'A1', name:'Marketing', role:'Contenido' },
  { id:'A2', name:'Captación', role:'Prospección' },
  { id:'A3', name:'Ventas', role:'Atención' },
  { id:'A4', name:'Cierre', role:'Pagos' },
  { id:'A5', name:'Entrega', role:'Logística' },
  { id:'A6', name:'Seguimiento', role:'Retención' },
  { id:'A7', name:'Analítica', role:'KPIs' },
  { id:'A8', name:'Finanzas', role:'Márgenes' },
  { id:'CEO', name:'CEO Digital', role:'Briefings' },
];

const SCENARIO = [
  { trigger:/hola|hey|buenas|buenos/i,
    bot:'¡Hola! 👋 Bienvenido a tu negocio. ¿Qué te gustaría ordenar hoy? Tenemos nuestro menú completo disponible. 🛒',
    agents:['A3'], logs:[{m:'A3 Ventas: sesión iniciada',c:'#4ade80'},{m:'A7 Analítica: nueva sesión',c:'#818cf8'}], delay:1200 },
  { trigger:/menu|que tienen|productos|catalogo|catálogo|ver/i,
    bot:'📋 Productos disponibles:\n\n🥐 Producto A — $25\n🍞 Producto B — $120\n🍕 Producto C — $180\n🍪 Producto D (2 pzas) — $40\n☕ Producto E — $35\n\n¿Qué se te antoja? 😊',
    agents:['A3','A7'], logs:[{m:'A3 Ventas: catálogo presentado (5 productos)',c:'#4ade80'},{m:'A7 Analítica: consulta registrada',c:'#818cf8'}], delay:1500 },
  { trigger:/producto|quiero|dame|ordenar|pedir|2|uno|una/i,
    bot:'¡Excelente elección! 🎉 Tu pedido:\n\n🥐 2 × Producto A — $50\n☕ 1 × Producto E — $35\n\n💰 Total: $85\n\n¿Confirmamos? Te envío el link de pago 💳',
    agents:['A3','A4','A7','A8'], logs:[{m:'A3 Ventas: orden — 2 items, $85',c:'#4ade80'},{m:'A4 Cierre: preparando link de pago',c:'#6366f1'},{m:'A7 Analítica: ticket → $85',c:'#818cf8'},{m:'A8 Finanzas: margen 62.3%',c:'#f59e0b'}], metrics:{orders:1,revenue:85}, delay:1800 },
  { trigger:/si|sí|confirmo|confirmar|pago|dale|ok/i,
    bot:'✅ ¡Pedido confirmado!\n\n💳 Link de pago generado.\n\nUna vez que pagues, te confirmo la hora de entrega. ¡Gracias! 🙌',
    agents:['A4','A5','A6','A7','A8','CEO'], logs:[{m:'A4 Cierre: link generado',c:'#4ade80'},{m:'A5 Entrega: en cola de preparación',c:'#6366f1'},{m:'A6 Seguimiento: followup 24h',c:'#818cf8'},{m:'A8 Finanzas: revenue $85 en P&L',c:'#f59e0b'},{m:'CEO Digital: briefing actualizado',c:'#4ade80'},{m:'A7 Analítica: patrón horario pico',c:'#818cf8'}], metrics:{patterns:3}, delay:2200 },
  { trigger:/.*/,
    bot:'Gracias por probar el simulador. 😊 En producción, GenyX maneja todo esto en automático — 24/7.\n\n¿Te gustaría una demo para tu negocio?',
    agents:['A3','A1','A2','CEO'], logs:[{m:'A1 Marketing: oportunidad de demo',c:'#4ade80'},{m:'A2 Captación: lead calificado',c:'#6366f1'},{m:'CEO Digital: lead caliente',c:'#f59e0b'}], delay:1500 },
];

export default function SimuladorInmersivo() {
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

    // Activate agents with stagger
    const newProc = new Set(step.agents);
    setProcessingAgents(newProc);
    setTimeout(() => {
      setProcessingAgents(new Set());
      setActiveAgents(prev => { const n = new Set(prev); step.agents.forEach(a => n.add(a)); return n; });
    }, 1200);

    // Bot reply
    setTimeout(() => {
      setTyping(false);
      setMessages(p => [...p, { text:step.bot, type:'in', time:getTime() }]);
      // Logs
      step.logs.forEach((l, i) => {
        setTimeout(() => setLogs(p => [{ ...l, time:getTime() }, ...p].slice(0, 12)), i * 300);
      });
      // Metrics
      if (step.metrics) {
        setMetrics(prev => ({
          orders: prev.orders + (step.metrics.orders||0),
          revenue: prev.revenue + (step.metrics.revenue||0),
          agents: prev.agents,
          patterns: prev.patterns + (step.metrics.patterns||0),
        }));
      }
      setDisabled(false);
    }, step.delay);
  };

  // Update agent count metric
  React.useEffect(() => {
    setMetrics(prev => ({ ...prev, agents: activeAgents.size }));
  }, [activeAgents]);

  // Auto-scroll chat
  React.useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, typing]);

  const S = {
    section: { position:'relative', padding:'80px 24px', maxWidth:1300, margin:'0 auto' },
    label: { fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:'#818cf8', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12, textAlign:'center' },
    title: { fontFamily:"'Inter',sans-serif", fontSize:36, fontWeight:900, color:'#f1f5f9', marginBottom:10, letterSpacing:'-1px', lineHeight:1.15, textAlign:'center' },
    grad: { background:'linear-gradient(135deg,#6366f1,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
    sub: { fontFamily:"'Inter',sans-serif", color:'#94a3b8', fontSize:15, maxWidth:560, margin:'0 auto 48px', textAlign:'center' },
    grid: { display:'grid', gridTemplateColumns:'400px 1fr', gap:24, minHeight:680 },
    // WA
    wa: { background:'#111b21', borderRadius:16, border:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.4)' },
    waHdr: { display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#1f2c34', borderBottom:'1px solid rgba(255,255,255,0.06)' },
    waAv: { width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#312e81,#6366f1,#818cf8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', fontWeight:700, color:'white' },
    waChat: { flex:1, padding:16, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 },
    waBar: { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#1f2c34', borderTop:'1px solid rgba(255,255,255,0.06)' },
    waInp: { flex:1, background:'#2a3942', border:'none', borderRadius:20, padding:'10px 16px', color:'#e9edef', fontSize:'0.875rem', fontFamily:"'Inter',sans-serif", outline:'none' },
    waBtn: { width:40, height:40, borderRadius:'50%', background:'#25D366', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'1.1rem' },
    // Dashboard
    dash: { background:'rgba(15,20,35,0.7)', borderRadius:16, border:'1px solid rgba(99,102,241,0.12)', backdropFilter:'blur(12px)', display:'flex', flexDirection:'column', overflow:'hidden' },
    dashHdr: { padding:'16px 24px', borderBottom:'1px solid rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'space-between' },
    agGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, padding:20, flex:1 },
    mBar: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'rgba(99,102,241,0.12)', borderTop:'1px solid rgba(99,102,241,0.12)' },
    mItem: { background:'rgba(6,9,18,0.8)', padding:'14px 16px', textAlign:'center' },
    mVal: { fontSize:'1.3rem', fontWeight:800, background:'linear-gradient(135deg,#6366f1,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
    mLbl: { fontSize:'0.65rem', color:'#475569', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:2 },
    logWrap: { padding:'16px 20px', borderTop:'1px solid rgba(99,102,241,0.12)', maxHeight:140, overflowY:'auto' },
  };

  const msgStyle = (type) => ({
    alignSelf: type === 'out' ? 'flex-end' : 'flex-start',
    background: type === 'out' ? '#005c4b' : '#202c33',
    color: '#e9edef', padding:'8px 12px', borderRadius:8,
    borderBottomRightRadius: type === 'out' ? 2 : 8,
    borderBottomLeftRadius: type === 'in' ? 2 : 8,
    maxWidth:'85%', fontSize:'0.875rem', lineHeight:1.45,
    whiteSpace:'pre-line', animation:'simFadeUp .3s ease',
  });

  const agentCard = (ag) => {
    const active = activeAgents.has(ag.id);
    const proc = processingAgents.has(ag.id);
    return (
      <div key={ag.id} style={{
        background: active ? 'rgba(99,102,241,0.06)' : proc ? 'rgba(129,140,248,0.08)' : 'rgba(6,9,18,0.6)',
        border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : proc ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.04)'}`,
        borderRadius:12, padding:14, display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        transition:'all .4s cubic-bezier(.4,0,.2,1)',
        animation: proc ? 'simAgentPulse 1.5s infinite' : 'none',
      }}>
        <div style={{
          width:42, height:42, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'0.75rem', fontWeight:800,
          background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : proc ? 'linear-gradient(135deg,#818cf8,#c084fc)' : 'rgba(255,255,255,0.05)',
          border: `2px solid ${active || proc ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
          color: active || proc ? 'white' : '#475569',
          boxShadow: active ? '0 0 30px rgba(99,102,241,0.3)' : proc ? '0 0 30px rgba(129,140,248,0.3)' : 'none',
          transition:'all .4s',
        }}>{ag.id}</div>
        <div style={{ fontSize:'0.7rem', fontWeight:600, color: active||proc ? '#f1f5f9' : '#475569', textAlign:'center', transition:'color .3s' }}>{ag.name}</div>
        <div style={{ fontSize:'0.6rem', color: active ? '#818cf8' : '#475569', textAlign:'center', opacity: active ? 1 : 0.7 }}>{ag.role}</div>
      </div>
    );
  };

  return (
    <section style={S.section} id="simulador-inmersivo">
      <div style={S.label}>SIMULADOR EN VIVO</div>
      <h2 style={S.title}>Escribe un mensaje y observa<br/><span style={S.grad}>cómo operan tus 8 agentes + tu CEO Digital.</span></h2>
      <p style={S.sub}>Esta es una simulación real de lo que GenyX hace con tu negocio. Cada mensaje activa agentes que procesan, ejecutan y generan tu briefing — en automático.</p>

      <div style={S.grid}>
        {/* WA Panel */}
        <div style={S.wa}>
          <div style={S.waHdr}>
            <div style={S.waAv}>G</div>
            <div><div style={{ fontSize:'0.95rem', fontWeight:600, color:'#e9edef' }}>Tu Negocio</div><span style={{ fontSize:'0.75rem', color:'#4ade80' }}>● en línea</span></div>
          </div>
          <div ref={chatRef} style={S.waChat}>
            {messages.map((m, i) => (
              <div key={i} style={msgStyle(m.type)}>
                <span dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g,'<br>').replace(/\*(.*?)\*/g,'<strong>$1</strong>') }} />
                <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.45)', textAlign:'right', marginTop:3 }}>{m.time}</div>
              </div>
            ))}
            {typing && <div style={{ alignSelf:'flex-start', background:'#202c33', padding:'10px 16px', borderRadius:8, display:'flex', gap:4 }}>
              {[0,1,2].map(i => <span key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#8696a0', display:'inline-block', animation:`simTyping 1.4s ${i*0.2}s infinite` }} />)}
            </div>}
          </div>
          <div style={S.waBar}>
            <input style={S.waInp} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') processMessage(input); }}
              placeholder={messages.length === 0 ? 'Escribe "Hola" para comenzar...' : 'Escribe un mensaje...'}
              disabled={disabled} />
            <button style={S.waBtn} onClick={() => processMessage(input)} disabled={disabled}>➤</button>
          </div>
        </div>

        {/* Dashboard Panel */}
        <div style={S.dash}>
          <div style={S.dashHdr}>
            <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#f1f5f9', margin:0 }}>⚡ Centro de Operaciones</h2>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.75rem', color:'#4ade80', fontWeight:500 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', display:'inline-block', animation:'simPulse 2s infinite' }} />
              Sistema activo
            </div>
          </div>
          <div style={S.agGrid}>{SIM_AGENTS.map(agentCard)}</div>
          <div style={S.mBar}>
            {[['orders','Pedidos'],['revenue','Revenue'],['agents','Agentes activos'],['patterns','Patrones']].map(([k,l]) => (
              <div key={k} style={S.mItem}>
                <div style={S.mVal}>{k==='revenue' ? `$${metrics[k].toLocaleString()}` : k==='agents' ? `${metrics[k]}/9` : metrics[k]}</div>
                <div style={S.mLbl}>{l}</div>
              </div>
            ))}
          </div>
          <div style={S.logWrap}>
            <h4 style={{ fontSize:'0.7rem', color:'#475569', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8, marginTop:0 }}>Actividad en vivo</h4>
            {logs.map((l, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', fontSize:'0.75rem', color:'#94a3b8', animation:'simFadeUp .3s ease' }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:l.c, flexShrink:0 }} />
                <span>{l.m}</span>
                <span style={{ color:'#475569', fontSize:'0.65rem', marginLeft:'auto' }}>{l.time}</span>
              </div>
            ))}
            {logs.length === 0 && <div style={{ fontSize:'0.75rem', color:'#475569' }}>Esperando primera interacción...</div>}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes simFadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes simPulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes simTyping { 0%,60%,100% { transform:translateY(0) } 30% { transform:translateY(-5px) } }
        @keyframes simAgentPulse { 0%,100% { box-shadow:0 0 0 0 rgba(99,102,241,0) } 50% { box-shadow:0 0 0 6px rgba(99,102,241,0.1) } }
        @media (max-width:1024px) { .sim-grid-resp { grid-template-columns:1fr !important; max-width:500px !important; margin:0 auto !important; } }
      `}</style>
    </section>
  );
}
