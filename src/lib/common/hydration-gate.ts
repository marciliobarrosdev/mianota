/**
 * Portão de hidratação para guardas de rota que rodam só no navegador (`ssr: false`).
 *
 * Por quê: se `beforeLoad` lança `redirect()` enquanto o React ainda hidrata a primeira
 * página, o roteador perde a correspondência da tela em montagem ("reading 'routeId'")
 * e o React refaz a página inteira. Na primeira carga, esperamos a raiz montar antes de
 * redirecionar; depois disso o redirecionamento segue imediato. O teto evita esperar
 * para sempre caso a raiz nunca monte.
 */
import { isRedirect } from "@tanstack/react-router";

const MAX_WAIT_MS = 1500;
let hydrated = false;
const waiters: Array<() => void> = [];

/** Chamado uma vez pela rota raiz, num efeito, quando a página terminou de hidratar. */
export function markHydrated() {
  hydrated = true;
  while (waiters.length) waiters.shift()?.();
}

function waitForHydration(): Promise<void> {
  if (hydrated || typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    waiters.push(resolve);
    setTimeout(resolve, MAX_WAIT_MS);
  });
}

/** Executa a checagem de acesso; redirecionamentos na primeira carga esperam a hidratação. */
export async function guardAfterHydration<T>(check: () => Promise<T>): Promise<T> {
  try {
    return await check();
  } catch (error) {
    if (isRedirect(error)) await waitForHydration();
    throw error;
  }
}
