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
    })),
  };

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
  graph.nodes = graph.nodes.map((node) => {
    if (node.unlocked) return node;
    const allMet = node.prerequisites.every((req) => {
      const prq = graph.nodes.find((n) => n.id === req);
      return prq ? (prq.mastery ?? 0) >= 0.7 : false;
    });
    return { ...node, unlocked: allMet };
  });

  await saveKnowledgeGraph(graph);
  return graph;
}

export function getNextConcept(graph: KnowledgeGraph): ConceptNode | null {
  const available = graph.nodes.filter((n) => n.unlocked && !n.completed);
  if (!available.length) return null;
  return available.sort((a, b) => (a.mastery || 0) - (b.mastery || 0))[0];
}

export function getReviewConcepts(graph: KnowledgeGraph): ConceptNode[] {
  return graph.nodes
    .filter((n) => (n.mastery || 0) > 0.25 && (n.mastery || 0) < 0.8)
    .sort((a, b) => (a.mastery || 0) - (b.mastery || 0));
}

export function graphHasDeadEnds(graph: KnowledgeGraph): boolean {
  return graph.nodes.some(
    (node) =>
      node.prerequisites.length > 0 &&
      node.prerequisites.every((req) => !graph.nodes.some((n) => n.id === req)),
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
