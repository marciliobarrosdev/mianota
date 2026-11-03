/**
 * Limite único para chamadas a provedores de IA.
 *
 * Sem um AbortSignal, uma conexão que não encerra mantém a interface do
 * assinante em "analisando" indefinidamente e impede o reembolso do crédito.
 */
export const AI_REQUEST_TIMEOUT_MS = 25_000;
export const AI_REQUEST_MAX_ATTEMPTS = 2;
const AI_REQUEST_ATTEMPT_TIMEOUT_MS = 12_000;
const AI_REQUEST_RETRY_DELAY_MS = 350;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "TimeoutError";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchAiProvider(
  providerLabel: string,
  url: string,
  init: RequestInit,
): Promise<Response> {
  const deadline = Date.now() + AI_REQUEST_TIMEOUT_MS;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= AI_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(Math.min(AI_REQUEST_ATTEMPT_TIMEOUT_MS, remaining)),
      });
      if (
        attempt < AI_REQUEST_MAX_ATTEMPTS &&
        RETRYABLE_STATUS.has(response.status) &&
        deadline - Date.now() > AI_REQUEST_RETRY_DELAY_MS
      ) {
        await response.body?.cancel().catch(() => undefined);
        await wait(AI_REQUEST_RETRY_DELAY_MS);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < AI_REQUEST_MAX_ATTEMPTS && deadline - Date.now() > AI_REQUEST_RETRY_DELAY_MS) {
        await wait(AI_REQUEST_RETRY_DELAY_MS);
        continue;
      }
    }
  }

  if (isTimeoutError(lastError)) {
    throw new Error(
      `A ${providerLabel} ficou instável. O sistema tentou novamente sozinho, encerrou a espera e seu crédito será devolvido. Nada foi salvo.`,
    );
  }
  throw new Error(
    `A ${providerLabel} ficou indisponível. O sistema tentou reconectar sozinho; nada foi salvo e seu crédito será devolvido.`,
    { cause: lastError },
  );
}
