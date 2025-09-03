V1 done

- [ ] Resolve circular dependencies
- [ ] When rewriting component with unprocessed children, how to we render?
- [ ] Parallel rewrite whenever possible

- [ ] In samples, limit depth of sample JSX and expected HTML

SVG optimizations

- [ ] SVG block replacement
- [ ] SVG path d identification and replacement during rewrite

Misc

- [ ] Make code gen have create/edit tools instead of writing a file
- [ ] Register all code and components before building nodes. Pick up components/code from both fiber and props. This lets us find components that aren't rendered by React.
