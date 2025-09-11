import * as ts from "typescript";

export interface ComponentRegistryItem {
  id: string;
  dir: string;
  name: string;
  description: string;
  code: { ts: string; dts: string };
}

export function generateDeclarationFile(
  sourceCode: string,
  components: ComponentRegistryItem[]
): string {
  // Create a registry map for quick lookups
  const componentRegistry = new Map<string, ComponentRegistryItem>();

  components.forEach((component) => {
    // Map both @/dir/name and the component id for lookups
    const importPath = `@/${component.dir}/${component.name}`;
    componentRegistry.set(importPath, component);
    componentRegistry.set(component.id, component);
  });

  // Create virtual file system
  const files = new Map<string, string>();
  const mainFileName = "main.ts";
  files.set(mainFileName, sourceCode);

  // Add component files to virtual file system
  components.forEach((component) => {
    const importPath = `@/${component.dir}/${component.name}`;
    files.set(importPath + ".d.ts", component.code.dts);
  });

  // Custom compiler host
  const host: ts.CompilerHost = {
    getSourceFile: (fileName: string, languageVersion: ts.ScriptTarget) => {
      const content = files.get(fileName);
      if (content !== undefined) {
        return ts.createSourceFile(fileName, content, languageVersion, true);
      }
      return undefined;
    },

    writeFile: () => {},

    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (fileName: string) => files.has(fileName),
    readFile: (fileName: string) => files.get(fileName),
    getCanonicalFileName: (fileName: string) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    getDefaultLibFileName: (options: ts.CompilerOptions) =>
      ts.getDefaultLibFilePath(options),

    resolveModuleNames: (moduleNames: string[], containingFile: string) => {
      return moduleNames.map((moduleName) => {
        // Handle @/ imports
        if (moduleName.startsWith("@/")) {
          const component = componentRegistry.get(moduleName);
          if (component) {
            return {
              resolvedFileName: moduleName + ".d.ts",
              isExternalLibraryImport: false,
            };
          }
        }

        // Default resolution for other imports
        const result = ts.resolveModuleName(
          moduleName,
          containingFile,
          { target: ts.ScriptTarget.Latest, module: ts.ModuleKind.ESNext },
          host
        );

        return result.resolvedModule;
      });
    },
  };

  // Create TypeScript program
  const program = ts.createProgram(
    [mainFileName],
    {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      declaration: true,
      emitDeclarationOnly: true,
      skipLibCheck: true,
      moduleResolution: ts.ModuleResolutionKind.Node10,
    },
    host
  );

  // Capture emitted declaration file
  let declarationContent = "";

  const customWriteFile: ts.WriteFileCallback = (fileName, text) => {
    if (fileName.endsWith(".d.ts")) {
      declarationContent = text;
    }
  };

  // Emit declaration file
  const emitResult = program.emit(undefined, customWriteFile, undefined, true);

  if (emitResult.emitSkipped || emitResult.diagnostics.length > 0) {
    const diagnostics = ts.formatDiagnosticsWithColorAndContext(
      emitResult.diagnostics,
      {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
      }
    );
    throw new Error(`TypeScript compilation failed:\n${diagnostics}`);
  }

  return declarationContent;
}
