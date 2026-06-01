"use client";

import { get, save } from "./db";

export interface ConceptNode {
  id: string;
  title: string;
  prerequisites: string[];
  difficulty: number;
  tags?: string[];
  mastery?: number;
  unlocked?: boolean;
  completed?: boolean;
  timesReviewed?: number;
  lastSeen?: number;
  reviewPriority?: number;
}

export interface KnowledgeGraph {
  courseId: string;
  nodes: ConceptNode[];
  updatedAt: number;
}

const fallbackGraphs: Record<string, ConceptNode[]> = {
  javascript: [
    { id: "variables", title: "Variables", prerequisites: [], difficulty: 1 },
    {
      id: "functions",
      title: "Functions",
      prerequisites: ["variables"],
      difficulty: 2,
    },
    {
      id: "loops",
      title: "Loops",
      prerequisites: ["variables"],
      difficulty: 2,
    },
    {
      id: "arrays",
      title: "Arrays",
      prerequisites: ["variables"],
      difficulty: 2,
    },
    {
      id: "objects",
      title: "Objects",
      prerequisites: ["arrays"],
      difficulty: 3,
    },
    {
      id: "closures",
      title: "Closures",
      prerequisites: ["functions"],
      difficulty: 5,
    },
    {
      id: "async-await",
      title: "Async/Await",
      prerequisites: ["functions"],
      difficulty: 5,
    },
    {
      id: "react-hooks",
      title: "React Hooks",
      prerequisites: ["functions", "closures"],
      difficulty: 7,
    },
  ],
};

export async function createKnowledgeGraph(
  courseId: string,
  topic: string,
): Promise<KnowledgeGraph> {
  const normalized = topic.toLowerCase().trim();
  const nodes = fallbackGraphs[normalized] || [
    {
      id: "intro",
      title: `${topic} Fundamentals`,
      prerequisites: [],
      difficulty: 1,
    },
  ];

  const graph: KnowledgeGraph = {
    courseId,
    updatedAt: Date.now(),
    nodes: nodes.map((n) => ({
      ...n,
      mastery: 0,
      unlocked: n.prerequisites.length === 0,
      completed: false,
      timesReviewed: 0,
      lastSeen: 0,
      reviewPriority: 100,
    })),
  };

  const MAX_NODES = 150;

  graph.nodes = graph.nodes.slice(0, MAX_NODES);

  await save("memory", graph, `graph_${courseId}`);
  return graph;
}

export async function getKnowledgeGraph(
  courseId: string,
): Promise<KnowledgeGraph | null> {
  return await get("memory", `graph_${courseId}`);
}

export async function saveKnowledgeGraph(graph: KnowledgeGraph): Promise<void> {
  graph.updatedAt = Date.now();
  await save("memory", graph, `graph_${graph.courseId}`);
}

export async function refreshUnlocks(
  graph: KnowledgeGraph,
): Promise<KnowledgeGraph> {

  const nodeMap = new Map(
    graph.nodes.map(n => [n.id, n])
  );

  graph.nodes = graph.nodes.map((node) => {

    if (node.unlocked) return node;

    const allMet = node.prerequisites.every((req) => {

      const prq = nodeMap.get(req);

      return prq
        ? (prq.mastery ?? 0) >= 0.7
        : false;
    });

    return {
      ...node,
      unlocked: allMet,
    };
  });

  await saveKnowledgeGraph(graph);

  return graph;
}

export function getNextConcept(graph: KnowledgeGraph, id: any): ConceptNode | null {
  const available = graph.nodes.filter((n) => n.unlocked && !n.completed);
  if (!available.length) return null;
  let weakest = available[0];

  for (const node of available) {
    if ((node.mastery || 0) < (weakest.mastery || 0)) {
      weakest = node;
    }
  }

  return weakest;
}

export function getReviewConcepts(
  graph: KnowledgeGraph
): ConceptNode[] {

  return graph.nodes
    .filter(
      (n) =>
        (n.mastery || 0) > 0.25 &&
        (n.mastery || 0) < 0.8
    )
    .sort(
      (a, b) =>
        (b.reviewPriority || 0) -
        (a.reviewPriority || 0)
    )
    .slice(0, 10);
}
export function graphHasDeadEnds(
  graph: KnowledgeGraph
): boolean {

  const ids = new Set(
    graph.nodes.map(n => n.id)
  );

  return graph.nodes.some(node =>
    node.prerequisites.some(req => !ids.has(req))
  );
}

export function getGraphStats(graph: KnowledgeGraph) {
  const completed = graph.nodes.filter((n) => n.completed).length;
  const unlocked = graph.nodes.filter((n) => n.unlocked).length;
  const avgMastery =
    graph.nodes.reduce((acc, n) => acc + (n.mastery || 0), 0) /
    graph.nodes.length;

  return {
    totalNodes: graph.nodes.length,
    completed,
    unlocked,
    avgMastery: Math.round(avgMastery * 100) / 100,
  };
}
