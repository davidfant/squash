interface Message {
  id: string;
  parentId: string;
}

export function resolveMessageThreadHistory<M extends Message>(
  messages: M[],
  leafId: string
): M[];
export function resolveMessageThreadHistory<T>(
  messages: T[],
  leafId: string,
  toMessage: (item: T) => Message
): T[];
export function resolveMessageThreadHistory<T>(
  messages: T[],
  leafId: string,
  toMessage?: (item: T) => Message
): T[] {
  // If no transform function provided, assume T extends Message
  const transform = toMessage || ((x: T) => x as unknown as Message);

  const byId = new Map(messages.map((m) => [transform(m).id, m]));
  const path: T[] = [];
  const seen = new Set<string>();

  let curr = byId.get(leafId);
  if (!curr) return path;

  while (curr) {
    const message = transform(curr);
    if (seen.has(message.id)) break;
    seen.add(message.id);
    path.push(curr);
    if (!message.parentId) break;
    curr = byId.get(message.parentId);
  }

  return path.reverse();
}
