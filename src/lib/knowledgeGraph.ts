"use client";

import { get, save } from "./db";

/**
 * CODE ASCENT - KNOWLEDGE GRAPH ENGINE
 *
 * Responsável por:
 * - prerequisites
 * - unlock progression
 * - concept mastery
 * - dead-end prevention
 * - intelligent next concept selection
 */

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

/* =========================================================
   DEFAULT FALLBACK GRAPH
========================================================= */

const fallbackGraphs: Record<string, ConceptNode[]> = {
  javascript: [
    {
      id: "variables",
      title: "Variables",
      prerequisites: [],
      difficulty: 1,
    },

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

/* =========================================================
   CREATE GRAPH
========================================================= */

export async function createKnowledgeGraph(
  courseId: string,
  topic: string
): Promise<KnowledgeGraph> {
  const normalized = topic.toLowerCase();

  const nodes =
    fallbackGraphs[normalized] ||
    [
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

/* =========================================================
   LOAD GRAPH
========================================================= */

export async function getKnowledgeGraph(
  courseId: string
): Promise<KnowledgeGraph | null> {
  return await get("memory", `graph_${courseId}`);
}

/* =========================================================
   SAVE GRAPH
========================================================= */

export async function saveKnowledgeGraph(
  graph: KnowledgeGraph
) {
  graph.updatedAt = Date.now();

  await save("memory", graph, `graph_${graph.courseId}`);
}

/* =========================================================
   UNLOCK CHECK
========================================================= */

export function canUnlockConcept(
  graph: KnowledgeGraph,
  conceptId: string
): boolean {
  const node = graph.nodes.find((n) => n.id === conceptId);

  if (!node) return false;

  if (node.unlocked) return true;

  return node.prerequisites.every((req) => {
    const prerequisite = graph.nodes.find((n) => n.id === req);

    return prerequisite?.mastery !== undefined &&
      prerequisite.mastery >= 0.7;
  });
}

/* =========================================================
   UPDATE UNLOCKS
========================================================= */

export async function refreshUnlocks(
  graph: KnowledgeGraph
) {
  graph.nodes = graph.nodes.map((node) => ({
    ...node,

    unlocked: canUnlockConcept(graph, node.id),
  }));

  await saveKnowledgeGraph(graph);

  return graph;
}

/* =========================================================
   UPDATE MASTERY
========================================================= */

export async function updateConceptMastery(
  courseId: string,
  conceptId: string,
  success: boolean
) {
  const graph = await getKnowledgeGraph(courseId);

  if (!graph) return null;

  const node = graph.nodes.find((n) => n.id === conceptId);

  if (!node) return null;

  const current = node.mastery || 0;

  let updated = current;

  if (success) {
    updated += 0.12;
  } else {
    updated -= 0.08;
  }

  node.mastery = Math.max(0, Math.min(1, updated));

  node.completed = node.mastery >= 0.95;

  node.lastSeen = Date.now();

  await refreshUnlocks(graph);

  return node;
}

/* =========================================================
   NEXT CONCEPT
========================================================= */

export function getNextConcept(
  graph: KnowledgeGraph
): ConceptNode | null {
  const available = graph.nodes.filter(
    (n) =>
      n.unlocked &&
      !n.completed
  );

  if (!available.length) return null;

  available.sort((a, b) => {
    const masteryA = a.mastery || 0;
    const masteryB = b.mastery || 0;

    return masteryA - masteryB;
  });

  return available[0];
}

/* =========================================================
   REVIEW TARGETS
========================================================= */

export function getReviewConcepts(
  graph: KnowledgeGraph
): ConceptNode[] {
  return graph.nodes
    .filter((n) => {
      const mastery = n.mastery || 0;

      return mastery > 0.25 && mastery < 0.8;
    })
    .sort((a, b) => {
      return (a.mastery || 0) - (b.mastery || 0);
    });
}

/* =========================================================
   DEAD-END DETECTION
========================================================= */

export function graphHasDeadEnds(
  graph: KnowledgeGraph
): boolean {
  return graph.nodes.some((node) => {
    return (
      node.prerequisites.length > 0 &&
      node.prerequisites.every((req) => {
        const found = graph.nodes.find((n) => n.id === req);

        return !found;
      })
    );
  });
}

/* =========================================================
   DEBUG HELPERS
========================================================= */

export function getGraphStats(
  graph: KnowledgeGraph
) {
  const completed = graph.nodes.filter(
    (n) => n.completed
  ).length;

  const unlocked = graph.nodes.filter(
    (n) => n.unlocked
  ).length;

  const avgMastery =
    graph.nodes.reduce(
      (acc, n) => acc + (n.mastery || 0),
      0
    ) / graph.nodes.length;

  return {
    totalNodes: graph.nodes.length,

    completed,

    unlocked,

    avgMastery:
      Math.round(avgMastery * 100) / 100,
  };
}