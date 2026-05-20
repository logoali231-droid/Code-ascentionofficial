import { getCompilerEngine } from "./compilerRegistry";
import { Language } from "./engines";

export function getEngine(language: Language) {
  return getCompilerEngine(language);
}