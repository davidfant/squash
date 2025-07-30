export async function timer<T>(name: string, fn: () => Promise<T>) {
  const startedAt = performance.now();
  const res = await fn();
  const duration = performance.now() - startedAt;
  console.log(`[${name}] took ${duration}ms`);
  return res;
}
