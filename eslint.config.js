// ═══════════════════════════════════════════════════════════════════
// ESLint Flat Config — Candado #11: React Hooks Rules Enforcement
// ═══════════════════════════════════════════════════════════════════
// METODOLOGÍA (REGLA 14): Candado Técnico > Regla Escrita.
// Origen: React error #310 en producción (22-may-2026) — hooks llamados
// DESPUÉS de early return en MandoClientView + TabMarketing.
//
// Este candado BLOQUEA commit/push si se detecta violación de:
//   · rules-of-hooks: hooks en condicionales, loops, o nested components
//   · exhaustive-deps: dependencias faltantes en useEffect/useCallback
//
// REGLA 3: bug patrón cazado → materializar como enforcement técnico.
// ═══════════════════════════════════════════════════════════════════

import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['**/*.{js,jsx,tsx}'],
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // ERROR (bloquea build): hooks fuera de orden o condicionales
      'react-hooks/rules-of-hooks': 'error',
      // WARN (no bloquea, pero visible): deps faltantes en useEffect
      'react-hooks/exhaustive-deps': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    // Ignore build artifacts
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },
];
