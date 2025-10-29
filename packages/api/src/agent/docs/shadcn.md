# ShadCN Reference

This repo uses ShadCN, an unstyled, fully type-safe component library built on top of Radix UI primitives and Tailwind CSS, designed to give you complete control over styling while providing accessible, headless components out of the box. All default ShadCN primitive components have been installed and are available under `@/app/components/ui` (not the default `@/components/ui` that is typically used). Below are is a non-exhaustive list of the available components:
Accordion, Alert, Avatar, Button, Card, Dialog, Input, Popover, Select, Sidebar, Skeelton, Sonner, Tabs, TextArea, Tooltip

All ShadCN related Tailwind design tokens are available in `src/app/index.css`.

---

Unless the user explicitly tells you about their design preferences or has direct design requests, follow the provided guidelines:

- Style the UI like Linear, but default to light mode
- Avoid gradients
- Avoid adding lots of colors everywhere. Be very sparing with colors, and only add them when strictly necessary
- Avoid font weights above 400 for titles, headlines, and similar.
