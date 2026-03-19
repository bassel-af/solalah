/**
 * Recursively converts BigInt values to numbers for JSON serialization.
 * JSON.stringify cannot handle BigInt natively.
 */
export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(serializeBigInt) as unknown as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInt(value);
    }
    return result as T;
  }
  return obj;
}
