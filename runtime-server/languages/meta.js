// languages/meta.js
const CONFIG = require("./config");

const LANGUAGE_METADATA = {
  // === PADRÃO CLI (INTERPRETADAS / RÚSTICAS) ===
  node: {
    type: "cli",
    image: "node:20-alpine",
    cmd: (esc) => `node -e "${esc}"`,
    escapeBacktick: true,
  },
  javascript: {
    type: "cli",
    image: "node:20-alpine",
    cmd: (esc) => `node -e "${esc}"`,
    escapeBacktick: true,
  },
  js: {
    type: "cli",
    image: "node:20-alpine",
    cmd: (esc) => `node -e "${esc}"`,
    escapeBacktick: true,
  },

  python: {
    type: "cli",
    image: "python:3.12-alpine",
    cmd: (esc) => `python -c "${esc}"`,
  },
  py: {
    type: "cli",
    image: "python:3.12-alpine",
    cmd: (esc) => `python -c "${esc}"`,
  },

  php: {
    type: "cli",
    image: "php:8-cli-alpine",
    cmd: (esc) => `php -r "${esc}"`,
  },

  ruby: {
    type: "cli",
    image: "ruby:3.3-alpine",
    cmd: (esc) => `ruby -e "${esc}"`,
  },
  perl: {
    type: "cli",
    image: "perl:5.38-alpine",
    cmd: (esc) => `perl -e "${esc}"`,
  },
  lua: {
    type: "cli",
    image: "alpine:latest",
    cmd: (esc) => `sh -c "apk add --no-cache lua && lua -e '${esc}'"`,
  },
  bash: { type: "cli", image: "bash:5.2", cmd: (esc) => `bash -c "${esc}"` },
  shell: { type: "cli", image: "bash:5.2", cmd: (esc) => `bash -c "${esc}"` },
  powershell: {
    type: "cli",
    image: "mcr.microsoft.com/powershell:lts-alpine-3.17",
    cmd: (esc) => `pwsh -Command "${esc}"`,
  },
  tcl: {
    type: "cli",
    image: "alpine:latest",
    cmd: (esc) => `sh -c "apk add --no-cache tcl && tclsh <(echo '${esc}')"`,
  },

  // === PADRÃO TEMP (COMPILADAS / EXIGEM ARQUIVO NO DISCO) ===
  kotlin: {
    type: "temp",
    ext: "Main.kt",
    image: "gradle:8.7-jdk21",
    memory: "heavy",
    cmd: "kotlinc Main.kt -include-runtime -d main.jar && java -jar main.jar",
  },
  kt: {
    type: "temp",
    ext: "Main.kt",
    image: "gradle:8.7-jdk21",
    memory: "heavy",
    cmd: "kotlinc Main.kt -include-runtime -d main.jar && java -jar main.jar",
  },

  scala: {
    type: "temp",
    ext: "Main.scala",
    image: "sbtscala/scala-sbt",
    memory: "light",
    cmd: "scalac Main.scala && scala Main",
  },

  c: {
    type: "temp",
    ext: "main.c",
    image: "gcc:13-alpine",
    memory: "light",
    cmd: "gcc main.c -o main && ./main",
  },
  cpp: {
    type: "temp",
    ext: "main.cpp",
    image: "gcc:13-alpine",
    memory: "light",
    cmd: "g++ main.cpp -o main && ./main",
  },

  go: {
    type: "temp",
    ext: "main.go",
    image: "golang:1.22-alpine",
    memory: "light",
    cmd: "go run main.go",
  },

  rust: {
    type: "temp",
    ext: "main.rs",
    image: "rust:1.75-alpine",
    memory: "heavy",
    cmd: "rustc main.rs -o main && ./main",
  },

  zig: {
    type: "temp",
    ext: "main.zig",
    image: "alpine:latest",
    memory: "light",
    cmd: "apk add --no-cache zig && zig run main.zig",
  },

  csharp: {
    type: "temp",
    ext: "Program.cs",
    image: "mcr.microsoft.com/dotnet/sdk:8.0-alpine",
    memory: "heavy",
    cmd: "dotnet new console --force && mv Program.cs Old.cs && echo 'using System;' > Program.cs && cat Old.cs >> Program.cs && dotnet run",
  },
  vbnet: {
    type: "temp",
    ext: "program.vb",
    image: "mono:6.12-slim",
    memory: "heavy",
    cmd: "vbnc program.vb && mono program.exe",
  },
  vb: {
    type: "temp",
    ext: "program.vb",
    image: "mono:6.12-slim",
    memory: "heavy",
    cmd: "vbnc program.vb && mono program.exe",
  },

  cobol: {
    type: "temp",
    ext: "main.cob",
    image: "alpine:latest",
    memory: "light",
    cmd: "apk add --no-cache gnu-cobol && cobc -x -o main main.cob && ./main",
  },
  fortran: {
    type: "temp",
    ext: "main.f90",
    image: "gcc:13-alpine",
    memory: "light",
    cmd: "gfortran main.f90 -o main && ./main",
  },

  pascal: {
    type: "temp",
    ext: "main.pas",
    image: "alpine:latest",
    memory: "light",
    cmd: "apk add --no-cache fpc && fpc main.pas && ./main",
  },
  delphi: {
    type: "temp",
    ext: "main.pas",
    image: "alpine:latest",
    memory: "light",
    cmd: "apk add --no-cache fpc && fpc main.pas && ./main",
  },

  haskell: {
    type: "temp",
    ext: "main.hs",
    image: "haskell:9.6-alpine",
    memory: "heavy",
    cmd: "ghc main.hs -o main && ./main",
  },
  julia: {
    type: "temp",
    ext: "main.jl",
    image: "julia:1.10-alpine",
    memory: "heavy",
    cmd: "julia main.jl",
  },
  r: {
    type: "temp",
    ext: "main.R",
    image: "r-base:4.3",
    memory: "heavy",
    cmd: "Rscript main.R",
  },

  elixir: {
    type: "temp",
    ext: "main.exs",
    image: "elixir:1.16-alpine",
    memory: "light",
    cmd: "elixir main.exs",
  },
  erlang: {
    type: "temp",
    ext: "main.erl",
    image: "erlang:26-alpine",
    memory: "light",
    cmd: "erl -noshell -s main start -s init stop",
  },
  clojure: {
    type: "temp",
    ext: "main.clj",
    image: "clojure:tools-deps-alpine",
    memory: "heavy",
    cmd: "clojure -M main.clj",
  },
  lisp: {
    type: "temp",
    ext: "main.lisp",
    image: "alpine:latest",
    memory: "light",
    cmd: "apk add --no-cache sbcl && sbcl --script main.lisp",
  },
  prolog: {
    type: "temp",
    ext: "main.pl",
    image: "alpine:latest",
    memory: "light",
    cmd: "apk add --no-cache swi-prolog && swipl -q -t main -f main.pl",
  },

  solidity: {
    type: "temp",
    ext: "main.sol",
    image: "ethereum/solc:stable",
    memory: "light",
    cmd: "solc --bin main.sol",
  },
  assembly: {
    type: "temp",
    ext: "main.asm",
    image: "alpine:latest",
    memory: "light",
    cmd: "apk add --no-cache nasm gcc musl-dev && nasm -f elf64 main.asm && gcc main.o -o main -nostdlib && ./main",
  },
};

module.exports = { LANGUAGE_METADATA };
