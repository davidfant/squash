import { flyFetch } from "./util";

export interface FlyioExecContext {
  appId: string;
  machineId: string;
  apiKey: string;
  workdir: string;
}

interface ExecResult {
  exit_code: number;
  stdout?: string;
  stderr?: string;
}

const execCommand = (
  context: FlyioExecContext,
  command: string,
  { timeout = 30 }: { timeout?: number } = {}
): Promise<ExecResult> =>
  flyFetch<ExecResult>(
    `/apps/${context.appId}/machines/${context.machineId}/exec`,
    context.apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        command: !!context.workdir
          ? ["sh", "-c", `cd ${context.workdir} && ${command}`]
          : command,
        timeout,
      }),
    }
  );

export async function deleteFile(
  filePath: string,
  context: FlyioExecContext
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await execCommand(context, `rm -f "${filePath}"`);
    if (result.exit_code === 0) {
      return {
        success: true,
        message: `File deleted successfully: ${filePath}`,
      };
    } else {
      return {
        success: false,
        message: `Failed to delete file with exit code ${result.exit_code}: ${
          result.stderr || "Unknown error"
        }`,
      };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function writeFile(
  filePath: string,
  content: string,
  context: FlyioExecContext
): Promise<{ success: boolean; message: string }> {
  try {
    const base64Content = Buffer.from(content, "utf8").toString("base64");
    const result = await execCommand(
      context,
      `echo "${base64Content}" | base64 -d > "${filePath}"`
    );

    if (result.exit_code === 0) {
      return {
        success: true,
        message: `File written successfully: ${filePath}`,
      };
    } else {
      return {
        success: false,
        message: `Failed to write file with exit code ${result.exit_code}: ${
          result.stderr || "Unknown error"
        }`,
      };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function readFile(
  filePath: string,
  context: FlyioExecContext,
  lines?: { start: number; end: number }
): Promise<
  | { success: true; content: string; totalLines: number }
  | { success: false; message: string }
> {
  const countLines = `(wc -l < ${filePath} | awk '{print $1}')`;
  try {
    const result = await execCommand(
      context,
      lines
        ? `awk "NR >= ${lines.start} && NR <= ${lines.end}" ${filePath} && ${countLines}`
        : `cat ${filePath} && ${countLines}`
    );
    if (result.exit_code === 0) {
      const lines = (result.stdout ?? "").split("\n");
      const content = lines?.slice(0, -1).join("\n");
      const totalLines = Number(lines?.[lines.length - 1]);
      return { success: true, content, totalLines };
    } else {
      return {
        success: false,
        message: `Failed to read file with exit code ${result.exit_code}: ${
          result.stderr || "Unknown error"
        }`,
      };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function gitGrep(
  query: string,
  context: FlyioExecContext,
  opts: {
    caseSensitive?: boolean;
    includePattern?: string;
    excludePattern?: string;
  } = {}
) {
  const cmd: string[] = [
    "git",
    "grep",
    "--line-number",
    "--max-count",
    "50",
    "--context",
    "3",
    "--no-color",
    "-I",
    "-e",
    query,
    "--ignore-case",
    "--heading",
    "--break",
  ];
  if (opts.caseSensitive) {
    cmd.push("--ignore-case");
  }
  cmd.push("--");
  if (opts.includePattern) {
    cmd.push(`"${opts.includePattern}"`);
  }
  if (opts.excludePattern) {
    cmd.push(`":(exclude)${opts.excludePattern}"`);
  }
  const result = await execCommand(context, cmd.join(" "));
  if (result.exit_code === 0) {
    const matches = (result.stdout ?? "").split("\n\n\n").map((line) => {
      const [path, snippet] = line.split("\n");
      return { path, snippet };
    });
    return { success: true, matches };
  } else if (result.exit_code === 1) {
    return { success: true, matches: [] };
  } else {
    return { success: false, message: result.stderr || "Unknown error" };
  }
}

export async function gitLsFiles(context: FlyioExecContext) {
  const result = await execCommand(
    context,
    "git ls-files | xargs wc -l | awk '!/total$/ { printf \"%s\\t%s\\n\", $1, $2 }'"
  );
  if (result.exit_code === 0) {
    if (!result.stdout?.trim()) {
      return { success: true as const, files: [] };
    }

    const files = result.stdout
      .trimEnd()
      .split("\n")
      .filter((line) => !!line.trim())
      .map((line) => {
        const [linesStr, ...pathParts] = line.split("\t");
        return { path: pathParts.join("\t"), lines: Number(linesStr) };
      });
    return { success: true as const, files };
  } else {
    return {
      success: false as const,
      message: result.stderr || "Unknown error",
    };
  }
}
