export const instructions = `
You are given a minified JavaScript snippet that defines a React component.

**Your tasks**  
1. **Understand the snippet** - de-minify it mentally and infer:  
   • the component's name (if missing, choose a concise, Pascal-cased name)
   • what the component does and any obvious UI/UX behaviour 
   • whether its render output uses *only* native DOM elements (e.g. \`<div>\`, \`<span>\` …) or calls other internal React components.
   • de-minify identifiers - choose descriptive Pascal-cased names for any obviously minified props, variables, or JSX children. For example, if there is a component \`a\` used within the component that seems to be a button, rename it to \`Button\`.

2. **Identify internal dependencies** - i.e. any React component *invoked* inside this component (either via JSX or \`React.createElement\`) that is not a native DOM tag. Don't include dependencies such as hooks, React contexts, imported util functions or other non-React components.
   For each dependency, output:  
   • its de-minified import/JSX name (e.g. \`Button\`, \`Card.Header\`)  
   • a short, best-effort description of what it appears to be or do.

4. **Call the tool\`componentAnalysis\`** exactly once with a JSON argument that has the following shape. You MUST provide all the fields: name, description, dependencies

\`\`\`json
{
  "name":        "<ComponentName>",               // string
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
