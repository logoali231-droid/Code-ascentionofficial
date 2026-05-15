"use client";



import { buildMemoryContext } from "./vectorMemory";
import { getKnowledgeGraph, getReviewConcepts } from "./knowledgeGraph";
import { generate } from "./webllm";
import { safeParse } from "./safeParse";
import { buildPromptFragments, compressContext } from "./promptFragments";
import { runtimeQueue } from "./generationQueue";
import { validateCourse } from "./courseValidator"; 
import { getUserStrengthsAndWeaknesses } from "./userMemory";

export async function generateCourse({
  topic,
  style,
  level,
  difficulty,
  baseMaterial,
  stylePrompt,
  cognitive,
  courseId
}: any)  {
  const cognitiveFragments = buildPromptFragments({
    cognitive: cognitive || "Standard",
    difficulty: difficulty || 1,
    mastery: 50,
    reinforcement: false,
  });

  const compressedMaterial = baseMaterial ? compressContext(baseMaterial, 5000) : "";
  const userAnalysis = await getUserStrengthsAndWeaknesses();

  // 1. Recupera o histórico pedagógico do grafo de conhecimento se aplicável
  let graphReviewText = "None yet";
  try {
 
const graph = await getKnowledgeGraph(courseId || topic.toLowerCase());
    if (graph) {
      const reviewTargets = getReviewConcepts(graph);
      if (reviewTargets.length > 0) {
        graphReviewText = reviewTargets.map(r => `${r.title} (Mastery: ${r.mastery})`).join(", ");
      }
    }
  } catch (e) {
    console.error("Failed to fetch graph review concepts", e);
  }

  // 2. Recupera memórias históricas semânticas de lições e falhas anteriores do usuário
  const vectorMemoryContext = await buildMemoryContext({
    query: `Course creation for topic: ${topic}. User weaknesses: ${userAnalysis.weaknesses.join(", ")}`,
    tags: [topic.toLowerCase(), level],
    limit: 3
  });

  const adaptiveContext = `
================================
USER ADAPTIVE PROFILE (MIND PALACE)
================================
STRENGTHS: ${userAnalysis.strengths.join(", ") || "None yet"}
WEAKNESSES: ${userAnalysis.weaknesses.join(", ") || "None yet"}
PEDAGOGICAL_REVIEW_TARGETS: ${graphReviewText}
HISTORICAL_VECTOR_MEMORIES:
${vectorMemoryContext || "No previous historical memory found for this context."}

INSTRUCTION: 
1. If the user has weaknesses or review targets, prioritize starting or embedding tasks within the course structure to reinforce those specific concepts naturally.
2. If they master a topic (Strength), skip basic definitions in those sub-areas and move to complex implementation.
3. Incorporate advice or pacing references from the historical vector memories to maintain learning continuity.
`;
  
  const prompt = `
You are an elite curriculum architect.
Your mission: create a coherent, progressive, adaptive programming course.

${cognitiveFragments}

${adaptiveContext}

================================
COURSE CONFIG
================================
TOPIC: ${topic}
STYLE: ${style}
LEVEL: ${level}
DIFFICULTY: ${difficulty}/5

================================
TEACHING STYLE
================================
${stylePrompt || "Explain clearly and simply"}

================================
BASE MATERIAL
================================
${compressedMaterial || "none"}

================================
COURSE RULES
================================
- Scale complexity gradually
- ADHD / tdah: shorter modules, clearer segmentation
- Deep_Dive: deeper theory, mechanics
- Visual_Logic: patterns, analogies
- beginner: fundamentals first | advanced: optimization, edge cases

================================
OUTPUT FORMAT
================================
Return ONLY valid JSON.
{
  "title": "",
  "description": "",
  "tags": [],
  "lessons": [
    { "title": "", "summary": "", "difficulty": 1 }
  ]
}
`;

  try {
    // 1. Correct variable name 'prompt' used here
    const rawRes = await runtimeQueue.enqueue(
  async (_signal) => {
    return generate(prompt);
  },
  1 // prioridade
);

    let fullResponse = "";
    
    // 2. Ensure we check 'rawRes' (the result from the queue)
    if (rawRes) {
      if (typeof rawRes === 'string') {
        fullResponse = rawRes;
      } else {
        // 3. Iterate through the stream (rawRes)
        for await (const chunk of rawRes) {
          const content = typeof chunk === 'string' 
            ? chunk 
            : (chunk as any).choices?.[0]?.delta?.content || "";
          fullResponse += content;
        }
      }
    }

    // 4. Parse the final concatenated string
    const parsed = safeParse(fullResponse);
    
    // ... rest of your validation logic
    // Validação com o seu validateCourseStructure
    if (!parsed || !validateCourse(parsed)) {
      console.error("Course validation failed. Using fallback.");
      return {
        title: `${topic} Course`,
        description: `Foundational guide for ${topic}.`,
        tags: [topic, level],
        lessons: [
          { title: `Introduction to ${topic}`, summary: `Foundations of ${topic}.`, difficulty: 1 }
        ],
      };
    }

    return parsed;
  } catch (error) {
    console.error("Course Generation Failure:", error);
    return null;
  }
}
