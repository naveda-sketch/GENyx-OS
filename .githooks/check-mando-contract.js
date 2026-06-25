#!/usr/bin/env node
/**
 * Candado FE-Standing: Mando Contract
 * Verifica que todos los fetch() hacia /api/admin en el frontend
 * esten listados en el mando_contract.json del backend.
 */
const fs = require('fs');
const path = require('path');

console.log("🔒 Candado FE-Standing: Verificando contrato Mando vs Frontend...");

// 1. Extraer fetch calls del Frontend
const frontendFile = path.join(__dirname, '../GENyxOperatorDashboard.jsx');
const code = fs.readFileSync(frontendFile, 'utf8');

const regexAdmin = /fetch\([^`'"]*[`'"]([^`'"]*\/api\/admin\/[^`'"?]*)/g;
const regexOrchestrator = /fetch\([^`'"]*[`'"]([^`'"]*\/orchestrator\/[^`'"?]*)/g;

const fetchUrls = new Set();
let match;
while ((match = regexAdmin.exec(code)) !== null) {
    let url = match[1].split('${BACKEND}').pop().split('${BASE}').pop().split('?')[0];
    url = url.replace(/\$\{.*?\}/g, ''); // Remover vars interpoladas para la validacion base
    fetchUrls.add(url);
}
while ((match = regexOrchestrator.exec(code)) !== null) {
    let url = match[1].split('${BASE}').pop().split('?')[0];
    url = url.replace(/\$\{.*?\}/g, '');
    if (!url.startsWith('/api/admin')) url = '/api/admin' + url;
    fetchUrls.add(url);
}

const cleanedFront = new Set();
for (let url of fetchUrls) {
    url = url.replace(/\/\{.*?\}/g, '/{var}/').replace(/\/\{.*\}$/, '/{var}');
    if (url.endsWith('{var}/api/admin/orchestrator/recent-alerts')) continue;
    cleanedFront.add(url);
}

// 2. Leer contrato (cruzando el repo, asumiendo estructura adyacente)
const contractPath = path.join(__dirname, '../../paty-backend/mando_contract.json');
if (!fs.existsSync(contractPath)) {
    console.log("⚠️ No se encontro mando_contract.json en " + contractPath + ". Skip cross-repo check.");
    process.exit(0);
}

const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const contractPaths = new Set(contract.paths);

let drift = false;
console.log("\nAnalizando endpoints...");

// Verificar huérfanos del frontend (lo que el front llama pero no esta en el contrato)
// El contrato deberia contener versiones limpias de las rutas. Para hacerlo facil:
// El contrato deberia listar exactamente lo que el front pide o viceversa.
for (const ep of cleanedFront) {
    // Buscar si ep hace match con algun path del contrato
    // Si el front pide /api/admin/agents/, el contrato puede decir /api/admin/agents/{slug}
    // Una logica simple es buscar prefijos
    let matchFound = false;
    for (const cPath of contractPaths) {
        let baseCPath = cPath.replace(/\{.*?\}/g, '');
        let baseEp = ep.replace(/\{.*?\}/g, '').replace(/\/$/, '');
        if (baseCPath === baseEp || baseEp.startsWith(baseCPath) || cPath.startsWith(baseEp)) {
            matchFound = true;
            break;
        }
    }
    
    if (!matchFound) {
        console.log(`🔴 DRIFT DETECTADO: El frontend consume ${ep} pero no esta en mando_contract.json`);
        drift = true;
    }
}

if (drift) {
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║ ✕ CANDADO DE CONTRATO BLOQUEO EL COMMIT                      ║");
    console.log("║ Actualiza mando_contract.json en paty-backend para reflejar  ║");
    console.log("║ las nuevas llamadas del frontend y asegurar soporte backend. ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    process.exit(1);
}

console.log("✓ Todos los endpoints del Frontend estan cubiertos por el Contrato.");
process.exit(0);

