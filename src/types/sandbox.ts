export type SandboxEvent = 
  | { type: 'EXECUTION_START'; payload: { engine: string; timestamp: number } }
  | { type: 'STDOUT'; payload: { data: string; stream: 'stdout' | 'stderr' } }
  | { type: 'FILE_CHANGE'; payload: { path: string; content: string; hash: string } }
  | { type: 'ERROR'; payload: { code: string; message: string; fatal: boolean } }
  | { type: 'SESSION_READY'; payload: { sessionId: string } };
