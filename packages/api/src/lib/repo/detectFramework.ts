import type { Sandbox } from "@/sandbox/types";
import type { Octokit } from "@octokit/rest";

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface FrameworkInfo {
  name: string;
  confidence: "high" | "medium" | "low";
  port: number;
  entrypoint: string;
  detected: {
    dependencies: string[];
    scripts: string[];
  };
}

export async function detectFramework(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string | undefined
): Promise<FrameworkInfo> {
  try {
    // Fetch package.json from the repository
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "package.json",
      ref: defaultBranch || "main",
    });

    if (!("content" in data) || data.type !== "file") {
      console.log(`No package.json found in ${owner}/${repo}`);
      return getDefaultFramework();
    }

    // Decode and parse package.json
    const packageJsonContent = Buffer.from(data.content, "base64").toString(
      "utf-8"
    );
    const packageJson: PackageJson = JSON.parse(packageJsonContent);

    console.log(`Analyzing package.json for ${owner}/${repo}:`, {
      name: packageJson.name,
      hasScripts: !!packageJson.scripts,
      scriptsCount: Object.keys(packageJson.scripts || {}).length,
      hasDependencies: !!packageJson.dependencies,
      hasDevDependencies: !!packageJson.devDependencies,
    });

    // Combine all dependencies
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const detectedDeps: string[] = [];
    const detectedScripts: string[] = [];

    // Check for Vite
    if (allDeps.vite) {
      detectedDeps.push("vite");
      return {
        name: "vite",
        confidence: "high",
        port: 5173,
        entrypoint: "npm install && npm run dev -- --host 0.0.0.0 --port 5173",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // Check for Next.js
    if (allDeps.next) {
      detectedDeps.push("next");
      return {
        name: "nextjs",
        confidence: "high",
        port: 3000,
        entrypoint: "npm install && npm run dev",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // Check for Create React App
    if (allDeps["react-scripts"]) {
      detectedDeps.push("react-scripts");
      return {
        name: "create-react-app",
        confidence: "high",
        port: 3000,
        entrypoint: "npm install && npm start",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // Check for Remix
    if (allDeps["@remix-run/node"] || allDeps["@remix-run/react"]) {
      detectedDeps.push("@remix-run/*");
      return {
        name: "remix",
        confidence: "high",
        port: 3000,
        entrypoint: "npm install && npm run dev",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // Check for Angular
    if (allDeps["@angular/core"]) {
      detectedDeps.push("@angular/core");
      return {
        name: "angular",
        confidence: "high",
        port: 4200,
        entrypoint: "npm install && npm start",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // Check for Vue with Vite (Nuxt 3 or Vue 3)
    if (allDeps.nuxt || allDeps["nuxt3"]) {
      detectedDeps.push("nuxt");
      return {
        name: "nuxt",
        confidence: "high",
        port: 3000,
        entrypoint: "npm install && npm run dev",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // Check for Gatsby
    if (allDeps.gatsby) {
      detectedDeps.push("gatsby");
      return {
        name: "gatsby",
        confidence: "high",
        port: 8000,
        entrypoint: "npm install && npm run develop -- --host 0.0.0.0",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // Check scripts for framework clues if no dependency match
    const scripts = packageJson.scripts || {};

    if (scripts.dev?.includes("vite") || scripts.serve?.includes("vite")) {
      detectedScripts.push("vite in scripts");
      return {
        name: "vite",
        confidence: "medium",
        port: 5173,
        entrypoint: "npm install && npm run dev -- --host 0.0.0.0 --port 5173",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    if (scripts.dev?.includes("next") || scripts.start?.includes("next")) {
      detectedScripts.push("next in scripts");
      return {
        name: "nextjs",
        confidence: "medium",
        port: 3000,
        entrypoint: "npm install && npm run dev",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // If we have a dev script, use it
    if (scripts.dev) {
      detectedScripts.push("generic dev script");
      return {
        name: "unknown",
        confidence: "low",
        port: 3000,
        entrypoint: "npm install && npm run dev",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // If we have a start script, use it
    if (scripts.start) {
      detectedScripts.push("generic start script");
      return {
        name: "unknown",
        confidence: "low",
        port: 3000,
        entrypoint: "npm install && npm start",
        detected: { dependencies: detectedDeps, scripts: detectedScripts },
      };
    }

    // Default fallback
    return getDefaultFramework();
  } catch (error) {
    console.error(`Error detecting framework for ${owner}/${repo}:`, error);
    return getDefaultFramework();
  }
}

function getDefaultFramework(): FrameworkInfo {
  return {
    name: "unknown",
    confidence: "low",
    port: 3000,
    entrypoint: "npm install && npm run dev",
    detected: {
      dependencies: [],
      scripts: [],
    },
  };
}

export function createSnapshotFromFramework(
  framework: FrameworkInfo
): Sandbox.Snapshot.Config.Any {
  return {
    type: "docker",
    port: framework.port,
    image: "node:20-alpine",
    cwd: "/repo",
    env: {},
    tasks: {
      install: [
        {
          id: "install",
          title: "Install dependencies",
          type: "command",
          command: "npm install",
        },
      ],
      dev: {
        id: "dev",
        title: "Start development server",
        type: "command",
        command: framework.entrypoint,
      },
      build: [],
    },
    build: { type: "static", dir: "dist" },
  };
}
