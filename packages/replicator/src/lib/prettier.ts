import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import parserHtml from "prettier/plugins/html";
import parserCss from "prettier/plugins/postcss";
import parserTypescript from "prettier/plugins/typescript";
import prettier from "prettier/standalone";

export const js = (string: string) =>
  prettier.format(string, {
    parser: "babel",
    plugins: [parserBabel, parserEstree],
  });

export const ts = (string: string) =>
  prettier.format(string, {
    parser: "typescript",
    plugins: [parserTypescript, parserBabel, parserEstree],
  });

export const html = (string: string) =>
  prettier.format(string, { parser: "html", plugins: [parserHtml] });

export const css = (string: string) =>
  prettier.format(string, { parser: "css", plugins: [parserCss] });
