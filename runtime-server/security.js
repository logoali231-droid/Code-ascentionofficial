function validateCode(code) {
  // Regex para pegar padrões mesmo com espaços extras ou quebras de linha
  const blockedPatterns = [
    /while\s*\(\s*true\s*\)/gi,
    /fork\s*\(/gi,
    /ProcessBuilder/gi,
    /Runtime\.getRuntime/gi,
    /System\.exit/gi,
    /io\.Source\.fromFile/gi // Bloqueio extra para Scala (leitura de arquivos)
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(code)) {
      throw new Error(`Security Violation: Blocked pattern detected (${pattern.source})`);
    }
  }
}

module.exports = { validateCode };