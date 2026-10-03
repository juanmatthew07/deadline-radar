// randomUUID is missing on non-secure origins, such as plain http on a LAN,
// so every origin needs a fallback that still produces unique ids.
export function createId() {
  const webCrypto = globalThis.crypto
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID()
  }
  const time = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${time}-${random}`
}