import type { WorkflowNode } from "@/content/types";
import { useIsMobile } from "@/hooks/use-mobile";
import dagre from "dagre";
import { useMemo } from "react";
import ReactFlow, {
  Background,
  Handle,
  MarkerType,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { getToolkitLogo } from "../util/get-toolkit-logo";

const nodeWidth = 200;
const nodeHeight = 100;

export type DiagramNodeData = {
  id: string;
  title: string;
  description: string;
  toolkitSlug?: string;
  parentId?: string;
};

function NodeComponent({
  id,
  data,
  isMobile,
}: NodeProps<WorkflowNode> & { isMobile: boolean }) {
  const targetPosition = isMobile ? Position.Top : Position.Left;
  const sourcePosition = isMobile ? Position.Bottom : Position.Right;

  return (
    <>
      <Handle type="target" position={targetPosition} style={{ opacity: 0 }} />
      <div
        className="flex justify-center items-center"
        style={{ width: nodeWidth, height: nodeHeight }}
      >
        <div className="rounded-md border bg-card px-3 py-2 shadow-sm flex flex-col justify-center max-h-full w-full">
          <div className="flex items-center gap-2">
            {data.toolkitSlug && (
              <img
                src={getToolkitLogo(data.toolkitSlug)}
                alt={data.title}
                className="size-4 object-contain"
              />
            )}
            <p className="leading-none">{data.title}</p>
          </div>
          <p className="text-sm text-muted-foreground">{data.description}</p>
        </div>
      </div>
      <Handle type="source" position={sourcePosition} style={{ opacity: 0 }} />
    </>
  );
}

const createNodeTypes = (isMobile: boolean) => ({
  node: (props: NodeProps<WorkflowNode>) => (
    <NodeComponent {...props} isMobile={isMobile} />
  ),
});

const createNodesFromData = (
  data: DiagramNodeData[]
): Omit<Node, "position">[] => {
  return data.map((item) => ({
    id: item.id,
    type: "node",
    data: item,
  }));
};

const createEdgesFromNodes = (nodes: DiagramNodeData[]): Edge[] => {
  const edges: Edge[] = [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  nodes.forEach((node) => {
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        edges.push({
          id: `${parent.id}-${node.id}`,
          source: parent.id,
          sourceHandle: "source",
          target: node.id,
          targetHandle: "target",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        });
      }
    }
  });

  return edges;
};

const getLayoutedElements = (
  nodes: Omit<Node, "position">[],
  edges: Edge[],
  rankdir: "LR" | "TB" = "LR"
): Node[] => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir, nodesep: 50, ranksep: 50 });

  nodes.forEach((node) =>
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  );
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });
};

export const FlowDiagram = ({
  nodes: nodeData,
}: {
  nodes: DiagramNodeData[];
}) => {
  const isMobile = useIsMobile();

  const { nodes, edges, nodeTypes } = useMemo(() => {
    const initialNodes = createNodesFromData(nodeData);
    const flowEdges = createEdgesFromNodes(nodeData);
    const rankdir = isMobile ? "TB" : "LR";
    const layoutedNodes = getLayoutedElements(initialNodes, flowEdges, rankdir);
    const dynamicNodeTypes = createNodeTypes(isMobile);
    return {
      nodes: layoutedNodes,
      edges: flowEdges,
      nodeTypes: dynamicNodeTypes,
    };
  }, [nodeData, isMobile]);

  const nodeHeights = nodes.map((node) => node.position.y + nodeHeight);
  const maxHeight = Math.max(...nodeHeights);

  return (
    <div
      className="w-full overflow-hidden rounded-3xl border bg-muted/40 h-72"
      style={{ height: isMobile ? maxHeight : undefined }}
    >
      <ReactFlow
        key={String(isMobile)}
        nodes={nodes}
        edges={edges}
        fitView
        nodeTypes={nodeTypes}
        preventScrolling={false}
        panOnScroll={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
};
