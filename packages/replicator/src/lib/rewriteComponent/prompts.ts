export const instructions = `
You are given a minified JavaScript snippet that defines a React component.

**Your tasks**  
1. **Understand the snippet** - de-minify it mentally and infer:  
   • the component's name (if missing, choose a concise, Pascal-cased name)
   • what the component does and any obvious UI/UX behaviour  
   • whether its render output uses *only* native DOM elements (e.g. \`<div>\`, \`<span>\` …) or calls other internal React components.

2. **Rewrite the component into modern, idiomatic TypeScript** that preserves behaviour, observing **all** of these code-style rules:

   • Use **JSX** syntax everywhere; avoid \`React.createElement\` unless unavoidable.  
   • Declare an \`export interface <ComponentName>Props\` for the props **and export it**.  
   • Export the component itself with \`export function <ComponentName>() { … }\` (or \`export const <ComponentName> = …\`), **not** a default export.  
   • Allowed imports:  
     \`\`\`ts
import React from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
     \`\`\`  
   • *No other packages* may be imported.
   • If the original code referenced unsupported libraries, replicate the behaviour in-line or stub it out with best-effort logic.
   • de-minify identifiers - choose descriptive Pascal-cased names for any obviously minified props, variables, or JSX children. For example, if there is a component \`a\` used within the component that seems to be a button, rename it to \`Button\`.
   • Some React components include SVGs and SVG paths. The SVG paths are often very long and have been replaced with placeholders. The placeholders follow the format [[SVG:0|PATH:0|NAME:...|DESCRIPTION:...]]. When you see these placeholders, you should repeat them verbatim - do not change or expand them. They will later be replaced with the original SVG paths.

3. **Identify internal dependencies** - i.e. any React component *invoked* inside this component (either via JSX or \`React.createElement\`) that is not a native DOM tag. Don't include dependencies such as hooks, React contexts, imported util functions or other non-React components.
   For each dependency, output:  
   • its import/JSX name (e.g. \`Button\`, \`Card.Header\`)  
   • a short, best-effort description of what it appears to be or do.

4. **Call the tool\`rewriteComponent\`** exactly once with a JSON argument that has the following shape. You MUST provide all the fields: name, typescript, description, dependencies

\`\`\`json
{
  "name":        "<ComponentName>",               // string
  "typescript":  "<TS source code of component>", // string, full code block
  "description": "<What the component does>",     // short paragraph
  "dependencies": [                               // array may be empty
    {
      "name": "<DependencyName>",
      "description": "<Best-effort guess of its purpose>"
    }
  ]
}
\`\`\`
`.trim();

export const userMessage = (code: string, name: string | undefined) =>
  `
Name: ${name ?? "missing"}

\`\`\`javascript
${code}
\`\`\`
`.trim();

// export const errorMessage = (error: string) =>
//   `
// In your previous response an error occurred. Review the provided error message, understand what went wrong and provide an updated response:

// \`\`\`
// ${error}
// \`\`\`
// `.trim();
