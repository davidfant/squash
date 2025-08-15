export const createSlot = ({
  importPath,
  props = {},
  children = [],
}: {
  importPath: string;
  props?: Record<string, unknown>;
  children?: unknown[];
}) => ({
  type: "element",
  tagName: "slot",
  properties: { ...props, import: importPath },
  children,
});
