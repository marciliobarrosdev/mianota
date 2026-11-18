/**
 * Pausa automática do provedor de IA próprio (BYOK).
 *
 * Depois de AI_PAUSE_THRESHOLD falhas seguidas, a MIA deixa de tentar o
 * provedor por AI_PAUSE_MINUTES e responde direto pela Lovable AI. Assim o
 * assinante não espera o tempo limite de um provedor fora do ar a cada mensagem.
 * Passada a pausa, uma nova tentativa é feita; se falhar de novo, pausa outra vez.
 */
export const AI_PAUSE_THRESHOLD = 3;
export const AI_PAUSE_MINUTES = 5;

export type CircuitState = { consecutive_failures: number; paused_until: string | null };

export function isProviderPaused(pausedUntil: string | null | undefined, now = new Date()): boolean {
  if (!pausedUntil) return false;
  const until = new Date(pausedUntil).getTime();
  return Number.isFinite(until) && until > now.getTime();
}

export function circuitAfterFailure(previousFailures: number | null | undefined, now = new Date()): CircuitState {
  const consecutive_failures = Math.max(0, previousFailures ?? 0) + 1;
  const paused_until =
    consecutive_failures >= AI_PAUSE_THRESHOLD
      ? new Date(now.getTime() + AI_PAUSE_MINUTES * 60_000).toISOString()
      : null;
  return { consecutive_failures, paused_until };
}

export function circuitAfterSuccess(): CircuitState {
  return { consecutive_failures: 0, paused_until: null };
}
