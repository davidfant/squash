import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";

const n = (id: string) => upperFirst(camelCase(id));
const fromBase64 = (str: string) => Buffer.from(str, "base64").toString("utf8");

export const generatePageFileContent = (page: {
  name: string;
  sectionIds: string[];
}) =>
  [
    ...page.sectionIds
      .map(fromBase64)
      .map((id) => `import ${n(id)} from "${id}";`),
    "",
    `export const name = "${JSON.stringify(page.name)}";`,
    "",
    "export default () => (",
    "  <>",
    ...page.sectionIds.map(fromBase64).map((id) => `    <${n(id)} />`),
    "  </>",
    ")",
    "",
  ].join("\n");

export const generateSectionFileContent = (section: {
  name: string;
  variantId: string;
}) =>
  [
    `export { default } from "${fromBase64(section.variantId)}";`,
    `export const name = "${JSON.stringify(section.name)}";`,
    "",
  ].join("\n");
