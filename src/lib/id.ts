/**
 * Collision-resistant id generator.
 *
 * `crypto.randomUUID()` exists in every modern browser and in Node 20, but we
 * keep a fallback so the app still works in odd embedding environments.
 */
export function makeId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
