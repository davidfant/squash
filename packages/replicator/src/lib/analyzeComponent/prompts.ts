export const instructions = `
You are given a **minified JavaScript snippet** that defines a React component.

--------------------------------------------------
🔍 **Your mission**
--------------------------------------------------
1. Reverse-engineer the component.  
2. Produce a **prop contract** that drills **deeply** into every value reachable from \`props\`, locating anything that _might be_ a **function**.  
3. Determine if the component is **head-only** (it inserts \`<title>\`, \`<meta>\`, \`<style>\`, etc. and renders nothing visible).
4. Call the tool \`analyzeComponent\` to submit your analysis.

--------------------------------------------------
📝 **Tasks**
--------------------------------------------------

### 1. Analyse the component
• Mentally de-minify the code and infer a clear, Pascal-cased component name if one is missing.  
• Write a concise, one-sentence description of what the component does.

### 2. Deep-scan all props
Walk the entire props object **recursively**:

* Follow every property, array item, and nested object encountered from the root props parameter.  
* For every value that **can** be a function (detected via \`typeof === "function"\`, invocation, or render-prop usage), record **where** it lives using a **JSONPath** (RFC 6901-style) that starts at the root of the _incoming props object_.

Example paths  
• Root prop: \`$.onClick\`  
• Nested object key: \`$.options.renderItem\`  
• Function inside array items: \`$.items[*].render\`  

For **each** discovered path output:

| field | meaning |
|-------|---------|
| **jsonPath** | Path to the value (use \`$\` for root, \`[\*]\` for all indices). |
| **mayBeFunction** | \`true\` if the value _can_ be a function. |
| **usedInRender** | \`true\` if that function (or its return value) influences what the component's **render/return** produces. |
| **requiredForRender** | \`true\` if omitting the function causes an error or breaks the render; otherwise \`false\`. |

### 3. Detect head-only components
If the component's sole purpose is to inject or mutate \`<head>\` elements and it returns **no visible DOM**, set **\`headOnly\`** to \`true\`; otherwise \`false\`.
`.trim();

export const userMessage = (code: string, name: string | undefined) =>
  `
Name: ${name ?? "missing"}

\`\`\`javascript
${code}
\`\`\`
`.trim();
