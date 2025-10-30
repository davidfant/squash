import debugInvestigator from "./debug-investigator.md";
import integrationTester from "./integration-tester.md";
import searchToolkits from "./search-toolkits.md";

interface Subagent {
  name: string;
  description: string;
  tools: string[];
  prompt: string;
}

function parseSubagent(src: string): Subagent {
  const clean = src.replace(/\r\n?/g, "\n").trim();
  const docRe =
    /^#\s*(.+?)\n+([\s\S]*?)\n+```json\s*\n([\s\S]*?)\n```\n?([\s\S]*)$/;

  const match = clean.match(docRe);
  if (!match) {
    throw new Error(
      `Subagent is missing a title, summary, JSON array or details section.`
    );
  }

  const [, rawName, rawDescription, rawToolsJson, rawPrompt] = match;
  return {
    tools: JSON.parse(rawToolsJson!.trim()) as string[],
    name: rawName!.trim(),
    description: rawDescription!.trim(),
    prompt: rawPrompt!.trim(),
  };
}

export const subagents = [
  parseSubagent(searchToolkits),
  parseSubagent(integrationTester),
  parseSubagent(debugInvestigator),
];
