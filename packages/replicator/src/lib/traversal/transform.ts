export async function transform<C>(
  value: any,
  context: C,
  visit: (value: any, context: C) => Promise<{ value: any } | undefined>,
  buildNextContext: (value: any, context: C) => C
): Promise<any> {
  const transformed = await visit(value, context);
  const nextContext = buildNextContext(value, context);
  if (transformed) return transformed.value;

  if (value === null) return null;
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((v) => transform(v, nextContext, visit, buildNextContext))
    );
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(value).map(async ([k, v]) => [
          k,
          await transform(v, nextContext, visit, buildNextContext),
        ])
      )
    );
  }
  return value;
}
