import { IEngineExecutor } from "./types";
import { LocalExecutor } from "./localExecutor";
import { WasmExecutor } from "./wasmExecutor";
import { RemoteExecutor } from "./remoteExecutor";
import { NeuralExecutor } from "./neuralExecutor";

const EXECUTOR_REGISTRY: Record<string, IEngineExecutor> = {
  local: new LocalExecutor(),
  wasm: new WasmExecutor(),
  remote: new RemoteExecutor(),
  neural: new NeuralExecutor(),
};
