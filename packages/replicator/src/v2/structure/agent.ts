import { generateText } from "@/lib/ai";
import { filesystemCacheMiddleware } from "@/lib/filesystemCacheMiddleware";
import type { FileSink } from "@/lib/sinks/base";
import type { Metadata } from "@/types";
import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { stepCountIs, wrapLanguageModel } from "ai";
import path from "path";
import {
  ModuleKind,
  Node,
  Project,
  ScriptTarget,
  SourceFile,
  SyntaxKind,
} from "ts-morph";
import { JsxEmit } from "typescript";
import type { Logger } from "winston";
import type { ReplicatorState } from "../state";
import { instructions } from "./prompt";
import { createStructureComponentsTool } from "./tools";

type ComponentId = Metadata.ReactFiber.ComponentId;

export async function structureComponents(
  skipComponentIds: Set<ComponentId>,
  state: ReplicatorState,
  sink: FileSink,
  logger: Logger
) {
  const moduleToId = new Map<string, Metadata.ReactFiber.ComponentId>();
  const idToSourceFile = new Map<ComponentId, SourceFile>();
  const deps = new Map<ComponentId, Set<ComponentId>>();

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      /* generic stuff */
      target: ScriptTarget.ES2022,
      module: ModuleKind.ESNext,
      jsx: JsxEmit.React,
      baseUrl: ".",
      paths: { "@/*": ["src/*"] },
      rootDir: "src",
    },
  });
  state.component.registry.forEach((i, id) => {
    const filePath = `src/${i.dir}/${i.name}.tsx`;
    moduleToId.set(`@/${i.dir}/${i.name}`, i.id);

    const sf = project.createSourceFile(filePath, i.code.ts);
    idToSourceFile.set(i.id, sf);
    sf.getImportDeclarations()
      .map((i) => moduleToId.get(i.getModuleSpecifierValue()))
      .filter((id) => !!id)
      .forEach((id) => deps.set(i.id, (deps.get(i.id) ?? new Set()).add(id)));

    sf.forEachDescendant((n) => {
      if (n.getKind() !== SyntaxKind.CallExpression) return;
      const call = n.asKind(SyntaxKind.CallExpression)!;
      if (call.getExpression().getText() !== "import") return;

      const arg = call.getArguments()[0];
      if (Node.isStringLiteral(arg)) {
        const compId = moduleToId.get(arg.getLiteralText());
        if (compId) deps.set(i.id, (deps.get(i.id) ?? new Set()).add(compId));
      }
    });
  });

  const names = new Map(state.component.name);
  const counts = new Map<string, number>();
  for (const name of names.values()) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const [name, count] of counts) {
    if (count === 1) continue;
    [...names.entries()]
      .filter(([_, n]) => n === name)
      .forEach(([id], idx) => names.set(id, `${name}${idx + 1}`));
  }

  const components = [...state.component.registry.entries()]
    .filter(([id]) => !skipComponentIds.has(id))
    .map(([id, comp]) => ({
      id,
      name: names.get(id)!,
      description: comp.description,
      rename: false,
      dependencies: [...(deps.get(id) ?? [])].map((id) => names.get(id)!),
    }));

  logger.debug("Structuring components", { components });

  const { steps } = await generateText({
    model: wrapLanguageModel({
      model: anthropic("claude-sonnet-4-20250514"),
      middleware: filesystemCacheMiddleware(),
    }),
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: JSON.stringify(components, null, 2) },
    ],
    tools: {
      StructureComponents: createStructureComponentsTool(
        components.map((c) => c.id)
      ),
    },
    providerOptions: {
      anthropic: {
        thinking: { type: "enabled", budgetTokens: 2048 },
      } satisfies AnthropicProviderOptions,
    },
    stopWhen: [
      ({ steps }) =>
        steps
          .flatMap((s) => s.toolResults)
          .filter((s) => !s.dynamic)
          .some((r) => r.toolName === "StructureComponents" && r.output.ok),
      stepCountIs(3),
    ],
  });

  const latest = steps
    .flatMap((s) => s.toolResults)
    .filter((r) => !r.dynamic)
    .findLast((r) => r.toolName === "StructureComponents");

  if (!latest?.output.ok) {
    throw new Error("Failed to structure components");
  }

  return Promise.all(
    [...state.component.registry.entries()].map(async ([id, item]) => {
      const compId = id as ComponentId;
      const sf = idToSourceFile.get(compId);
      if (!sf) throw new Error(`Unknown source file ${id}`);
      // await sf.move(`./src/${comp.directory}/${comp.name}.tsx`);

      const itemPath = path.join("src", item.dir, `${item.name}.tsx`);

      const comp = latest.input[id];
      let newPath: string;
      if (comp) {
        newPath = path.join("src", comp.directory, `${comp.name}.tsx`);

        state.component.name.set(compId, comp.name);
        item.name = comp.name;
        item.dir = comp.directory;

        sf.getExportedDeclarations()
          .get(item.name)
          ?.forEach((d) => {
            if (
              Node.isFunctionDeclaration(d) ||
              Node.isClassDeclaration(d) ||
              Node.isVariableDeclaration(d)
            ) {
              d.rename(comp.name);
              // d.rename(comp.name + "Testing");
            }
          });

        await sink.remove(itemPath);
      } else {
        newPath = itemPath;
      }

      sf.getImportDeclarations().forEach((imp) => {
        const compId = moduleToId.get(imp.getModuleSpecifierValue());
        const item = state.component.registry.get(compId!);
        const spec = latest.input[compId!];
        if (!compId || !item || !spec) return;

        const newModule = `@/${spec.directory}/${spec.name}`;
        imp.setModuleSpecifier(newModule);
        imp
          .getNamedImports()
          .filter((n) => n.getName() === item.name)
          .forEach((n) => {
            const name = n.getNameNode();
            if (Node.isIdentifier(name)) name.rename(spec.name);
          });
      });

      sf.forEachDescendant((n) => {
        if (n.getKind() !== SyntaxKind.CallExpression) return;
        const call = n.asKind(SyntaxKind.CallExpression)!;
        if (call.getExpression().getText() !== "import") return;

        const arg = call.getArguments()[0];
        if (!Node.isStringLiteral(arg)) return;
        const compId = moduleToId.get(arg.getLiteralText());
        const item = state.component.registry.get(compId!);
        const spec = latest.input[compId!];
        if (!compId || !item || !spec) return;

        const newModule = `@/${spec.directory}/${spec.name}`;
        arg.setLiteralValue(newModule);
        // if is deconstructing, rename the bindings
        throw new Error("TODO: rename destructured object?");
      });

      await sink.writeText(newPath, sf.getText());
      return { path: newPath, content: sf.getText() };
    })
  );
}
