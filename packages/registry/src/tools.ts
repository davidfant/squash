import MiniSearch from "minisearch";
import blockIndexData from "../dist/index.block.json";
import sectionIndexData from "../dist/index.section.json";
import { REGISTRY } from "./registry.data.js";

// Types
export type RegistryItemType = "section" | "block";

export interface RegistryItem {
  id: string;
  description: string;
  type: RegistryItemType;
}

// Cache for search indexes
const searchIndexCache = new Map<RegistryItemType, MiniSearch>();

/**
 * Get the search index for the given type from the prebuilt JSON files
 */
async function getSearchIndex(type: RegistryItemType): Promise<MiniSearch> {
  if (searchIndexCache.has(type)) {
    return searchIndexCache.get(type)!;
  }

  try {
    const indexData = type === "section" ? sectionIndexData : blockIndexData;
    const searchIndex = MiniSearch.loadJSON(JSON.stringify(indexData), {
      fields: ["title", "heading", "body"],
      storeFields: ["docId", "title", "heading", "path", "body"],
    });

    searchIndexCache.set(type, searchIndex);
    return searchIndex;
  } catch (error) {
    console.error(`Failed to load search index for ${type}:`, error);
    // Return empty search index as fallback
    const emptyIndex = new MiniSearch({
      fields: ["title", "heading", "body"],
      storeFields: ["docId", "title", "heading", "path", "body"],
    });
    searchIndexCache.set(type, emptyIndex);
    return emptyIndex;
  }
}

/**
 * Search for components in the registry based on queries and type
 */
export async function search(
  queries: string[],
  type: RegistryItemType
): Promise<RegistryItem[]> {
  try {
    const searchIndex = await getSearchIndex(type);

    if (queries.length === 0) {
      // Return all items if no queries - use a wildcard search
      const allResults = searchIndex.search("*", {
        prefix: true,
        combineWith: "OR",
      });

      // Group by docId to avoid duplicates
      const uniqueItems = new Map<string, RegistryItem>();
      allResults.forEach((result: any) => {
        const docId = result.doc.id as string;
        const title = result.title as string | undefined;
        if (!uniqueItems.has(docId)) {
          // Find the registry entry to get the id
          const registryEntry = REGISTRY.find((entry) => {
            const entryPath = entry.path.replace(/^src\//, "");
            return entryPath === docId;
          });

          uniqueItems.set(docId, {
            id: registryEntry?.id || docId.replace(/\//g, "-"),
            description: title || "No description available",
            type,
          });
        }
      });

      return Array.from(uniqueItems.values());
    }

    // Perform search with all queries
    const searchQuery = queries.join(" ");
    const searchResults = searchIndex.search(searchQuery, {
      boost: { title: 3, heading: 1.5, body: 1 },
      combineWith: "OR", // Use OR for better recall when multiple queries
      fuzzy: 0.2,
    });

    // Group results by docId and aggregate scores
    const groupedResults = new Map<
      string,
      {
        id: string;
        description: string;
        score: number;
        type: RegistryItemType;
      }
    >();

    searchResults.forEach((result: any) => {
      const doc = result.doc as { id: string; path: string };
      const title = result.title as string | undefined;
      const score = result.score as number;
      const existing = groupedResults.get(doc.id);

      if (existing) {
        // Aggregate scores
        existing.score = Math.max(existing.score, score);
      } else {
        const item = REGISTRY.find((i) => i.id === doc.id);
        groupedResults.set(doc.id, {
          id: doc.id,
          description: item?.readme || "No description available",
          score: score,
          type,
        });
      }
    });

    // Sort by score and return as RegistryItem[]
    return Array.from(groupedResults.values())
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...result }) => result);
  } catch (error) {
    console.error(`Error searching ${type}s:`, error);
    return [];
  }
}

/**
 * Get the TSX code for a component at the given path
 */
export async function code(itemId: string): Promise<string> {
  try {
    const item = REGISTRY.find((item) => item.id === itemId);
    if (!item) {
      throw new Error(`Component not found at path: ${itemId}`);
    }

    return item.code;
  } catch (error) {
    throw new Error(
      `Failed to read component code: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
