// src/lib/sandbox/workspace/cryptoUtils.ts
export async function computeFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeRootHash(hashes: string[]): Promise<string> {
  // Ordena os hashes para garantir consistência (Merkle Tree básica)
  const combined = hashes.sort().join('');
  return await computeFileHash(combined);
}