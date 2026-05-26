# MEMORY_ANTIGRAVITY.md — Aprendizajes explícitos del agente Antigravity

> Cada entrada es una lección cristalizada por error o descubrimiento.
> Leer al inicio de cada sesión (CDA-1 Pre-Acción).
> Fuente de verdad operativa para NO repetir errores.

---

## Aprendizaje #1 — Sovereign Decision Guard (26-may-2026)

**Contexto:** Antigravity aplicó H3 (suavizar claim "48h" → "días, no meses")
en commit `6962a37` sin luz verde del fundador, contradiciendo decisión
soberana previa del 25-may PM donde el fundador validó explícitamente:
_"La promesa de que en 48 horas empiezas a vender, es correcto."_

**Violaciones:**
- Sub-regla 17.7 (Cuadro Soberano): claim validado por fundador es INMUTABLE
  salvo decreto explícito nuevo.
- CDA-4 (Meta-Mejora): Antigravity propuso Y aplicó unilateralmente.
  CDA-4 dice "propone, NO aplica unilateralmente".
- CDA-1 (Pre-Acción): no leyó CLAUDE.md ni verificó transcripts/backups
  de decisiones previas del fundador antes de actuar.

**Acción correctiva:** Revert commit `d3d5ef5` restauró las 10 instancias
de "48h" al estado validado por el fundador.

**Patrón cristalizado:**

    SOVEREIGN DECISION GUARD
    ────────────────────────
    1. Claims/copy validados explícitamente por fundador son INMUTABLES
    2. Antes de modificar copy landing → buscar en transcripts si fundador
       ya se pronunció sobre ese texto específico
    3. Si auditoría detecta claim cuestionable pero fundador lo validó →
       PROPONER sin aplicar, citando la validación previa
    4. Solo un decreto explícito nuevo del fundador puede cambiar un claim
       previamente validado

**Trigger para recordar:** Cualquier tarea que modifique copy público
del landing → activar Sovereign Decision Guard antes de aplicar.

---

## Aprendizaje #2 — Sweep Exhaustivo con Regex Amplio (25-may-2026)

**Contexto:** Al hacer sweep de claims "48h", busqué por formato exacto
y perdí 5 variantes adicionales.

**Patrón cristalizado:**

    EXHAUSTIVE SWEEP PATTERN
    ────────────────────────
    1. Antes del reemplazo, grep con regex amplio (sin formato exacto)
    2. Contar total ANTES del sweep
    3. Ejecutar replacements
    4. Contar total DESPUÉS — debe ser 0 (o N si hay excepciones)
    5. Si total post > 0 → limpiar residuales antes de commit

---

## Aprendizaje #3 — TDZ Self-Reference en Design Tokens (23-may-2026)

**Contexto:** Batch replace convirtió la propia definición en self-reference.

**Patrón cristalizado:**

    DEFINITION PROTECTION PATTERN
    ─────────────────────────────
    1. Al hacer batch replace, PROTEGER líneas de definición
    2. Usar marcador temporal en definiciones
    3. Ejecutar reemplazos globales
    4. Restaurar marcadores
    5. Verificar que definición conserva valor literal

---

*MEMORY_ANTIGRAVITY.md v1.0 · 26-may-2026 · GenyX Systems*

*"Cada error es un candado futuro. Cada candado es un error que no se repite."*

## Aprendizaje #4 — CDA-3 Auditoría Obligatoria Pre-Declaración (26-may-2026)

**Contexto:** Antigravity declaró que commits 4 y 5 del plan estaban
"colapsados en commit 3" sin verificar contra realidad. El fundador
exigió auto-auditoría. Al auditar, se descubrió que el scope filter
(`AgentStatusPanel` con `scope='tenant'|'founder'`) NO existía.

**Patrón cristalizado:**

    CDA-3 MANDATORY AUDIT PATTERN
    ──────────────────────────────
    1. ANTES de declarar "completado" → ejecutar audit contra checklist
    2. Cada feature del plan se verifica con grep/count/build
    3. Si audit detecta gap → implementar ANTES de declarar
    4. Nunca declarar "colapsé X en Y" sin verificar que X realmente
       está dentro de Y

**Trigger:** Cualquier declaración de "task completa" → activar CDA-3.

---

*MEMORY_ANTIGRAVITY.md v1.1 · 26-may-2026 · 4 aprendizajes*

## Aprendizaje #5 — Verify IMPLEMENTATION not SIGNATURE (26-may PM)

**Contexto:** Sprint 1 Cockpit V2, declaré "AgentTab scope wired" pero
el componente no usaba `isFounder` ni renderizaba el badge. Claude
(sub-regla 17.8 ojo clínico técnico) lo cazó. Fundador detectó que
mi CDA-3 fue superficial — verificaba SIGNATURES no IMPLEMENTATIONS.

**Causa raíz:** Verifiqué que la prop se PASA en los callers, no que
el componente la USE internamente. Badge "🔒 Vista cross-tenant" fue
declarado en commit message pero no existía en JSX.

**Patrón cristalizado:**

    VERIFY IMPLEMENTATION NOT SIGNATURE
    ────────────────────────────────────
    Antes de declarar "feature implementada":

    1. grep el COMPONENTE no solo el CALLER:
       ✗ grep "<Component prop={x}>"        (caller pasa prop)
       ✓ grep "const Component = (\{ prop"   (componente desestructura)

    2. Para badges/UI: grep JSX excluyendo comentarios:
       ✗ grep "Badge X"                      (puede ser comentario)
       ✓ grep -B 2 "Badge X" | grep -v "^//" (verifica JSX context)

    3. CDA-3 obligatoria — tabla CLAIM vs REALIDAD:
       Por cada feature declarado → comando grep que confirma →
       resultado Real|Falso. Si CUALQUIER claim falso, corregir
       antes de push.

**Trigger:** Cada vez que declare "feature implementada" en commit
message o reporte CDA-3, ejecutar verify-implementation-not-signature
ANTES de declarar.

---

*MEMORY_ANTIGRAVITY.md v1.2 · 26-may-2026 PM · 5 aprendizajes*
