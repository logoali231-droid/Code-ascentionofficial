import { createJavaCommand } from "./java.js";

export function createKotlinCommand(code) {
  const wrapped = `
class Main {
    companion object {
        @JvmStatic
        fun main(args: Array<String>) {
            ${code}
        }
    }
}
`;

  return createJavaCommand(wrapped);
}