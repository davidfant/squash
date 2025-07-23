import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";

const n = (id: string) => upperFirst(camelCase(id));

export const generatePageFileContent = (page: {
  name: string;
  sectionIds: string[];
}) =>
  [
    ...page.sectionIds.map((id) => `import ${n(id)} from "${id}";`),
    "",
    `export const name = "${JSON.stringify(page.name)}";`,
    "",
    "export default () => (",
    "  <>",
    ...page.sectionIds.map((id) => `    <${n(id)} />`),
    "  </>",
    ")",
    "",
  ].join("\n");

export const generateSectionFileContent = (section: {
  name: string;
  variantId: string;
}) =>
  [
    `export { default } from "${section.variantId}";`,
    `export const name = "${JSON.stringify(section.name)}";`,
    "",
  ].join("\n");
