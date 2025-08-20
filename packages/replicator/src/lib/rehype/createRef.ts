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
  const componentName = module.split("/").pop()!;
  return {
    type: "element",
    tagName: "ref",
    properties: {
      imports: JSON.stringify([{ module: module, import: ["default"] }]),
      // jsx: !!props.className
      //   ? `<${componentName} className=${JSON.stringify(props.className)} />`
      //   : `<${componentName} />`,
      tagName: componentName,
      props: JSON.stringify(props),
    },
    children,
  };
};
