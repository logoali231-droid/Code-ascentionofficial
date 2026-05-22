import { generateManifest } from '../sandbox/workspace/workspaceManifest';
import { loadWorkspaceMetadata } from '../sandbox/workspace/workspaceStorage';
import { getSigner } from '../server/wallet';

export interface WorkspaceSignatureProof {
  workspaceId: string;
  manifestHash: string;
  signature: string;
  signerAddress: string;
  timestamp: number;
}

// Helper nativo para calcular o hash criptográfico do manifesto no browser
async function generateSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera uma identidade criptográfica assinada para o estado atual do Workspace
 */
export async function generateSovereignIdentity(workspaceId: string): Promise<WorkspaceSignatureProof> {


  // 1. Carrega os metadados do OPFS
  const workspace = await loadWorkspaceMetadata(workspaceId);
  if (!workspace) {
    throw new Error(`[Web3Identity] Workspace não encontrado no OPFS: ${workspaceId}`);
  }

  // 2. Gera o manifesto estruturado e calcula o hash real do seu conteúdo
  const manifest = generateManifest(workspace);
  const manifestHash = await generateSHA256(JSON.stringify(manifest));

  // 3. Recupera o client da carteira via Wagmi Core
  const client = await getSigner();

  if (!client) {
    throw new Error("[Web3Identity] Nenhuma carteira criptográfica ativa conectada.");
  }

  const signerAddress = client.account.address;
  const timestamp = Date.now();

  const messageToSign = JSON.stringify({
    domain: "Code Ascension Sovereign Workspace",
    workspaceId,
    manifestHash,
    timestamp
  });
  // workspaceIdentity.ts - Dentro de generateSovereignIdentity
  const chainId = await client.getChainId();
  // Exemplo: Permitir apenas mainnet (1) ou arbitrum (42161)
  if (chainId !== 1 && chainId !== 42161) {
    throw new Error(`[Web3Identity] Assinatura bloqueada em rede não autorizada (ChainID: ${chainId})`);
  }

  console.log(`[Web3Identity] Solicitando assinatura para o Hash: ${manifestHash}`);

  // 4. Executa a assinatura usando a API nativa do Viem/Wagmi
  const signature = await client.signMessage({
    account: client.account,
    message: messageToSign
  });

  return {
    workspaceId,
    manifestHash,
    signature,
    signerAddress,
    timestamp
  };
}