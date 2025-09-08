export const instructions = `
You are given a **minified JavaScript snippet** that defines a React component.

--------------------------------------------------
🔍 **Your mission**
--------------------------------------------------
1. Reverse-engineer the component.  
2. Produce a **prop contract** that drills **deeply** into every value reachable from \`props\`, locating anything that _might be_ a **function**.  
3. Classify the component along several binary “no-op” axes (see *Section 3*).  
4. Call the tool \`analyzeComponent\` to submit your analysis.

--------------------------------------------------
📝 **Tasks**
--------------------------------------------------

### 1 · Analyse the component
• Mentally de-minify the code and infer a clear, Pascal-cased component name if one is missing.  
• Write a concise, one-sentence description of what the component does.

### 2 · Deep-scan all props
Walk the entire props object **recursively**:

* Follow every property, array item, and nested object encountered from the root props parameter.  
* For every value that **can** be a function (detected via \`typeof === "function"\`, invocation, or render-prop usage), record **where** it lives using a **JSONPath** (RFC 6901-style) that starts at the root of the _incoming props object_.

Example paths  
• Root prop: \`$.onClick\`  
• Nested object key: \`$.options.renderItem\`  
• Function inside array items: \`$.items[*].render\`  

For **each** discovered path output:

| field                | meaning                                                                                       |
|----------------------|------------------------------------------------------------------------------------------------|
| **jsonPath**         | Path to the value (use \`$\` for root, \`[\*]\` for all indices).                              |
| **mayBeFunction**    | \`true\` if the value _can_ be a function.                                                     |
| **usedInRender**     | \`true\` if that function (or its return value) influences what the component's **render/return** produces. |
| **requiredForRender**| \`true\` if omitting the function causes an error or breaks the render; otherwise \`false\`.   |

### 3 · Binary component classifiers
Set each key below to \`true\` or \`false\` (independent flags; more than one can be \`true\`):

| key | Set to \`true\` when… |
|-----|-----------------------|
| **headOnly** | The component's _sole_ purpose is to inject or mutate \`<head>\` elements (\`<title>\`, \`<meta>\`, \`<style>\`, etc.) and it returns **no visible DOM**. |
| **sideEffectWrapper** | It simply returns its \`children\` (or nothing) but performs **side-effects inside hooks**—e.g. \`useEffect\`, \`useLayoutEffect\`, timers, analytics pings (\`gtag\`, \`mixpanel\`, etc.). |
| **contextProviderWrapper** | The root JSX is one or more context providers (e.g. \`<ThemeProvider>\`, \`<AuthProvider>\`) whose only meaningful descendant is \`{children}\` and which add no visible markup. |
| **errorBoundaryWrapper** | A class component implementing \`componentDidCatch\`/\`getDerivedStateFromError\`, or a function component using an error-boundary hook, that normally just renders its \`children\`. |

`.trim();

export const userMessage = (code: string, name: string | undefined) =>
  `
Name: ${name ?? "missing"}

\`\`\`javascript
${code}
\`\`\`
`.trim();
