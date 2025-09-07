V1 done

- [ ] Resolve circular dependencies
- [ ] When rewriting component with unprocessed children, how to we render?
- [ ] Parallel rewrite whenever possible
- [ ] For components that render children using a fn from props, we need to rewrite the component somehow so that it includes the right props. Otherwise if we just use the props from metadata, it won't have the function which returns the children.

- [x] In samples, limit depth of sample JSX and expected HTML

SVG optimizations

- [ ] SVG block replacement
- [ ] SVG path d identification and replacement during rewrite

Misc

- [ ] Make code gen have create/edit tools instead of writing a file
- [ ] Register all code and components before building nodes. Pick up components/code from both fiber and props. This lets us find components that aren't rendered by React.

# Vnext

Core ideas:

- For each node, keep track of if it's been processed or not
- Get a sense of a component's internal deps, by looking at each of its nodes descendants - the node's components through props' descendants. The remainder is the hypothesized internal deps
- Each time a component successfully finishes processing, start processing any component whose internal deps are valid
- When rewriting a component, for each of its nodes, create a version where the components provided by props are (1) replaced with placeholders used in the prompt, and (2) replaced with the inner contents of the nodes that are provided by props. The replaced ref needs to somehow keep track of elements in its props separately, as they might be further broken into components.

- [ ] Make rewrite agentic. Allows for faster code edits, as well as
- [ ] Limit depth of HTML preview
- [ ] Look into grok-code-fast-1 for the first iteration of the rewrite. If it works, we saved time/cost
- [ ] Change how deps are shown to be d.ts + description
