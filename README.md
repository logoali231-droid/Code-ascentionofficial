Code Ascension
Overview

Code Ascension is a browser-native AI-assisted learning and development workspace built around a local-first, hybrid execution architecture.

The platform integrates on-device large language model inference, persistent browser storage, adaptive educational systems, and isolated multi-runtime execution pipelines. Most core interactions are designed to run directly on the client device using Web APIs, WebAssembly runtimes, and dedicated Web Workers, minimizing dependency on permanent cloud inference infrastructure.

Code Ascension operates through a split execution model:

Local-first execution layer: AI inference and tooling run on-device when hardware support is available.
Remote execution layer: An Azure-hosted sandbox runtime is used only when tasks require system-level binaries, compilation toolchains, or isolation constraints that cannot be satisfied in the browser.

This system is designed as a research-grade hybrid runtime for exploring browser-native AI and distributed execution models.

Primary Modes
Learn Mode

Learn Mode is the core educational environment of the platform.

It provides:

AI-assisted explanations and tutoring flows
Adaptive exercises and progression systems
Local-first curriculum state management
Offline-capable learning experiences after model hydration
Browser-side inference via WebLLM
Persistent storage using IndexedDB and OPFS

All learning state is designed to remain available locally whenever possible.

Sandbox Mode

Sandbox Mode is an isolated multi-language execution environment.

It supports:

Browser-native execution (JavaScript / TypeScript)
WebAssembly-based runtimes (e.g. Pyodide Python)
Remote container execution when required
Isolated execution routing across multiple engines

The sandbox system is designed as an extensible execution abstraction layer, with support for heterogeneous runtime backends.

System Status

The platform is functional and actively evolving as a research-driven system. It prioritizes architectural exploration over strict uniform stability across all hardware profiles.

Stable Components
OPFS-based workspace persistence
IndexedDB-based state management
Local file system abstraction layer
JavaScript / TypeScript browser execution
Core WebLLM inference pipeline
Curriculum and progression engine
ZIP import/export workflows
Local caching and workspace restoration
Evolving Components
Mobile WebGPU reliability and driver variability
Long-context inference stability under constrained memory
Thermal-aware execution balancing on mobile devices
Multi-language sandbox orchestration
Remote runtime scaling behavior
Worker lifecycle stability under rapid model switching
Memory pressure recovery strategies
Background tab restoration consistency
Python execution stability in constrained environments
System Constraints

Browser-based execution introduces inherent constraints that are treated as platform-level characteristics:

Memory pressure can trigger tab termination or reloads
WebGPU behavior varies significantly across devices and drivers
Mobile environments may enforce aggressive resource reclamation
Long-running inference sessions may degrade under thermal constraints
Worker lifecycle may be interrupted under system memory pressure

These behaviors are considered part of the execution environment rather than application-level faults.

Design Goals
Minimize dependency on always-on cloud inference systems
Preserve local-first execution whenever hardware permits
Maintain persistent educational context on-device
Provide a browser-accessible development environment without native installation
Support heterogeneous execution across browser-native and remote runtimes
Explore hybrid local/remote AI execution strategies
Enable partially offline educational workflows
Hybrid Execution Model

Certain workloads require capabilities beyond browser constraints, including:

Native system binaries
Process isolation beyond WebWorker boundaries
Compilation toolchains
OS-level runtime control

For these cases, execution is delegated to a remote container runtime. Complete removal of remote infrastructure is not currently feasible without significantly reducing supported languages and execution fidelity.

Architecture

Code Ascension is composed of two primary layers:

Browser-native client runtime
Optional remote execution gateway
1. Browser Workspace & Persistent Storage

The workspace layer is built on the Origin Private File System (OPFS) via navigator.storage.getDirectory().

It provides:

Persistent workspace storage
Recursive file system traversal
Snapshot and state tracking
ZIP-based import/export pipelines
Integrity validation flows

Core modules:

workspaceStorage.ts
workspaceManager.ts
workspaceSnapshot.ts
workspaceManifest.ts
exportProject.ts
importProject.ts

The system is designed to operate independently of external storage providers for core persistence.

2. Sandbox Execution System

Execution is abstracted through a unified IEngineExecutor interface.

Each executor processes:

Source code
Language identifier
Optional abort signal

and returns a standardized SandboxResult.

Execution Backends

LocalExecutor
Browser-native execution for JavaScript and TypeScript.

WasmExecutor
WebAssembly-based execution (e.g. Pyodide Python runtime).

RemoteExecutor
Delegates execution to isolated container infrastructure when required.

NeuralExecutor
Provides heuristic AI-assisted simulation for unsupported or partial execution contexts.
This layer is not equivalent to deterministic runtime execution.

3. Remote Runtime Infrastructure

Located in runtime-server/, the remote layer provides containerized execution for workloads requiring native capabilities.

Characteristics
Queue-based execution orchestration
Docker-isolated containers
HTTP/WebSocket interface
Azure VM deployment
Strict CPU and memory quotas
Resource Limits
memory_light: 256MB
memory_heavy: 512MB
CPU: 0.5 cores
Timeout: 15s

These constraints are designed to ensure system stability, prevent runaway execution, and control infrastructure cost.

4. Local AI Inference Pipeline

Local inference is powered by WebLLM running inside isolated Web Workers.

Model Routing (Adaptive)
LOW: Qwen2.5 0.5B
MID: Phi-3 Mini
HIGH: Phi-3.5 Mini
Runtime Signals
Available system memory
WebGPU availability
CPU concurrency
SharedArrayBuffer support
Device class detection

The system dynamically loads and unloads models to reduce memory pressure and prevent browser instability.

5. Worker Isolation Strategy

Dedicated workers handle heavy workloads:

webllm.worker.ts
sandbox.worker.ts
pythonWorker.ts
logic.worker.ts

Mitigation strategies include:

Visibility-based suspension
Memory-pressure-driven cleanup
Progressive model loading
IndexedDB model caching
Controlled model swapping windows
Worker lifecycle isolation
6. Privacy Model

By default:

Prompts remain local during on-device inference
Workspace data is stored in browser storage
Curriculum state persists via IndexedDB

Remote communication occurs only for:

Sandbox execution
Model downloads
External package retrieval

The system does not claim full air-gapped operation.

7. Sustainability Notes

The platform explores reducing reliance on continuous cloud inference by shifting compatible workloads to local hardware.

Local inference introduces trade-offs:

Increased device thermal load
Large model download sizes
Higher energy usage on low-end devices
Browser-dependent efficiency variability

Telemetry-based estimates attempt to approximate:

Local inference energy cost
Avoided cloud requests
CO₂ displacement estimates

These metrics are approximate and not scientifically validated.

Technical Stack
Frontend
React 18
Next.js 15
TypeScript 5
TailwindCSS 4
Local Runtime
WebLLM
WebGPU
Pyodide
Web Workers API
Persistence
OPFS
IndexedDB
Dexie
JSZip
Remote Runtime
Docker
Node.js 20
Azure VM infrastructure
Azure Cosmos DB
Web3 Layer
Ethers
Viem
Wagmi
WalletConnect
Operational Constraints
Browser Requirements

Modern APIs required:

WebGPU
OPFS
SharedArrayBuffer
WebAssembly

Legacy environments may experience reduced functionality.

Mobile Behavior

Mobile browsers represent the most constrained execution environment.

Mitigation systems include:

Thermal-aware heuristics
Automatic worker cleanup
Reduced context windows
Memory pressure adaptation

Despite this, instability may still occur under heavy inference workloads.

Remote Dependency

Some execution flows depend on the remote runtime layer.

Full removal of remote infrastructure would significantly reduce supported languages and execution fidelity.

References
WebLLM: https://github.com/mlc-ai/web-llm
WebLLM Paper: https://arxiv.org/abs/2412.15803
WebGPU Spec: https://www.w3.org/TR/webgpu/
