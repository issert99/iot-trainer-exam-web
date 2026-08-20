function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForHash(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeForHash(item)]),
    );
  }
  return value;
}

/**
 * 浏览器原型使用的稳定完整性校验值，不替代服务端 HMAC、数字签名或 KMS。
 */
export function integrityChecksum(value: unknown) {
  const input = JSON.stringify(normalizeForHash(value));
  let hash = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.codePointAt(index) ?? 0;
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
