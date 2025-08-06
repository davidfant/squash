import { type QueryOutput } from "@/hooks/api";
import { api } from "@/hooks/api";

export type ProviderData = QueryOutput<
  (typeof api.repos.providers)[":providerId"]["$get"]
>;

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

export interface EnvVariable {
  key: string;
  value: string;
}

export interface SelectedRepo {
  id: string;
  name: string;
}

export type CurrentStep = "select-repo" | "configure-framework";

export interface Framework {
  value: string;
  icon: string;
  display: string;
} 