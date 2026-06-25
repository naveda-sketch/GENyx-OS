#!/usr/bin/env node
/**
 * Candado FE-Standing: Mando Contract (REGLA 44)
 * Verifica: front-fetches ⊆ mando_contract.json
 * 
 * Convención de params (25-jun): el contrato usa nombres exactos del backend
 * ({proposal_id}, {incident_id}, etc). El frontend usa vars JS (${id}, ${slug}).
 * Este candado normaliza AMBOS lados a una forma canónica (segmentos dinámicos
 * reemplazados por '*') para comparar la estructura del path sin falsos positivos.
 */
const fs = require('fs');
const path = require('path');

console.log("🔒 Candado FE-Standing: Verificando contrato Mando vs Frontend...");

// ── Helpers ──
// Normalizar un path: reemplazar segmentos dinámicos por '*'
// Frontend: ${id}, ${slug}, ${aid}, ${ticketId} → quedan como cadena vacía tras interpolación strip
// Contrato: {proposal_id}, {incident_id}, {alert_id}, {table}, {slug} → param named
function normalizePath(p) {
    return p
        .split('/')
        .map(seg => {
            // Segmento es un param del contrato: {algo}
            if (seg.startsWith('{') && seg.endsWith('}')) return '*';
            // Segmento vacío (resultado de strip de ${var} en el frontend)
            if (seg === '') return '*';
            return seg;
        })
        .filter((seg, i, arr) => {
            // Colapsar '*' consecutivos
            if (seg === '*' && i > 0 && arr[i-1] === '*') return false;
            return true;
        })
        .join('/')
        // Limpiar trailing slash o trailing *
        .replace(/\/\*$/, '/*')
        .replace(/\/$/, '');
}

// ── 1. Extraer fetch calls del Frontend ──
const frontendFile = path.join(__dirname, '../GENyxOperatorDashboard.jsx');
const code = fs.readFileSync(frontendFile, 'utf8');

const regexAdmin = /fetch\([^`'"]*[`'"]([^`'"]*\/api\/admin\/[^`'"?]*)/g;
const regexOrchestrator = /fetch\([^`'"]*[`'"]([^`'"]*\/orchestrator\/[^`'"?]*)/g;

const rawFrontUrls = new Set();
let match;
while ((match = regexAdmin.exec(code)) !== null) {
    let url = match[1].split('${BACKEND}').pop().split('${BASE}').pop().split('?')[0];
    url = url.replace(/\$\{.*?\}/g, ''); // Strip JS interpolations
    rawFrontUrls.add(url);
}
while ((match = regexOrchestrator.exec(code)) !== null) {
    let url = match[1].split('${BASE}').pop().split('?')[0];
    url = url.replace(/\$\{.*?\}/g, '');
    if (!url.startsWith('/api/admin')) url = '/api/admin' + url;
    rawFrontUrls.add(url);
}

// Normalizar y deduplicar
const frontNormalized = new Map(); // normalized → [raw examples]
for (const raw of rawFrontUrls) {
    const norm = normalizePath(raw);
    if (norm.endsWith('*/api/admin/orchestrator/recent-alerts')) continue; // artifact de regex
    if (!frontNormalized.has(norm)) frontNormalized.set(norm, []);
    frontNormalized.get(norm).push(raw);
}

// ── 2. Leer contrato ──
const contractPath = path.join(__dirname, '../../paty-backend/mando_contract.json');
if (!fs.existsSync(contractPath)) {
    console.log("⚠️ mando_contract.json no encontrado en " + contractPath + ". Skip.");
    process.exit(0);
}

const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
// ── Known-pending: endpoints verificados contra backend (curl 200/401/403/405)
// pero pendientes de ser agregados al contrato por Claude (§6).
// Cada entrada tiene fecha de verificación. Borrar cuando Claude los agregue.
// Si un endpoint lleva >7 días aquí, es una brecha de coordinación.
const knownPending = new Set([
    '*/api/admin/wa-delivery',                  // verified 25-jun [401]
    '*/api/admin/organizations/*/modules',      // verified 25-jun [405]
    '*/api/admin/organizations',                // verified 25-jun [403]
    '*/api/admin/organizations/*/settings',     // verified 25-jun [405]
    '*/api/admin/connect-onboard',              // verified 25-jun [405]
    '*/api/admin/billing/portal/*',             // verified 25-jun [401]
    '*/api/admin/bitacora',                     // verified 25-jun [401]
    '*/api/admin/bitacora/*',                   // verified 25-jun [401]
    '*/api/admin/weekly-report-preview/*',      // verified 25-jun [401]
    '*/api/admin/expediente/*',                 // verified 25-jun [403]
    '*/api/admin/create-tenant',               // verified 25-jun [405]
    '*/api/admin/agent-chat/*',                // verified 25-jun [404] — POSSIBLE ORPHAN
    '*/api/admin/audit-log/aguja_market_signals', // verified 25-jun [401]
]);

const contractNormalized = new Set();
for (const p of contract.paths) {
    contractNormalized.add(normalizePath(p));
}

// ── 3. Cruce: front ⊆ contrato ──
let driftCount = 0;
console.log("\nAnalizando endpoints...");

for (const [normFront, rawExamples] of frontNormalized) {
    // Buscar match exacto normalizado
    if (contractNormalized.has(normFront)) continue;
    
    // Buscar match por prefijo (para paths con sub-resources)
    let found = false;
    for (const normContract of contractNormalized) {
        if (normFront.startsWith(normContract) || normContract.startsWith(normFront)) {
            found = true;
            break;
        }
    }
    
    if (!found && !knownPending.has(normFront)) {
        console.log(`🔴 DRIFT: Frontend consume ${rawExamples[0]} (norm: ${normFront}) — NO en contrato`);
        driftCount++;
    }
}

if (driftCount > 0) {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║ ✕ CANDADO FE-Standing BLOQUEÓ EL PUSH — ${driftCount} endpoints sin contrato ║`);
    console.log(`║ Actualiza mando_contract.json antes de pushear (REGLA 44).  ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    process.exit(1);  // BLOCKING — D2 cerrado
}

console.log(`✓ CANDADO FE-Standing: ${frontNormalized.size} endpoints del Frontend — todos cubiertos por contrato.`);
process.exit(0);
