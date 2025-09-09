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
For each of the below independent flags, reason briefly about it and set the key to \`true\` or \`false\` (independent flags; more than one can be \`true\`):

| key | Set to \`true\` when… |
|-----|-----------------------|
| **headOnly** | The component's _sole_ purpose is to inject or mutate \`<head>\` elements (\`<title>\`, \`<meta>\`, \`<style>\`, etc.) and it returns **no visible DOM**. |
| **sideEffectOnly** | It renders \`props.children\` or nothing but its main purpose is to perform **side-effects inside hooks**—e.g. \`useEffect\`, \`useLayoutEffect\`, timers, analytics pings (\`gtag\`, \`mixpanel\`, etc.). |
| **contextProviderWrapper** | The primary purpose of the component is to wrap its children in one or more context providers (e.g. \`<ThemeProvider>\`, \`<AuthProvider>\`, \`<RouterProvider>\`) whose only meaningful descendant is \`{children}\` and which add no visible markup. This should NOT be true if the component is a UI component that renders more than just \`{children}\`. |
| **errorBoundaryWrapper** | A class that acts as an error boundary, that normally just renders its \`children\`. |
| **noopWrapper** | The component's entire render output is euther null or props.children (sometimes wrapped in React.Fragment, <></> or similar). It might have logic for redirecting based on auth state or similar, but in the base case it's just a wrapper around \`{children}\`. |
| **suspenseWrapper** | The component is a wrapper around \`<Suspense>\` and \`<SuspenseList>\` and renders children inside them. |

`.trim();

export const userMessage = (code: string, name: string | undefined) =>
  `
Name: ${name ?? "missing"}

\`\`\`javascript
${code}
\`\`\`
`.trim();
