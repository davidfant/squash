import type { Options } from "prettier";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import parserHtml from "prettier/plugins/html";
import parserCss from "prettier/plugins/postcss";
import parserTypescript from "prettier/plugins/typescript";
import prettier from "prettier/standalone";

export const js = (string: string, options?: Options) =>
  prettier.format(string, {
    ...options,
    parser: "babel",
    plugins: [parserBabel, parserEstree],
  });

export const ts = (string: string, options?: Options) =>
  prettier.format(string, {
    ...options,
    parser: "typescript",
    plugins: [parserTypescript, parserBabel, parserEstree],
  });

export const html = (string: string, options?: Options) =>
  prettier.format(string, {
    ...options,
    parser: "html",
    printWidth: 160,
    singleAttributePerLine: false,
    bracketSameLine: false,
    htmlWhitespaceSensitivity: "css",
    plugins: [parserHtml],
  });

export const css = (string: string, options?: Options) =>
  prettier.format(string, {
    ...options,
    parser: "css",
    plugins: [parserCss],
  });
