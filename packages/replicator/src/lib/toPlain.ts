type JSONish =
  | string
  | number
  | boolean
  | null
  | JSONish[]
  | { [key: string]: JSONish };

/**
 * Deep-clone `input`, converting Map → object/array and Set → array.
 * Other values are left as-is; extend with extra `instanceof` checks if needed.
 */
export function toPlain(value: unknown): JSONish {
  // Plain primitives — nothing to do
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  // Arrays – map elements
  if (Array.isArray(value)) {
    return value.map((v) => toPlain(v)) as JSONish;
  }

  // Map – choose representation
  if (value instanceof Map) {
    // If every key is a string, make an object; otherwise an array of pairs
    const allStringKeys = [...value.keys()].every((k) => typeof k === "string");
    if (allStringKeys) {
      const obj: Record<string, JSONish> = {};
      for (const [k, v] of value) obj[k as string] = toPlain(v);
      return obj;
    }
    return [...value.entries()].map(([k, v]) => [k, toPlain(v)]) as JSONish;
  }

  // Set – just an array
  if (value instanceof Set) {
    return [...value].map((v) => toPlain(v)) as JSONish;
  }

  // Plain object – recurse on its own enumerable props
  if (typeof value === "object") {
    const out: Record<string, JSONish> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toPlain(v);
    }
    return out;
  }

  // Fallback: convert to string (or throw)
  return String(value);
}
