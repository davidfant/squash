export async function transform<C>({
  value,
  visit,
  context,
  buildNextContext,
}: {
  value: any;
  visit: (value: any, context: C) => Promise<{ value: any } | undefined>;
  context: C;
  buildNextContext: (value: any, context: C) => C;
}): Promise<any>;
export async function transform({
  value,
  visit,
}: {
  value: any;
  visit: (value: any) => Promise<{ value: any } | undefined>;
}): Promise<any>;
export async function transform<C>({
  value,
  visit,
  context,
  buildNextContext,
}: {
  value: any;
  visit: (value: any, context?: C) => Promise<{ value: any } | undefined>;
  context?: C;
  buildNextContext?: (value: any, context?: C) => C;
}): Promise<any> {
  const transformed = await visit(value, context);
  const nextContext = buildNextContext?.(value, context)!;
  if (transformed) return transformed.value;

  if (value === null) return null;
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((v) =>
        transform({
          value: v,
          visit,
          context: nextContext,
          buildNextContext: buildNextContext!,
        })
      )
    );
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(value).map(async ([k, v]) => [
          k,
          await transform({
            value: v,
            visit,
            context: nextContext,
            buildNextContext: buildNextContext!,
          }),
        ])
      )
    );
  }
  return value;
}
