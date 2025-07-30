import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";

const n = (id: string) => upperFirst(camelCase(id));
const importPath = (id: string) =>
  id.replace(/^src/, "@").replace(/index\.tsx?$/, "");

export const staticPageFileContent = (page: {
  name: string;
  sectionPaths: string[];
}) => {
  const sections = page.sectionPaths
    .map(importPath)
    .map((p) => ({ import: p, name: n(p) }));
  return [
    ...sections.map((s) => `import ${s.name} from "${s.import}";`),
    "",
    `export const name = ${JSON.stringify(page.name)};`,
    "",
    "export default () => (",
    "  <>",
    ...sections.map((s) => `    <${s.name} />`),
    "  </>",
    ")",
    "",
  ].join("\n");
};

export const staticSectionFileContent = (section: {
  name: string;
  variantFilePath: string;
}) =>
  [
    `export { default } from "${importPath(section.variantFilePath)}";`,
    `export const name = ${JSON.stringify(section.name)};`,
    "",
  ].join("\n");
