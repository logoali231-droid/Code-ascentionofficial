// src/lib/aiPrompt.ts
import { CognitiveProfile } from "@/types/core";
import { getKnowledgeGraph } from "./knowledgeGraph";

/**
 * Retorna as diretrizes baseadas em psicologia cognitiva para mitigação de carga mental
 * e otimização de retenção para cada arquitetura neurológica de aprendizado.
 */
export function getCognitiveInstruction(profile: CognitiveProfile): string {
  const normalized = String(profile || "standard").toLowerCase();

  switch (normalized) {
    case "tdah":
      return `
        [NÚCLEO_COGNITIVO: TDAH - FILTRO DE APRENDIZADO DOPAMINÉRGICO / CHUNKING ATÔMICO]
        - ESTRATÉGIA: Redução drástica da carga de leitura para mitigar a dispersão por fadiga de atenção sustentada.
        - DIRETRIZES DE CONSTRUÇÃO:
          * Sentenças curtas, diretas e de alto impacto (máximo de 12-15 palavras por frase).
          * Limite estrito de no máximo 2 sentenças por bloco/parágrafo.
          * Aplicação de negritos markdown de forma cirúrgica em palavras-chave para criar âncoras ópticas e facilitar o escaneamento visual imediato.
          * Organização em seções isoladas contendo no máximo 3 itens em listas (bullet points) breves.
          * Injeção de micro-recompensas textuais ou logs de progresso rápidos ("Acesso liberado.", "Buffer limpo.") para manter o looping dopaminérgico.
      `.trim();

    case "visual_logic":
      return `
        [NÚCLEO_COGNITIVO: VISUAL_LOGIC - CODIFICAÇÃO DUAL / MAPEAMENTO ESPACIAL]
        - ESTRATÉGIA: Teoria de Codificação Dual (Allan Paivio). Processamento síncrono de representações textuais e topográficas.
        - DIRETRIZES DE CONSTRUÇÃO:
          * Uso obrigatório de diagramas estruturais em caixas de texto ou ASCII Art para mapear o fluxo de dados, memória ou ramificações lógicas.
          * Construção de tabelas comparativas explícitas relacionando entradas, transformações lógicas e saídas estruturadas.
          * Hierarquização visual estrita por meio de indentação textual explícita e marcadores espaciais para denotar dependências lógicas.
      `.trim();

    case "deep_dive":
      return `
        [NÚCLEO_COGNITIVO: DEEP_DIVE - COMBATE AO EFEITO DE INVERSÃO DA EXPERIÊNCIA]
        - ESTRATÉGIA: Carga Cognitiva Avançada (John Sweller). Evitar o tédio cognitivo eliminando redundâncias superficiais e simplificações conceituais.
        - DIRETRIZES DE CONSTRUÇÃO:
          * Foco absoluto na arquitetura de baixo nível: manipulação de ponteiros, alocação em memória (Stack vs Heap), escopo léxico, complexidade ciclomática e runtime internals.
          * Uso de analogias sistêmicas robustas e precisão técnica cirúrgica, descartando metáforas abstratas infantis.
          * Inclusão de contrastes analíticos aprofundados demonstrando o impacto de performance e eficiência computacional de abordagens concorrentes.
      `.trim();

    default:
      return `
        [NÚCLEO_COGNITIVO: STANDARD - INSTRUÇÃO DIRETA INDUTIVA]
        - ESTRATÉGIA: Ciclo clássico indutivo de ancoragem progressiva (David Ausubel).
        - DIRETRIZES DE CONSTRUÇÃO:
          * Apresentação imediata de um caso de uso ou bloco de código funcional/bruto em primeiro lugar.
          * Síntese conceitual abstrata e formalização da regra de sintaxe imediatamente após o exemplo prático.
          * Progressão linear contínua conectando de forma clara a lógica atual ao bloco de aprendizado imediatamente anterior.
      `.trim();
  }
}

/**
 * Constrói o prompt final injetando o perfil cognitivo adaptativo e preservando
 * integralmente as diretrizes de estilo e formato personalizadas do curso.
 */
export async function buildCoursePrompt({
  topic,
  learningState,
  courseId,
  userProfile,
  customStyle,
  profile,
}: {
  topic: string;
  learningState: string;
  courseId: string;
  userProfile?: string;
  customStyle?: string;
  profile: CognitiveProfile;
}) {
  const graph = await getKnowledgeGraph(courseId);
  const cognitiveStyle = getCognitiveInstruction(profile);

  const priorityTopics = graph?.nodes
    .filter((node) => (node.mastery || 0) < 0.4)
    .slice(0, 5)
    .map((node) => node.id)
    .join(", ");

  const reinforcementContext = priorityTopics
    ? `\n[MECANISMO_DE_REFORÇO - CORREÇÃO DE LACUNAS]: Integre na explicação ganchos e revisões breves sobre as seguintes deficiências de mastery: ${priorityTopics}.`
    : "";

  // Preserva e consolida o explanationstyle (customStyle) sem permitir que as regras o anulem
  const hasCustomStyle = typeof customStyle === "string" && customStyle.trim().length > 0;

const customDirectiveContext = hasCustomStyle
  ? `\n[RESTRIÇÃO_DE_MÁXIMA_PRIORIDADE - EXPLANATION_STYLE]: O sistema exige que o formato final do texto siga rigorosamente esta estrutura: ${customStyle}. Ajuste a densidade do NÚCLEO_COGNITIVO para harmonizar com este formato, sem omitir suas diretrizes visuais/estruturais.`
  : "";

  return `
    [PERSONA]: Você é o mentor de IA integrado do terminal de codificação cyberpunk Code Ascension. Tom magnético, altamente técnico e cirúrgico.
    
    ${cognitiveStyle}
    ${customDirectiveContext}
    
    [OBJETIVO_PRINCIPAL]: Gerar a carga teórica e de instrução focada exclusivamente no tópico: "${topic}".
    [ESTADO_DE_APRENDIZADO_ATUAL]: ${learningState}
    ${reinforcementContext}
    
    DIRETRIZES GERAIS DE SAÍDA:
    - Retorne RIGOROSAMENTE apenas a payload limpa da lição em formato estruturado (JSON/Markdown válido para parser).
    - Se o nível de Mastery do nó atual for > 80%, pule fundamentações conceituais introdutórias e avance direto para arquiteturas de borda e falhas de estresse de código.
    - Adapte a quebra de parágrafos, comprimento de blocos de texto e uso de marcações de acordo com o [NÚCLEO_COGNITIVO] selecionado.
  `.trim();
}
