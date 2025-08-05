export async function relaceMerge(opts: {
  original: string;
  edit: string;
}): Promise<string> {
  const url = "https://instantapply.endpoint.relace.run/v1/code/apply";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RELACE_API_KEY}`,
    },
    body: JSON.stringify({
      initialCode: opts.original,
      editSnippet: opts.edit,
    }),
  });
  const json = (await res.json()) as { mergedCode: string };
  return json.mergedCode;
}
