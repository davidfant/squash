import fs from "node:fs/promises";
import path from "node:path";

interface FileNode {
  name: string;
  path: string;
  type: "file";
  lineCount: number;
}

interface DirNode {
  name: string;
  path: string;
  type: "dir";
  totalLines: number;
  children: Array<DirNode | FileNode>;
}

const countFileLines = async (absoluteFilePath: string): Promise<number> => {
  const content = await fs.readFile(absoluteFilePath, "utf-8");
  if (content.length === 0) return 0;
  return content.split("\n").length;
};

const buildDirectoryTree = async (
  absoluteDirPath: string
): Promise<DirNode> => {
  const entries = await fs.readdir(absoluteDirPath, { withFileTypes: true });
  // Sort for stable output
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const children: Array<DirNode | FileNode> = [];
  let totalLines = 0;

  for (const entry of entries) {
    const fullPath = path.join(absoluteDirPath, entry.name);
    if (entry.isDirectory()) {
      const subTree = await buildDirectoryTree(fullPath);
      children.push(subTree);
      totalLines += subTree.totalLines;
    } else if (entry.isFile()) {
      const lineCount = await countFileLines(fullPath);
      const fileNode: FileNode = {
        name: entry.name,
        path: fullPath,
        type: "file",
        lineCount,
      };
      children.push(fileNode);
      totalLines += lineCount;
    }
  }

  return {
    name: path.basename(absoluteDirPath),
    path: absoluteDirPath,
    type: "dir",
    totalLines,
    children,
  };
};

const renderTree = (
  node: DirNode | FileNode,
  prefix = "",
  isLast = true
): string => {
  if (node.type === "file") {
    return `${prefix}${isLast ? "└──" : "├──"} ${node.name} (${node.lineCount})`;
  }

  const lines: string[] = [];
  const header = `${prefix}${isLast ? "└──" : "├──"} ${node.name} (${node.totalLines})`;
  lines.push(header);
  const childPrefix = `${prefix}${isLast ? "    " : "│   "}`;
  node.children.forEach((child, index) => {
    const childIsLast = index === node.children.length - 1;
    lines.push(renderTree(child, childPrefix, childIsLast));
  });
  return lines.join("\n");
};

export async function logFileTree(templatePath: string) {
  const srcRoot = path.join(templatePath, "src");
  try {
    const tree = await buildDirectoryTree(srcRoot);
    // For the root, start without an initial connector
    const header = `${tree.name} (${tree.totalLines})`;
    const childLines = tree.children.map((child, idx) =>
      renderTree(child, "", idx === tree.children.length - 1)
    );
    console.log([header, ...childLines].join("\n"));
  } catch (err) {
    console.error("Failed to render src tree:", err);
  }
}
