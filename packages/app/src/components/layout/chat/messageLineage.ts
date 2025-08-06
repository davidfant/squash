import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { ChatMessage } from "@hypershape-ai/api/agent/types";
import { resolveMessageThreadHistory } from "@hypershape-ai/api/lib/resolveMessageThreadHistory";
import { useCallback, useMemo } from "react";

interface Leaf {
  id: string;
  at: number;
}

export interface VariantOptions {
  parentId: string;
  options: {
    id: string;
    createdAt: number;
    latestLeaf: Leaf;
    isActive: boolean;
  }[];
  activeIndex: number;
}

const ts = (m: ChatMessage) => new Date(m.metadata!.createdAt).getTime();
const getMessageAt = (messages: ChatMessage[]) =>
  new Map(messages.map((m) => [m.id, ts(m)]));
const isAfter = (a: Leaf, b: Leaf) =>
  a.at > b.at || (a.at === b.at && a.id > b.id);

const resolveHistory = (messages: ChatMessage[], id: string) =>
  resolveMessageThreadHistory(messages, id, (m) => ({
    id: m.id,
    createdAt: m.metadata!.createdAt,
    parentId: m.metadata!.parentId ?? null,
  }));

/** Internal: index children by parentId and compute roots (parentId == null or missing parent). */
function indexThread(messages: ChatMessage[]) {
  const byId = new Map(messages.map((m) => [m.id, m]));
  const children = new Map<string | null, ChatMessage[]>();

  for (const m of messages) {
    const key = m.metadata!.parentId ?? null;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(m);
  }

  // A node is a root if parentId == null or parent not present in byId.
  const roots = messages.filter(
    (m) => !m.metadata!.parentId || !byId.has(m.metadata!.parentId)
  );
  return { byId, children, roots };
}

/**
 * Compute, for every node, the latest descendant leaf timestamp in its subtree.
 * Returns:
 *  - latestLeaf for each message (by id)
 *  - isLeaf set
 */
function computeLatestLeafIndex(
  messages: ChatMessage[],
  messageAt: Map<string, number>
) {
  const { byId, children, roots } = indexThread(messages);
  const childList = (id: string | null) => children.get(id) ?? [];
  const latestLeaf = new Map<string, Leaf>();
  const isLeaf = new Set<string>();

  function dfs(node: ChatMessage): Leaf {
    if (latestLeaf.has(node.id)) return latestLeaf.get(node.id)!;

    const kids = childList(node.id);
    if (kids.length === 0) {
      const at = messageAt.get(node.id)!;
      latestLeaf.set(node.id, { id: node.id, at });
      isLeaf.add(node.id);
      return { id: node.id, at };
    }
    let bestLeaf: Leaf | undefined;
    for (const k of kids) {
      const r = dfs(k);
      if (!bestLeaf || isAfter(r, bestLeaf)) {
        bestLeaf = r;
      }
    }
    latestLeaf.set(node.id, bestLeaf!);
    return bestLeaf!;
  }

  for (const r of roots) dfs(r);
  return { byId, children, roots, latestLeaf, isLeaf };
}

function computeGlobalLeaf(
  messages: ChatMessage[],
  isLeaf: Set<string>,
  messageAt: Map<string, number>
) {
  let globalLeaf: Leaf | undefined = undefined;
  for (const m of messages) {
    if (isLeaf.has(m.id)) {
      const at = messageAt.get(m.id)!;
      if (!globalLeaf || isAfter({ id: m.id, at }, globalLeaf)) {
        globalLeaf = { id: m.id, at };
      }
    }
  }
  return globalLeaf;
}

function descendGreedyFrom(
  start: ChatMessage,
  children: Map<string | null, ChatMessage[]>,
  latestLeaf: Map<string, Leaf>
): ChatMessage[] {
  const path: ChatMessage[] = [start];
  let curr = start;

  while (true) {
    const kids = children.get(curr.id) ?? [];
    if (kids.length === 0) break;

    // Choose the child whose subtree has the latest leaf (tie-break by larger leaf id).
    const next = kids.reduce((best, kid) => {
      const bestLeaf = latestLeaf.get(best.id)!;
      const kidLeaf = latestLeaf.get(kid.id)!;
      return isAfter(kidLeaf, bestLeaf) ? kid : best;
    });

    path.push(next);
    curr = next;
  }

  return path;
}

export function getActivePathFromNode(
  messages: ChatMessage[],
  startId: string | undefined
): ChatMessage[] {
  if (messages.length === 0) return [];

  const messageAt = getMessageAt(messages);
  const { byId, children, latestLeaf, isLeaf } = computeLatestLeafIndex(
    messages,
    messageAt
  );

  if (!startId) {
    const globalLeaf = computeGlobalLeaf(messages, isLeaf, messageAt);
    if (!globalLeaf) return [];
    return resolveHistory(messages, globalLeaf.id);
  }

  const up = resolveHistory(messages, startId);
  const start = byId.get(startId);
  if (!start) return up;
  const down = descendGreedyFrom(start, children, latestLeaf);
  return [...up, ...down.slice(1)];
}

/**
 * When the user switches a variant to a particular child, recompute the path:
 * - Keep the lineage from root up to the variant parent.
 * - From the chosen child, descend greedily to the newest leaf in that subtree.
 */
export function switchVariant(
  messages: ChatMessage[],
  parentId: string,
  chosenChildId: string
): ChatMessage[] {
  const messageAt = getMessageAt(messages);
  const { byId, children, latestLeaf } = computeLatestLeafIndex(
    messages,
    messageAt
  );

  const parentLineage = resolveHistory(messages, parentId); // root -> parent

  // Validate relationship
  const validChild = (children.get(parentId) ?? []).some(
    (c) => c.id === chosenChildId
  );
  if (!validChild) return parentLineage; // no-op if bad input

  const chosen = byId.get(chosenChildId)!;
  const pathDown: ChatMessage[] = [chosen];

  // Greedy descent from chosen child to the newest leaf in that subtree
  let curr = chosen;
  while (true) {
    const kids = (children.get(curr.id) ?? []).slice();
    if (kids.length === 0) break;
    // Find the child with the latest leaf timestamp (argmax)
    const next = kids.reduce((best, kid) => {
      const bestAt = latestLeaf.get(best.id)!.at;
      const kidAt = latestLeaf.get(kid.id)!.at;
      return isAfter({ id: kid.id, at: kidAt }, { id: best.id, at: bestAt })
        ? kid
        : best;
    });
    pathDown.push(next);
    curr = next;
  }

  return [...parentLineage, ...pathDown];
}

/**
 * Variant metadata *along the active path* for UI
 * Returns a Map where keys are message IDs that have >1 child, and values contain the variant options and active index.
 */
export function variantsAlongPath(
  messages: ChatMessage[],
  activePath: ChatMessage[]
): Map<string, VariantOptions> {
  const messageAt = getMessageAt(messages);
  const { children, latestLeaf } = computeLatestLeafIndex(messages, messageAt);
  const onPath = new Set(activePath.map((m) => m.id));

  const variantMap = new Map<string, VariantOptions>();
  const parentIds = new Set<string>(
    activePath.map((m) => m.metadata!.parentId)
  );

  for (const parentId of parentIds) {
    const kids = children.get(parentId) ?? [];
    if (kids.length <= 1) continue;

    const options = kids
      .map((k) => ({
        id: k.id,
        createdAt: ts(k),
        latestLeaf: latestLeaf.get(k.id)!,
        isActive: onPath.has(k.id),
      }))
      .sort((a, b) => (isAfter(a.latestLeaf, b.latestLeaf) ? 1 : -1));

    const activeIndex = options.findIndex((o) => o.isActive);
    variantMap.set(parentId, { parentId, options, activeIndex });
  }

  return variantMap;
}

export function useMessageLineage(messages: ChatMessage[], id: string) {
  const [preferredLeafId, setPreferredLeafId] = useLocalStorage<
    string | undefined
  >(`ChatThread.${id}.preferredLeafId`, undefined);

  const activePath = useMemo(
    () => getActivePathFromNode(messages, preferredLeafId),
    [messages, preferredLeafId]
  );
  const variants = useMemo(
    () => variantsAlongPath(messages, activePath),
    [messages, activePath]
  );
  const switchVariantCallback = useCallback(
    (
      parentId: string,
      chosenChildId: string,
      allMessages: ChatMessage[] = messages
    ) => {
      const newPath = switchVariant(allMessages, parentId, chosenChildId);
      setPreferredLeafId(newPath[newPath.length - 1]!.id);
      return newPath;
    },
    [messages]
  );

  return { activePath, variants, switchVariant: switchVariantCallback };
}
