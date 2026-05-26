Code Ascension

Overview

Code Ascension is a browser-native AI-assisted learning and development workspace built around an offline-first hybrid architecture.

The platform combines local large language model inference, persistent browser-side storage, adaptive educational systems, and isolated multi-runtime execution pipelines. Most core interactions are designed to execute directly on the client device through browser APIs, WebAssembly runtimes, and dedicated workers instead of relying on permanent cloud inference infrastructure.

Code Ascension currently operates through a split execution model:

Local AI inference and browser-native tooling run directly on-device whenever hardware support is available.

A remote Azure-hosted runtime is activated only when sandbox execution requires languages, binaries, or process isolation that cannot realistically execute inside browser environments.


The project remains experimental in several areas, particularly around browser-side inference stability, mobile WebGPU behavior, and hybrid runtime orchestration.


---

Primary Modes

Learn Mode

Learn Mode is the primary educational environment of the platform.

It focuses on:

AI-assisted explanations

adaptive exercises

local-first curriculum progression

offline-capable learning flows

browser-side inference through WebLLM

IndexedDB-based persistence and restoration


Most educational interactions are designed to continue functioning locally after initial model acquisition and cache hydration.

Sandbox Mode

Sandbox Mode is an isolated execution environment designed for multi-language code execution.

It supports:

browser-native execution

WebAssembly-based runtimes

containerized remote execution

isolated runtime orchestration

experimental multi-engine execution routing


Certain languages execute fully inside the browser while others require remote container delegation.

The sandbox subsystem is currently considered experimental.


---

Current Project Status

The project is functional but still under active architectural experimentation.

Stable / Mostly Stable Areas

OPFS-based workspace persistence

Local file tree management

IndexedDB persistence layers

Browser-native JavaScript/TypeScript execution

Basic WebLLM inference flows

Curriculum and progression systems

Local caching and offline restoration flows

ZIP-based workspace export/import flows


Experimental / Incomplete Areas

Mobile WebGPU stability

Large model loading on constrained devices

Long-running inference sessions

Thermal-aware resource balancing

Multi-language sandbox orchestration

Remote runtime autoscaling behavior

Worker lifecycle edge cases during rapid model swaps

Browser memory pressure recovery

Background tab restoration reliability

Browser-side Python runtime stability under heavy load


The project intentionally prioritizes architectural experimentation over guaranteed runtime consistency across all hardware profiles.


---

Known Failure Cases

The following failure scenarios are currently known:

Mobile browser termination during large model initialization

WebGPU adapter initialization failures

Driver-specific shader compilation instability

Browser tab reloads caused by memory pressure

Worker termination during aggressive browser memory reclamation

Slow cold-start model compilation on lower-end devices

Partial runtime instability during repeated model swaps

Container queue saturation under concurrent sandbox execution

Pyodide startup latency spikes on weaker mobile CPUs

Long-running local inference sessions degrading over time on constrained VRAM environments


Some instability is currently treated as a platform limitation of browser-side inference rather than a fully solvable application-layer issue.


---

Design Goals

Reduce dependency on always-on cloud inference systems

Preserve local-first interaction flows whenever hardware allows

Keep educational context and workspace state on-device by default

Provide a browser-accessible programming environment without requiring native installation

Support isolated execution environments for languages unavailable in browser-native runtimes

Explore lower-infrastructure AI workflows using hybrid local/remote execution paths

Experiment with browser-native educational systems operating partially offline



---

Why Hybrid Instead of Fully Local?

Certain languages and execution environments still require:

native system binaries

process isolation

compilation toolchains

runtime capabilities unavailable inside browser sandboxes

operating system level process management


For this reason, some execution flows are delegated to isolated remote containers when browser-native execution is not technically viable.

Complete removal of remote infrastructure is not currently feasible without substantially reducing runtime and language support.


---

Architecture

Code Ascension operates as a split architecture composed of:

1. A browser-native client runtime


2. An optional remote container execution gateway




---

1. Browser Workspace & Persistent Storage

The workspace layer is built over the Origin Private File System (OPFS) using the navigator.storage.getDirectory() API.

Primary responsibilities include:

persistent workspace storage

recursive file traversal

runtime synchronization

snapshot tracking

ZIP-based import/export pipelines

integrity verification flows


Core modules under src/lib/sandbox/workspace/ include:

workspaceStorage.ts

workspaceManager.ts

workspaceSnapshot.ts

workspaceManifest.ts

exportProject.ts

importProject.ts


The workspace layer intentionally avoids depending on remote storage providers for standard project persistence.


---

2. Sandbox Execution System

Execution flows are abstracted through a typed IEngineExecutor interface.

Each executor consumes:

source code

language identifier

optional abort signal


and returns a standardized SandboxResult.

Current execution backends include:

LocalExecutor

Executes browser-native interpreted runtimes such as:

JavaScript

TypeScript


WasmExecutor

Executes languages compiled to WebAssembly environments, including:

Pyodide-based Python execution


RemoteExecutor

Routes execution requests to isolated remote containers when:

native browser execution is unavailable

compilation requires system binaries

runtime isolation exceeds browser sandbox limitations


The remote runtime is not permanently active and is only used when sandbox execution explicitly requires it.

NeuralExecutor

Provides heuristic AI-assisted analysis and partial simulation behavior for unsupported or partially supported execution flows.

This layer should not be treated as equivalent to real runtime execution.


---

3. Remote Runtime Infrastructure

The remote runtime exists under runtime-server/.

It provides isolated container execution for languages requiring:

native compilation

system-level binaries

isolated runtime processes


Current Characteristics

Queue-driven execution orchestration

Docker-isolated runtime containers

HTTP/WebSocket gateway

Explicit runtime memory and CPU limits

Azure VM-hosted infrastructure


Runtime Limits

The runtime intentionally enforces conservative resource ceilings:

memory_light: "256m"
memory_heavy: "512m"
cpus: "0.5"
timeout: 15000

These limits primarily exist to:

reduce abuse surface

limit runaway execution

control infrastructure cost

reduce container exhaustion during concurrent execution


As a result, heavier workloads may fail or terminate early.


---

4. Local AI Inference Pipeline

Local inference is powered by WebLLM running through isolated Web Workers.

Current model routing is hardware-adaptive and selected through runtime heuristics.

Tier	Example Model

LOW	Qwen2.5 0.5B
MID	Phi-3 Mini
HIGH	Phi-3.5 Mini


The runtime dynamically evaluates:

available RAM

WebGPU availability

CPU concurrency

SharedArrayBuffer support

mobile device detection


The platform aggressively unloads models and workers under memory pressure to reduce browser crashes and mobile tab termination events.

Current Constraints

Local inference reliability depends heavily on:

browser implementation quality

GPU driver stability

available VRAM

thermal throttling behavior

mobile memory policies


Some devices may still encounter:

"Aw, Snap" crashes

WebGPU adapter failures

forced tab reloads

incomplete model initialization

worker termination during inference


Browser-side LLM inference remains highly dependent on vendor GPU drivers and browser runtime behavior.


---

5. Worker Isolation Strategy

Heavy operations are separated into dedicated workers including:

webllm.worker.ts

sandbox.worker.ts

pythonWorker.ts

logic.worker.ts


Current mitigation strategies include:

worker termination on unload

visibility-based cleanup

progressive model loading

IndexedDB model caching

memory pressure heuristics

unload windows between model swaps


These systems reduce instability but do not eliminate it completely.


---

6. Privacy Model

By default:

prompts remain local during browser-side inference

workspace files remain inside browser storage

curriculum state persists locally through IndexedDB


Remote communication occurs only when required for:

sandbox runtime execution

model downloads

blockchain interactions

external package/runtime retrieval


The platform does not currently claim complete air-gapped execution capability.


---

7. Sustainability Notes

The project experiments with reducing continuous datacenter inference usage by shifting compatible workloads to local hardware.

However, local inference is not computationally free:

mobile GPU usage increases thermal load

model downloads can be large

weaker devices may consume disproportionate energy during inference

browser-side inference may trade datacenter energy consumption for client-side power consumption


The application includes heuristic telemetry attempting to estimate:

local inference energy usage

avoided cloud requests

approximate CO₂ offsets


These values are approximations only and should not be interpreted as scientific measurements.


---

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



---

Operational Constraints

Browser Support

The project depends on modern browser APIs including:

WebGPU

OPFS

SharedArrayBuffer

WebAssembly


Older browsers or restricted mobile environments may lose major functionality.

Mobile Stability

Mobile browsers remain the least reliable execution target.

Current mitigation systems include:

thermal-aware heuristics

automatic worker unloads

memory pressure cleanup

reduced context windows on mobile


Despite these mitigations, lower-end devices may still experience instability during:

model initialization

long inference sessions

repeated model swaps

background tab restoration


Remote Runtime Dependency

Although much of the platform is local-first, some languages and execution flows still depend on the remote runtime layer.

Complete removal of remote infrastructure is not currently feasible without substantially reducing language/runtime support.


---

References

[WebLLM Repository](https://github.com/mlc-ai/web-llm?utm_source=chatgpt.com)

[WebLLM Paper (arXiv)](https://arxiv.org/abs/2412.15803?utm_source=chatgpt.com)

[WebGPU Specification](https://www.w3.org/TR/webgpu/?utm_source=chatgpt.com)
