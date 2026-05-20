import { Language } from "./types";
import { getCompilerEngine } from "./compilerRegistry";

export function getEngine(language: Language) {
  return getCompilerEngine(language);
}