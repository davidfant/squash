import "i18next";
import resources from "./en";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: typeof resources;
    strictKeyChecks: true;
  }
}
