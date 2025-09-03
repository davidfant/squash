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
