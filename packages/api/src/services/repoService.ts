import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import type { RepoProviderData, RepoSnapshot } from "@/database/schema/repos";
import { detectFramework, createSnapshotFromFramework, type FrameworkInfo } from "@/lib/repo/detectFramework";

interface DetectFrameworkParams {
  repo: {
    url: string;
    defaultBranch?: string | null;
  };
  provider: {
    type: string;
    data: RepoProviderData;
  };
  env: {
    GITHUB_APP_ID: string;
    GITHUB_APP_PRIVATE_KEY: string;
  };
}

interface ParsedGitUrl {
  owner: string;
  name: string;
}

export class RepoService {
  /**
   * Detects framework for a repository and returns framework info with snapshot configuration
   */
  static async detectAndApplyFramework(
    params: DetectFrameworkParams
  ): Promise<{ framework: FrameworkInfo; snapshot: RepoSnapshot }> {
    const octokit = this.createOctokit(params.provider, params.env);
    const { owner, name } = this.parseGitUrl(params.repo.url);
    
    const framework = await detectFramework(
      octokit,
      owner,
      name,
      params.repo.defaultBranch || undefined
    );
    
    const snapshot = createSnapshotFromFramework(framework);
    
    console.log(
      `Framework detection for ${owner}/${name}:`,
      {
        framework: framework.name,
        confidence: framework.confidence,
        port: framework.port,
        detectedFrom: framework.detected,
      }
    );
    
    return { framework, snapshot };
  }

  /**
   * Creates an authenticated Octokit instance for a repository provider
   */
  static createOctokit(
    provider: { type: string; data: RepoProviderData },
    env: { GITHUB_APP_ID: string; GITHUB_APP_PRIVATE_KEY: string }
  ): Octokit {
    if (provider.type !== "github") {
      throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_APP_PRIVATE_KEY,
        installationId: provider.data.installationId,
      },
    });
  }

  /**
   * Parses a git URL to extract owner and repository name
   * Handles formats like:
   * - https://github.com/owner/repo.git
   * - https://github.com/owner/repo
   * - git@github.com:owner/repo.git
   */
  static parseGitUrl(url: string): ParsedGitUrl {
    // Remove .git suffix if present
    const cleanUrl = url.replace(/\.git$/, "");
    
    // Handle SSH URLs (git@github.com:owner/repo)
    if (cleanUrl.startsWith("git@")) {
      const parts = cleanUrl.split(":");
      if (parts.length === 2 && parts[1]) {
        const pathParts = parts[1].split("/");
        if (pathParts.length === 2 && pathParts[0] && pathParts[1]) {
          return {
            owner: pathParts[0],
            name: pathParts[1],
          };
        }
      }
    }
    
    // Handle HTTPS URLs
    const urlParts = cleanUrl.split("/");
    const name = urlParts.pop();
    const owner = urlParts.pop();
    
    if (!owner || !name) {
      throw new Error(`Invalid git URL format: ${url}`);
    }
    
    return { owner: owner!, name: name! };
  }
} 