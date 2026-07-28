"use client";

import { executeCode } from "@/lib/sandbox";

export interface ExerciseTest {
  input: unknown[];
  expectedOutput: unknown;
}

export interface ExerciseExpectedAnswer {
  entryFunction: string;

  tests: ExerciseTest[];

  solutionExample?: string;

  mandatoryTokens?: string[];

  allowedVariations?: string[];
}

export interface ExerciseEvaluationResult {
  passed: boolean;

  totalTests: number;

  passedTests: number;

  failedTests: number;

  error?: string;

  failures?: Array<{
    testIndex: number;
    expected: unknown;
    received?: unknown;
    error?: string;
  }>;
}

/**
 * Avalia um exercício de código usando execução real.
 *
 * A IA apenas cria os testes.
 * A correção é determinística e local/híbrida.
 */
export async function evaluateExerciseCode({
  code,
  language,
  expected,
}: {
  code: string;
  language: string;
  expected: ExerciseExpectedAnswer;
}): Promise<ExerciseEvaluationResult> {
  if (!code.trim()) {
    return {
      passed: false,
      totalTests: expected.tests?.length || 0,
      passedTests: 0,
      failedTests: expected.tests?.length || 0,
      error: "Código vazio.",
    };
  }

  if (
    !expected.entryFunction ||
    !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(expected.entryFunction)
  ) {
    return {
      passed: false,
      totalTests: expected.tests?.length || 0,
      passedTests: 0,
      failedTests: expected.tests?.length || 0,
      error: "Exercício possui entryFunction inválida.",
    };
  }

  if (!Array.isArray(expected.tests) || expected.tests.length === 0) {
    return {
      passed: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      error: "Exercício não possui testes válidos.",
    };
  }

  const normalizedLanguage = language.toLowerCase();

  /*
   * Por enquanto fazemos execução real
   * apenas nos runtimes que o projeto
   * efetivamente possui.
   */
  if (normalizedLanguage !== "javascript" && normalizedLanguage !== "python") {
    return {
      passed: false,
      totalTests: expected.tests.length,
      passedTests: 0,
      failedTests: expected.tests.length,
      error: `Execução de testes ainda não suportada para ${language}.`,
    };
  }

  try {
    if (normalizedLanguage === "javascript") {
      return await evaluateJavaScript(code, expected);
    }

    if (normalizedLanguage === "python") {
      return await evaluatePython(code, expected);
    }

    throw new Error(`Unsupported language: ${language}`);
  } catch (error) {
    return {
      passed: false,
      totalTests: expected.tests.length,
      passedTests: 0,
      failedTests: expected.tests.length,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/* =========================================================
   JAVASCRIPT
========================================================= */

async function evaluateJavaScript(
  code: string,
  expected: ExerciseExpectedAnswer,
): Promise<ExerciseEvaluationResult> {
  const marker = "__CODE_ASCENSION_TEST_RESULT__";

  const tests = JSON.stringify(expected.tests);

  const harness = `
const __codeAscensionTests = ${tests};
const __codeAscensionResults = [];

for (
  let __i = 0;
  __i < __codeAscensionTests.length;
  __i++
) {
  const __test = __codeAscensionTests[__i];

  try {
    const __result =
      ${expected.entryFunction}(
        ...__test.input
      );

    const __passed =
      JSON.stringify(__result) ===
      JSON.stringify(__test.expectedOutput);

    __codeAscensionResults.push({
      testIndex: __i,
      passed: __passed,
      expected: __test.expectedOutput,
      received: __result
    });

  } catch (__error) {

    __codeAscensionResults.push({
      testIndex: __i,
      passed: false,
      expected: __test.expectedOutput,
      error:
        __error instanceof Error
          ? __error.message
          : String(__error)
    });
  }
}

console.log(
  "${marker}" +
  JSON.stringify(__codeAscensionResults)
);
`;

  const result = await executeCode(`${code}\n\n${harness}`, "javascript");

  if (result.error) {
    return {
      passed: false,
      totalTests: expected.tests.length,
      passedTests: 0,
      failedTests: expected.tests.length,
      error: result.error,
    };
  }

  const markerLine = result.output.find((line) => line.startsWith(marker));

  if (!markerLine) {
    return {
      passed: false,
      totalTests: expected.tests.length,
      passedTests: 0,
      failedTests: expected.tests.length,
      error: "O executor não retornou o resultado dos testes.",
    };
  }

  try {
    const parsed = JSON.parse(markerLine.slice(marker.length));

    return buildEvaluationResult(parsed, expected.tests.length);
  } catch {
    return {
      passed: false,
      totalTests: expected.tests.length,
      passedTests: 0,
      failedTests: expected.tests.length,
      error: "Resultado de teste inválido.",
    };
  }
}

/* =========================================================
   PYTHON
========================================================= */

async function evaluatePython(
  code: string,
  expected: ExerciseExpectedAnswer,
): Promise<ExerciseEvaluationResult> {
  const marker = "__CODE_ASCENSION_TEST_RESULT__";

  const testsJson = JSON.stringify(expected.tests);

  /*
   * JSON é válido em Python para os
   * valores simples que os exercícios
   * usam.
   */
  const testsLiteral = testsJson;

  const harness = `
import json

__code_ascension_tests = json.loads(
    '''${escapePythonTripleQuote(testsLiteral)}'''
)

__code_ascension_results = []

for __i, __test in enumerate(
    __code_ascension_tests
):
    try:
        __result = ${expected.entryFunction}(
            *__test["input"]
        )

        __passed = (
            __result ==
            __test["expectedOutput"]
        )

        __code_ascension_results.append({
            "testIndex": __i,
            "passed": __passed,
            "expected": __test["expectedOutput"],
            "received": __result
        })

    except Exception as __error:
        __code_ascension_results.append({
            "testIndex": __i,
            "passed": False,
            "expected": __test["expectedOutput"],
            "error": str(__error)
        })

print(
    "${marker}" +
    json.dumps(__code_ascension_results)
)
`;

  const result = await executeCode(`${code}\n\n${harness}`, "python");

  if (result.error) {
    return {
      passed: false,
      totalTests: expected.tests.length,
      passedTests: 0,
      failedTests: expected.tests.length,
      error: result.error,
    };
  }

  const markerLine = result.output.find((line) => line.startsWith(marker));

  if (!markerLine) {
    return {
      passed: false,
      totalTests: expected.tests.length,
      passedTests: 0,
      failedTests: expected.tests.length,
      error: "O executor não retornou o resultado dos testes.",
    };
  }

  try {
    const parsed = JSON.parse(markerLine.slice(marker.length));

    return buildEvaluationResult(parsed, expected.tests.length);
  } catch {
    return {
      passed: false,
      totalTests: expected.tests.length,
      passedTests: 0,
      failedTests: expected.tests.length,
      error: "Resultado de teste inválido.",
    };
  }
}

/* =========================================================
   RESULT
========================================================= */

function buildEvaluationResult(
  results: any[],
  totalTests: number,
): ExerciseEvaluationResult {
  const passedTests = results.filter((result) => result.passed === true).length;

  const failures = results
    .filter((result) => result.passed !== true)
    .map((result) => ({
      testIndex: result.testIndex,
      expected: result.expected,
      received: result.received,
      error: result.error,
    }));

  return {
    passed: results.length === totalTests && passedTests === totalTests,

    totalTests,

    passedTests,

    failedTests: totalTests - passedTests,

    failures,
  };
}

function escapePythonTripleQuote(value: string): string {
  return value.replace(/'''/g, "\\'\\'\\'");
}
