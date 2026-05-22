# CLAUDE.md — Doctrina Operativa GenyX (lectura obligatoria al iniciar sesión)

> Claude Code y Antigravity cargan este archivo automáticamente al abrir
> el repo. Es la condición de operación para cualquier agente que trabaje
> dentro de swift-viking.
>
> **Si no cumples esta doctrina, tu trabajo NO entra a main.**

---

## 1. Filosofía maestra

```
1000 candados técnicos > 1000 reglas escritas
```

Toda regla doctrinal busca materializarse como enforcement técnico
(hooks, triggers, tests, audits). Si una regla solo vive como palabra, es
frágil.

**Antes de cada acción de código, mira esta lista. Antes de cada commit,
cita la regla aplicada (Candado #7 lo enforce).**

---

## 2. Reglas obligatorias (a 22-may-2026)

| # | Regla | Enforcement |
|---|-------|-------------|
| **1** | Verificación contra código (no presunciones) | Manual + reportes incluyen commit hashes |
| **4** | Aprobación explícita del fundador para push | Candado #1 pre-push |
| **6** | Audit logs INSERT-only | Triggers no-update/no-delete en tablas críticas |
| **11** | Agnóstico (industria/canal/LLM) — sin PyME/SMB/starter/growth/autonomy/Director General | Candado #3 check-agnostic |
| **12** | Cero secrets en chat/logs/docs | Candado #2 gitleaks |
| **13** | Trazabilidad SHA256 tripartita (cláusula 7b) | marketing_approvals_log + 3 hashes |
| **14** | Razonamiento metodológico explícito | Candado #7 commit-msg + comentarios inline |
| **15** | Anti-recurrence Pattern Sweep | Candado #8 + bug_pattern_sweep.py |

**Planes oficiales:** `esencial` ($9,900) · `profesional` ($18,900) · `enterprise` ($34,900) — MXN/mes.

---

## 3. Candados activos

| # | Candado | Bypass |
|---|---------|--------|
| **#1** | Pre-push co-author Claude | `GENYX_PUSH_APPROVED=1` |
| **#2** | Pre-commit gitleaks | `SKIP_GITLEAKS=1` |
| **#3** | Check-agnostic REGLA 11 | `GENYX_AGNOSTIC_OVERRIDE=1` |
| **#7** | Doctrina-first commit verification | `GENYX_NO_DOCTRINA=1` |
| **#8** | Bug pattern sweep | (sin bypass — audit only) |

---

## 4. Repo: swift-viking (frontend)

**Stack:** Vite + React (SPA monolito `GENyxOperatorDashboard.jsx`)
**Deploy:** Vercel (auto-deploy on push to main)
**Build:** `npm run build` — must pass with 0 errors before commit

### Qué contiene este repo

| Área | Descripción |
|------|-------------|
| **Mando** | Centro de control del tenant (`mando.genyxsystems.com/{slug}`) |
| **Web pública** | Landing, manifesto AOaaS, whitepaper, blog |
| **FotoLab** | Editor de imágenes IA con presets + selectores opcionales |
| **Legal UI** | Banner cláusula 7b, modal re-aceptación, T&C |

### Qué NO contiene (territorio Claude — paty-backend)

- Endpoints FastAPI
- Base de datos SQLite
- Lógica de agentes IA
- Migrations de schema

Si una tarea cruza al backend → entregar frontend + reportar al fundador
qué falta del lado paty-backend.

---

## 5. Workflow obligatorio antes de cada acción

```
┌──────────────────────────────────────────────────────────────┐
│ 1. CONSULTAR DOCTRINA                                         │
│    ¿Qué reglas/candados aplican a esta tarea?                 │
│                                                                │
│ 2. VERIFICAR CONTRA CÓDIGO (REGLA 1)                          │
│    Antes de afirmar X, citar commit hash + path:línea         │
│                                                                │
│ 3. ELEGIR PATTERN ARQUITECTURAL                               │
│    (ver §6) — declarar METODOLOGÍA en comentario              │
│                                                                │
│ 4. IMPLEMENTAR RESPETANDO REGLA 11                            │
│    Sin PyME/SMB/starter/growth/etc. en código nuevo           │
│    Candado #3 bloquea commit si detecta violaciones           │
│                                                                │
│ 5. BUILD (npm run build) DEBE PASAR                           │
│    0 errors antes de commit                                    │
│                                                                │
│ 6. SI ES CIERRE DE BUG → REGLA 15 SWEEP                       │
│    Buscar mismo pattern en todo el codebase                    │
│                                                                │
│ 7. COMMIT CON REFERENCIA DOCTRINAL                            │
│    Candado #7 valida que cite REGLA/METODOLOGÍA/Pattern       │
│                                                                │
│ 8. ESPERAR LUZ VERDE EXPLÍCITA DEL FUNDADOR ANTES DE PUSH     │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Patterns arquitecturales canónicos

### Default + Override
6 presets one-click + selectores opcionales que sobreescriben defaults.
Ejemplo: FotoLab Hybrid (presets + 3 dropdowns ángulo/superficie/iluminación).

### LogoFallback (Graceful Degradation)
Cuando un recurso falta (logo_url=null), renderizar fallback con initial
letter del business_name en brand color gradient. NUNCA mostrar broken image.

### Silent Failure Elimination
Cada fetch debe manejar: timeout (AbortController), non-200 (error state),
network error (.catch con state update). NUNCA dejar un estado en "cargando"
eternamente.

### Diagnostic State Machine
Para debugging en producción: indicadores visibles que muestran el estado
exacto de cada fetch (cargando / error / success). Removibles post-fix.

### Source of Truth Priority
Todo dato dinámico del tenant viene del backend via `/api/public/tenants/{slug}/config`.
NUNCA hardcodear datos de un tenant específico.

### Positive Framing
Comunicar lo que GenyX ES y HACE. Sin comparativos negativos, sin lenguaje
de oposición, sin lenguaje de miedo. Afirmaciones directas.

### Backstage Invisible
A0/A9/A10 son backstage — NUNCA visibles al cliente final.
Solo A1-A8 + A11 (Dirección Ejecutiva) son tenant-facing.

---

## 7. Lo que NO está permitido (sin excepción)

- Pushear sin luz verde explícita del fundador
- Usar palabras prohibidas REGLA 11 en código nuevo (PyME, SMB, etc.)
- Pegar secrets en commit/chat/docs
- Tocar paty-backend, Render Shell, Stripe
- Hardcodear datos de un tenant (nombres, slugs, URLs)
- Bypass de candados sin documentar la razón en commit
- Dejar fetch sin manejo de error (silent failure)

---

## 8. Documentos canónicos de referencia

| Doc | Contenido |
|-----|-----------|
| `CEREBRO_GENYX/DOCTRINA_PROTOCOL_ANTIGRAVITY.md` | Protocolo completo para Antigravity |
| `CEREBRO_GENYX/AGENDA_ANTIGRAVITY_22_MAY_2026.md` | Tareas priorizadas P1-P5 |
| `CEREBRO_GENYX/PENDIENTES_MASTER.md` | Tareas vigentes consolidadas |
| `CEREBRO_GENYX/DOCTRINA_TECNICA.md` | Reglas + decretos + cuadernos |

---

*CLAUDE.md v1.0 · 22-may-2026 · swift-viking · GenyX Systems*

*"Cero atajos. Cero supuestos. Profesional siempre."*

---

## Addendum 1 — Mejora REGLA 1 (decreto fundador 22-may-2026 09:42)

### Verificación histórica obligatoria antes de afirmar ausencia

Cuando Antigravity afirma "X no existe" o "ninguna migración hace Y",
la verificación contra código actual (`grep`) es **insuficiente**.

**Protocolo correcto:**

```bash
# 1. Verificar en código actual
grep -n "legal_doc_versions" main.py

# 2. Verificar en historial git (OBLIGATORIO si resultado es 0)
git log -p -- main.py | grep -B5 -A5 "legal_doc_versions"
git log -p -- migrations.py | grep -B5 -A5 "legal_doc_versions"

# 3. Solo ENTONCES afirmar ausencia con evidencia dual
```

**Razón:** el código pudo haber existido y ser borrado en un refactor,
o vivir en un archivo diferente al esperado. `grep` solo ve el presente.
`git log -p` ve toda la historia.

### Bootstrap Pattern > Migration nueva

Para tablas de infraestructura (audit, legal, config), el patrón correcto
es **bootstrap** (idempotente, corre al startup), NO migration nueva.

```
✅ Bootstrap Pattern: _bootstrap_legal_tables() al inicio
❌ Migration V56: crea tabla una sola vez, no self-heals
```

El bootstrap pattern ya está validado por Candado #4 (Migration Silent
Failure Detection) y es la forma canónica de garantizar precondiciones
de schema.

---
