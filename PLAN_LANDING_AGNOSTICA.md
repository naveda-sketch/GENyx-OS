# Plan v2 — Landing Agnóstica + Centro de Mando Simulador

> **Para:** Antigravity (ejecución)
> **Archivo objetivo:** `swift-viking/GENyxOperatorDashboard.jsx`
> **Origen:** corrige la "Auditoría Forense + Fixes" original tras revisión.
> **Principio rector:** GenyX es agnóstico en el **PRODUCTO** (los agentes no
> hardcodean industria). El landing **vende ese alcance** — no lo esconde
> detrás de copy abstracto.

---

## 0 · Las 7 correcciones vs la auditoría original

| # | Auditoría original | Corrección de este plan |
|---|--------------------|--------------------------|
| 1 | Verificación = grep de palabras + `npm build` | Verde-hueco: un *denylist* nunca prueba un universal. → recorrido positivo con 3 industrias arquetipo |
| 2 | Copy propuesto dice "9 agentes" | Son **8** oficiales (tenant-facing). Nunca nombrar la capa GenyX (A0/A9/A10/A11) |
| 3 | Eliminar el grid de 6 industrias | El grid NO es contaminación — es prueba de alcance. **CONSERVAR** |
| 4 | Simulador = 4 inputs numéricos | Flojo y desconectado. → preview **fiel** de `weekly_report.py` + input de industria |
| 5 | Conservar 6190/6195 ("el costo real… con personas") | Viola la doctrina de framing positivo. → reformular afirmativo |
| 6 | "autónoma" insertada por find-replace | Produce español torpe. → es una pasada de **copy**, no de búsqueda-reemplazo |
| 7 | Solo se auditó texto | Falta auditar **imágenes / activos visuales** |

---

## 1 · Contaminación de industria — separar lo REAL del marketing

**Distinción clave:** "100% agnóstico" es requisito del PRODUCTO. En el landing
hay dos cosas distintas que la auditoría original mezcló:

### 1.A — Contaminación REAL → purgar (las partes INTERACTIVAS)

El simulador y el Costeador traen productos de panadería hardcodeados. Eso hace
ver **el producto** como solo-panadería. Purgar:

- **MandoSimulator** (líneas ~5216-5243):
  - `Lead nuevo: Restaurante Oaxaca` → `Lead nuevo calificado`
  - `Hogaza Natural (18 uds)` → `Tu producto estrella`
  - `aumento en harina` → `alza en un insumo clave`
  - `Sube $5 la Hogaza para compensar` → `Ajusta el precio de tu producto estrella`
  - `Carrito recuperado — Lupita` → `Carrito recuperado`
- **Costeador** (~3276, ~3982-4269): todo `hogaza`/`harina` → `Producto Ejemplo`
  / `Insumo principal`. El demo "Hogaza Natural" hardcoded → demo genérico
  parametrizable (`Producto Ejemplo`).
- **tools add-on** (~5093-5094): `Historial Pacientes`, `Pipeline Inmuebles`
  → `Historial de Clientes`, `Pipeline de Oportunidades`.

### 1.B — El grid de 6 industrias (~6082-6106): NO es contaminación → CONSERVAR

La auditoría original lo marcó 🔴 crítico y propuso eliminarlo. **Es un error
estratégico.** Mostrar "Restaurantes · Clínicas · Belleza · Escuelas ·
Inmobiliarias · Panaderías" no contamina — *demuestra* que GenyX sirve para
cualquier industria. Stripe, Salesforce y Vercel muestran casos por industria a
propósito: es prueba social de alcance. Reemplazarlo por "capacidades
universales" abstractas vuelve la página vaga — **genérico no convierte.**

- **Acción:** CONSERVAR el grid. Ninguna industria debe dominar — 6 tarjetas
  balanceadas. El copy de cada tarjeta puede pulirse; la estructura se queda.
- **Alternativa** (solo si el fundador insiste en cero nombres de industria
  visibles): un pool de 12+ industrias del que el grid muestra 6 rotando en
  cada carga, así nunca "se casa" con un set. **Recomendación: conservarlo
  tal cual.**

### 1.C — Nombres comerciales propios → purgar

`Panadería Paty` (checkout, ~6501) y `Lupita` (feed) → genéricos o dinámicos
(`{nombre del negocio}`). Eso sí es contaminación: datos de un tenant real
filtrados al landing.

---

## 2 · Conteo de agentes: son **8**, nunca 9

El sistema tiene 12 agentes (A0-A11), pero la **capa GenyX es invisible al
cliente**: A0 Orquestador, A9 Vigía, A10 Onboarding y A11 CEO **nunca** se
nombran al tenant. Los **8 agentes oficiales tenant-facing** son: Marketing,
Captación, Venta, Cierre, Entrega, Seguimiento, Analítica, Finanzas.

- **Acción:** todo copy de la landing dice **"8 agentes"**. Buscar y corregir
  cualquier "9 agentes" y cualquier mención de la capa backstage.

---

## 3 · Messaging "autónoma" — pasada de copy, no find-replace

Insertar "autónoma" mecánicamente produce español torpe. Es una **redacción**,
instancia por instancia (slogan oficial: *"Tu operación comercial autónoma"*):

- ~6017 `automatizan el 90% de tu operación comercial` →
  `corren el 90% de tu operación comercial — autónoma, sin que tú estés.`
- ~6242 `Reemplaza a una operación comercial completa.` →
  `Una operación comercial completa, corriendo sola.`
- ~6255 `TU OPERACIÓN COMERCIAL INTELIGENTE` → `TU OPERACIÓN COMERCIAL AUTÓNOMA`
- ~6257 `Tu operación comercial genera demanda…` →
  `Tu operación comercial autónoma genera demanda…`
- ~6289 `Tu operación comercial siempre activa` →
  `Tu operación comercial autónoma — siempre activa.`

### 3.B — Framing positivo (lo que la auditoría original dejó pasar)

Las líneas ~6190 (`El costo real de una operación comercial`) y ~6195
(`OPERACIÓN COMERCIAL CON PERSONAS`) se conservaron como "el contraste". Pero
la doctrina GenyX es **framing afirmativo — prohibido oposición, dolor y
miedo.** Pintar la operación humana como un costo/problema **viola** esa regla.

- **Acción:** reformular el comparativo en positivo. En vez de "mira lo
  caro/lento que es con personas", mostrar un **"antes → ahora"** afirmativo:
  *"Lo que antes pedía un equipo completo, ahora corre solo."* Mismo contraste,
  sin miedo. Si esa sección es estructuralmente un "nosotros vs ellos"
  negativo, rediseñarla a esa narrativa afirmativa.

---

## 4 · Centro de Mando — simulador interactivo, FIEL al producto

La auditoría original propuso 4 inputs numéricos → 4 KPIs. Eso es una
**calculadora**, no un simulador, y no está atado al backend real.

**Diseño corregido:**

- **El simulador debe ser un PREVIEW FIEL del producto.** La Sección 5 de la
  auditoría original verificó que el mock del Reporte del Lunes coincide con
  `weekly_report.py`. El simulador interactivo debe usar **esa misma lógica**:
  lo que el tenant ve en el simulador == lo que el producto le entregará.
  **Landing-promete == producto-entrega.**
- **Input de tipo de negocio** (clave para agnosticismo + interactividad): un
  selector *"¿Qué vendes?"* (productos físicos / servicios / citas /
  membresías…). El simulador adapta el **lenguaje** del briefing y los KPIs a
  ese tipo. Eso es el play agnóstico+interactivo de verdad — no 4 números.
- **Inputs:** tipo de negocio · ventas/semana · ticket promedio · margen %
  (slider). Defaults demo al cargar.
- **Output:** un Centro de Mando que reacciona instantáneamente — KPIs + un
  briefing **determinístico (sin LLM)** generado con la lógica de
  `weekly_report.py` (producto estrella, hora pico, evolución vs semana
  pasada, recomendaciones). Sin auto-play timer: se actualiza al cambiar
  inputs.
- **Layout:** form a la izquierda, Centro de Mando (iPhone) a la derecha;
  apilado en mobile.

---

## 5 · iPhone Simulator — fixes visuales (completando el de tooltips)

- `maxHeight: 700` → quitar; usar `minHeight` flexible.
- Frame exterior: `overflow: hidden` → `visible`. El `overflow: hidden` va
  **solo** en el contenedor de la pantalla (screen content).
- **Tooltips A1/A8** — el fix de la auditoría original ("un sistema que detecte
  posición") es vago e incompleto. Concreto: los tooltips deben renderizarse en
  un **portal / capa por encima del marco del teléfono** (z-index alto, fuera
  del `overflow:hidden` de la pantalla). Togglear overflow no basta — el
  tooltip debe **escapar el bezel**. Posicionarlo con las coordenadas del
  elemento ancla.
- Feed de actividad: `maxHeight: 120` → `maxHeight: 140` + indicador de scroll.

---

## 6 · Auditar activos visuales (el hallazgo que faltó)

El grep de la auditoría original solo cazó **texto**. Un grep no detecta una
imagen industria-específica (foto de pan, screenshot de un dashboard de
panadería, ícono de chef/báscula…).

- **Acción:** inventariar todas las imágenes, ilustraciones, screenshots e
  íconos del landing. Reemplazar los industria-específicos por activos
  agnósticos o ilustraciones abstractas.

---

## 7 · Verificación — multi-industria, no denylist

La verificación original (grep + `npm build`) es un **verde-hueco**: prueba
"sin palabras de panadería", no "agnóstico". Un denylist jamás prueba un
universal.

**Verificación corregida:**

1. **Recorrido positivo con 3 arquetipos.** Recorrer landing + simulador +
   Costeador como si fueras: (a) una **clínica dental**, (b) un **despacho
   contable**, (c) un **gimnasio**. Checklist por arquetipo: ¿algún texto,
   ejemplo, placeholder o imagen suena ajeno? ¿El simulador produce un briefing
   con sentido para ese negocio?
2. **grep como check SECUNDARIO** (no primario): `hogaza|harina|...` debe dar 0
   en las secciones interactivas — pero pasar el grep NO cierra la verificación.
3. `npm run build` sin errores.
4. **Visual:** tooltips A1/A8 no se cortan · el simulador reacciona a los inputs
   · ninguna imagen es industria-específica · el grid de 6 industrias sigue
   presente y balanceado.

---

## 8 · Deuda técnica (no-bloqueante, al radar)

`GENyxOperatorDashboard.jsx` pesa 461 KB / ~6,500 líneas y mezcla landing +
Costeador + simulador + checkout en un solo archivo. Big Tech lo separaría en
componentes. No es para este plan — pero queda anotado: a futuro, dividir.

---

## Orden de ejecución sugerido

1. **§1 + §2 + §1.C** — purga de contaminación real + conteo de agentes (rápido, alto valor).
2. **§3** — pasada de copy "autónoma" + framing positivo.
3. **§6** — auditar activos visuales.
4. **§5** — fixes del iPhone.
5. **§4** — simulador interactivo (es el más grande: feature, no fix).
6. **§7** — verificación multi-industria de TODO antes de cerrar.
