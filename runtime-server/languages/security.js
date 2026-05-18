// security.js
function validateCode(code) {
  if (typeof code !== "string") {
    throw new Error("Security Violation: Código inválido.");
  }

  const blockedPatterns = [
    /while\s*\(\s*(true|1)\s*\)/gi,
    /for\s*\(\s*;\s*;\s*\)/gi, // Loops infinitos estruturais
    /fork\s*\(/gi, // Fork bombs genéricos
    /ProcessBuilder/gi, // Shell injection Java/Kotlin
    /Runtime\.getRuntime/gi,
    /System\.exit/gi,
    /io\.Source\.fromFile/gi, // Escapes de file system no Scala
    /__import__\s*\(\s*['"]os['"]\s*\)/gi, // Escapes Python comuns
    /child_process|require\s*\(\s*['"]fs['"]\s*\)/gi, // Escapes em Node.js
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(code)) {
      throw new Error(
        `Security Violation: Padrão malicioso detectado (${pattern.source})`,
      );
    }
  }
}

module.exports = { validateCode };
