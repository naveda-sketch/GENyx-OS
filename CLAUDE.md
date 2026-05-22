# CLAUDE.md — Doctrina Operativa GenyX (lectura obligatoria al iniciar sesión)

> Claude Code y Antigravity cargan este archivo automáticamente al abrir
> el repo. Es la condición de operación para cualquier agente que trabaje
> dentro de swift-viking.
>
> **Si no cumples esta doctrina, tu trabajo NO entra a main.**
>
> Fuente de verdad: `CEREBRO_GENYX/DOCTRINA_PROTOCOL_ANTIGRAVITY.md`.
> Si hay conflicto entre este archivo y la doctrina, **la doctrina gana**.

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

## 2. Reglas obligatorias — Catálogo completo (14 vigentes)

Fuente de verdad: `CEREBRO_GENYX/DOCTRINA_TECNICA.md`. Si hay conflicto,
ese archivo gana. **Si una regla no aparece aquí, sigue siendo obligatoria
si está en DOCTRINA_TECNICA.md.**

| # | Regla | Resumen aplicable a Antigravity |
|---|-------|---------------------------------|
| **REGLA 1** | Verificar contra código | Antes de afirmar X, cita commit hash + path:línea. Si código y docs contradicen, **código gana**. Incluye `git log -p` para verificar historia (Addendum 1). |
| **REGLA 2** | La opción más profesional gana | No fix rápido cuando refactor es viable. Trade-offs explícitos. Bootstrap Pattern > Migration nueva. |
| **REGLA 3** | Auditoría de patrón cuando se caza un bug | Cuando cierres un bug, `bug_pattern_sweep.py` antes de mergear (Candado #8). |
| **REGLA 4** | Push solo con luz verde explícita | Esperar "luz verde", "push", "OK push", "go" del fundador. Candado #1 enforces. |
| **REGLA 5** | Doctrinas se aplican retroactivamente | Si decretamos una regla nueva, las deudas existentes se ajustan al patrón nuevo. |
| **REGLA 6** | A2F por tier + audit log INSERT-only | Marketing, legal, finanzas → A2F obligatorio + audit. Triggers no-update/no-delete. |
| **REGLA 7** | Publicaciones pasan filtros independientes (A9) | Cualquier output al canal real pasa por A9 (5 filtros). Frontend muestra A9 verdict. |
| **REGLA 8** | A9 se auto-actualiza con periodicidad | platform_policies + cron updates. Frontend muestra última actualización. |
| **REGLA 9** | Manual de operaciones para TODOS los agentes (12 cuadernos) | Si tocas UI de un agente, revisar `CEREBRO_GENYX/DOCTRINA_AGENTE_AN.md`. |
| **REGLA 10** | Federación de inteligencia por scope | Datos cross-tenant solo via federation_audit_log + scope explícito. |
| **REGLA 11** | Agnóstico por diseño | Sin PyME/SMB/starter/growth/autonomy/industrias-hardcoded/Director General. Candado #3 enforces. |
| **REGLA 12** | Cero secrets en chat/logs/docs | Sin API keys/tokens/passwords en código o commit. Candado #2 enforces. |
| **REGLA 13** | Trazabilidad SHA256 tripartita + cláusula 7b | Hashes original/approved/published. Frontend muestra los 3. |
| **REGLA 14** | Razonamiento metodológico explícito | Cada commit cita "METODOLOGÍA (REGLA 14): Pattern Name". Candado #7 enforces. |

> Candado #9 (Doctrine Coverage Check) verifica que TODAS las reglas
> aparezcan citadas aquí. Si Antigravity agrega un nuevo doc canónico
> en swift-viking, debe replicar esta tabla completa.

**Planes oficiales canónicos:** `esencial` · `profesional` · `enterprise`

**Lenguaje prohibido en código y copy:**
- `PyME`, `pyme`, `SMB`, `small business`, `empresa(s) chica|pequeña`
- `para empresas con N empleados`, `sin GenyX`, `reemplaza humanos`
- Plan names viejos: `STARTER`, `GROWTH`, `AUTONOMY`
- `Director General` (renombrado a Arquitecto en A0)

---

## 3. Candados activos (8 vigentes + 1 descartado)

| # | Candado | Materializa | Enforcement | Bypass |
|---|---------|-------------|-------------|--------|
| **#1** | Pre-push co-author Claude | REGLA 4 | `.githooks/pre-push` | `GENYX_PUSH_APPROVED=1` |
| **#2** | Pre-commit gitleaks | REGLA 12 | `.githooks/pre-commit` | `SKIP_GITLEAKS=1` |
| **#3** | Check-agnostic | REGLA 11 | `.githooks/check-agnostic` regex | `GENYX_AGNOSTIC_OVERRIDE=1` |
| **#4** | Migration Silent Failure | Verificación schema vs código | `schema_migration_audit` + raise | `GENYX_MIGRATION_STRICT=0` |
| **#5** | Endpoint Scope Leak Detection | REGLA 4 + REGLA 6 | `endpoint_scope_audit.py` CLI | (sin bypass) |
| **#6** | ~~Refactor-First~~ | — | **DESCARTADO** — regla escrita disfrazada de candado | — |
| **#7** | Doctrina-First Commit | REGLA 14 | `.githooks/commit-msg` requiere ref doctrinal | `GENYX_NO_DOCTRINA=1` |
| **#8** | Bug Pattern Sweep | REGLA 3 | `bug_pattern_sweep.py` + `bug_pattern_sweep_log` | (sin bypass) |
| **#9** | Doctrine Coverage Check | Meta-candado | `doctrine_coverage_check.py` + audit log | `GENYX_DOCTRINE_COVERAGE_SKIP=1` |

**Bypass = consciente y documentado.** Si usas un bypass, explícalo en
commit message + referencia el motivo.

---

## 4. Repo: swift-viking (frontend)

**Stack:** Vite + React (SPA monolito `GENyxOperatorDashboard.jsx`)
**Deploy:** Vercel (auto-deploy on push to main)
**Build:** `npm run build` — must pass with 0 errors before commit

### División de territorios

| Repo | Owner | Antigravity puede |
|------|-------|-------------------|
| **swift-viking** (frontend, mando, web) | Antigravity | ✅ Todo |
| **paty-backend** (FastAPI, SQLite, agentes) | Claude | ❌ NO tocar |
| **Stripe Dashboard** | Fundador | ❌ NO acceso |
| **Render Shell + DB producción** | Fundador | ❌ NO acceso |

Si una tarea cruza repos, Antigravity entrega lo suyo y reporta al fundador
qué falta del lado backend para que Claude lo atienda.

### Qué contiene este repo

| Área | Descripción |
|------|-------------|
| **Mando** | Centro de control del tenant (`mando.genyxsystems.com/{slug}`) |
| **Web pública** | Landing, manifesto AOaaS, whitepaper, blog |
| **FotoLab** | Editor de imágenes IA con presets + selectores opcionales |
| **Legal UI** | Banner cláusula 7b, modal re-aceptación, T&C |

---

## 5. Workflow obligatorio antes de cada acción

```
┌──────────────────────────────────────────────────────────────┐
│ 1. CONSULTAR DOCTRINA                                         │
│    ¿Qué reglas/candados aplican a esta tarea?                 │
│                                                                │
│ 2. VERIFICAR CONTRA CÓDIGO (REGLA 1)                          │
│    Antes de afirmar X, citar commit hash + path:línea         │
│    + git log -p para verificar historia (Addendum 1)          │
│                                                                │
│ 3. ELEGIR PATTERN ARQUITECTURAL                               │
│    (ver §7) — declarar METODOLOGÍA en comentario              │
│                                                                │
│ 4. OPCIÓN MÁS PROFESIONAL (REGLA 2)                          │
│    Bootstrap Pattern > Migration nueva                         │
│    Refactor profesional > fix rápido                           │
│                                                                │
│ 5. IMPLEMENTAR RESPETANDO REGLA 11                            │
│    Sin PyME/SMB/starter/growth/etc. en código nuevo           │
│    Candado #3 bloquea commit si detecta violaciones           │
│                                                                │
│ 6. BUILD (npm run build) DEBE PASAR                           │
│    0 errors antes de commit                                    │
│                                                                │
│ 7. SI ES CIERRE DE BUG → REGLA 3 SWEEP                        │
│    Buscar mismo pattern en todo el codebase (Candado #8)      │
│                                                                │
│ 8. COMMIT CON REFERENCIA DOCTRINAL                            │
│    Candado #7 valida que cite REGLA/METODOLOGÍA/Pattern       │
│                                                                │
│ 9. ESPERAR LUZ VERDE EXPLÍCITA DEL FUNDADOR ANTES DE PUSH     │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Positive framing + Backstage invisible

**Positive framing:** GenyX comunica lo que ES y HACE, no lo que falta.
- ✅ "Tu operación comercial autónoma"
- ✅ "9 agentes AOaaS activos en tu plan"
- ❌ "Sin GenyX, perderías estos pedidos"

**Backstage invisible:** A0/A9/A10 son backstage — NUNCA visibles al
cliente. Solo A1-A8 + A11 (Dirección Ejecutiva) son tenant-facing.

---

## 7. Patterns arquitecturales canónicos

### Source of Truth Priority
Columna canónica gana sobre derivada legacy. `plan_required` >
`plan_monthly_fee`. Implementado en `_resolve_plan_tier(row)`.

### Bootstrap Pattern
Garantizar precondiciones de schema ANTES del loop normal.
`_bootstrap_audit_table` antes de `run_migrations`. Siempre preferir
bootstrap (idempotente, self-healing) sobre migration nueva.

### Default + Override
6 presets one-click + selectores opcionales que sobreescriben defaults.
Ejemplo: FotoLab Hybrid.

### Silent Failure Elimination
Cada fetch debe manejar: timeout (AbortController), non-200 (error state),
network error (.catch con state update). NUNCA dejar estado en "cargando"
eternamente.

### LogoFallback (Graceful Degradation)
Cuando un recurso falta, renderizar fallback funcional. NUNCA broken image.

### Audit Trail Inmutable (REGLA 13 + REGLA 6)
Tablas INSERT-only con triggers no-update + no-delete.

### Pattern Propagation Analysis (REGLA 3)
Cuando se identifica un bug, extraer pattern y buscar en codebase.

### Backward Compatibility con Fallback
Helpers que prefieren formato nuevo pero caen al legacy si falta.

---

## 8. Reporte obligatorio de cada tarea (formato §8)

```
✅ Tarea: [Px.x / descripción]
   Commits: [hash + descripción 1-línea]
   Razonamiento: [Pattern aplicado, REGLA 14]
   Bug Pattern Sweep: audit_id #N (CLEAN | MATCHES_FOUND con N)
   Limitaciones: [decisiones pendientes del fundador, si aplica]
```

---

## 9. Lo que NO está permitido (sin excepción)

- Pushear sin luz verde explícita del fundador
- Fix rápido cuando refactor profesional es viable (REGLA 2)
- Usar palabras prohibidas REGLA 11 en código nuevo
- Pegar secrets en commit/chat/docs (REGLA 12)
- Tocar paty-backend, Render Shell, Stripe
- Hardcodear datos de un tenant
- Bypass de candados sin documentar razón en commit
- Dejar fetch sin manejo de error (silent failure)
- Tocar UI de agente sin revisar su cuaderno (REGLA 9)

---

## 10. Glossary GenyX

- **AOaaS:** Agent Operations as a Service (categoría oficial)
- **A0:** Arquitecto IA (orquestador backstage)
- **A1-A8:** Agentes operativos visibles
- **A11:** CEO Digital / Dirección Ejecutiva (tenant-facing)
- **A9:** Vigía (pipeline REGLA 7, 5 filtros)
- **A10:** Onboarding (14 días, 4 fases, 4 Go/No-Go)
- **Mando:** Centro de control del tenant en `mando.genyxsystems.com`
- **Cláusula 7b:** delimitación contractual de responsabilidad (REGLA 13)

---

## 11. Documentos canónicos de referencia

| Doc | Contenido |
|-----|-----------|
| `CEREBRO_GENYX/DOCTRINA_PROTOCOL_ANTIGRAVITY.md` | Protocolo completo |
| `CEREBRO_GENYX/DOCTRINA_TECNICA.md` | Reglas + decretos + cuadernos |
| `CEREBRO_GENYX/AGENDA_ANTIGRAVITY_22_MAY_2026.md` | Tareas priorizadas |
| `CEREBRO_GENYX/PENDIENTES_MASTER.md` | Tareas consolidadas |
| `CEREBRO_GENYX/DOCTRINA_AGENTE_AN.md` | Cuadernos por agente (REGLA 9) |

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

# 3. Solo ENTONCES afirmar ausencia con evidencia dual
```

### Bootstrap Pattern > Migration nueva

Para tablas de infraestructura (audit, legal, config), el patrón correcto
es **bootstrap** (idempotente, corre al startup), NO migration nueva.

---

*CLAUDE.md v1.1 · 22-may-2026 · swift-viking · GenyX Systems*

*"Cero atajos. Cero supuestos. Profesional siempre."*
