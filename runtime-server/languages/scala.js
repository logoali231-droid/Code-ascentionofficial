import { createJavaCommand } from "./java.js";

export function createScalaCommand(code) {
  return createJavaCommand(`
public class Main {
    public static void main(String[] args) {
        System.out.println("Scala compatibility layer");
    }
}
`);
}