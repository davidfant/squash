export const createRef = ({
  imports,
  jsx,
}: {
  imports: { module: string; import: string[] }[];
  jsx: string;
}) => ({
  type: "element",
  tagName: "ref",
  properties: { imports: JSON.stringify(imports), jsx },
});

export const createRefFromComponent = ({
  module,
  props = {},
  children = [],
}: {
  module: string;
  props?: Record<string, unknown>;
  children?: unknown[];
}) => {
  if (Object.keys(props).some((p) => p !== "className")) {
    throw new Error("Only className is supported for now");
  }
  return {
    type: "element",
    tagName: "ref",
    properties: {
      imports: JSON.stringify([{ module: module, import: ["default"] }]),
      // jsx: `<${module.split("/").pop()} className="${((props.className as string[]) ?? []).join(" ")}" />`,
      jsx: !!props.className
        ? `<${module.split("/").pop()} className="${(props.className as string[]).join(" ")}" />`
        : `<${module.split("/").pop()} />`,
    },
    children,
  };
};
