/*
 * Password-based encryption for the /prototypes bundle. Uses WebCrypto only,
 * so the same code encrypts at build time (Node) and decrypts in the browser.
 *
 * Format: [version (1)][salt (16)][iv (12)][AES-256-GCM ciphertext + tag]
 * The header is authenticated as additional data.
 */
const VERSION = 1
const ITERATIONS = 600_000 // OWASP recommendation for PBKDF2-HMAC-SHA256
const SALT_BYTES = 16
const IV_BYTES = 12
const HEADER_BYTES = 1 + SALT_BYTES + IV_BYTES

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encrypt(plaintext: string, password: string) {
  const data = new Uint8Array(HEADER_BYTES)
  data[0] = VERSION
  const salt = crypto.getRandomValues(data.subarray(1, 1 + SALT_BYTES))
  const iv = crypto.getRandomValues(data.subarray(1 + SALT_BYTES, HEADER_BYTES))

  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: data },
    key,
    new TextEncoder().encode(plaintext),
  )

  const out = new Uint8Array(HEADER_BYTES + ciphertext.byteLength)
  out.set(data)
  out.set(new Uint8Array(ciphertext), HEADER_BYTES)
  return out
}

/* Rejects if the password is wrong or the data was tampered with */
export async function decrypt(data: Uint8Array<ArrayBuffer>, password: string) {
  if (data[0] !== VERSION) throw new Error(`Unsupported vault version ${data[0]}`)
  const salt = data.subarray(1, 1 + SALT_BYTES)
  const iv = data.subarray(1 + SALT_BYTES, HEADER_BYTES)

  const key = await deriveKey(password, salt)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: data.subarray(0, HEADER_BYTES) },
    key,
    data.subarray(HEADER_BYTES),
  )
  return new TextDecoder().decode(plaintext)
}
