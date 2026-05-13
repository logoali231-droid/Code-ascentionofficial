import { createCSharpCommand } from "./csharp.js";

export function createVBNetCommand(code) {
  return createCSharpCommand(`
using System;

class Program {
    static void Main() {
        Console.WriteLine("VB.NET compatibility mode");
    }
}
`);
}