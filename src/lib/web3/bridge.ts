import { exportWorkspace } from '../sandbox/workspace/workspaceExporter';
import { generateSovereignIdentity } from './workspaceIdentity';


export interface DecentraspaceBridgeResult {
    storageProvider: 'ipfs' | 'arweave';
    cid: string;
    uri: string;
    identityProof: any;
}

/**
 * Executa o upload do workspace compactado para armazenamento descentralizado permanente
 */
export async function pushWorkspaceToDecentralizedStorage(
    workspaceId: string,
    provider: 'ipfs' | 'arweave' = 'ipfs'
): Promise<DecentraspaceBridgeResult> {
    console.log(`[Bridge] Iniciando exportação física do Workspace: ${workspaceId}`);

    // 1. Extrai o blob binário compactado direto do OPFS
    // Força o TypeScript a aceitar o objeto como Blob para desbloquear a compilação do FormData
    const zipBlob = (await exportWorkspace(workspaceId)) as unknown as Blob;
    // 2. Anexa a identidade criptográfica assinada pelo desenvolvedor
    const identityProof = await generateSovereignIdentity(workspaceId);

    // 3. Prepara o FormData para transmissão via Gateway Descentralizado Dedicado
    const formData = new FormData();
    formData.append('file', zipBlob, `workspace-${workspaceId}-${identityProof.timestamp}.zip`);
    formData.append('meta', JSON.stringify(identityProof));

    // Escolha do endpoint do gateway baseado no provedor escolhido (ex: Pinata/Infura ou Irys/Bundlr Network)
    const endpoint = provider === 'ipfs'
        ? '/api/web3/storage/ipfs-pin'
        : '/api/web3/storage/arweave-upload';

    console.log(`[Bridge] Despachando binários via gateway: ${endpoint}`);

    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`[Bridge] Falha no transporte de dados descentralizados. HTTP Status: ${response.status}`);
    }

    const data = await response.json();

    return {
        storageProvider: provider,
        cid: data.cid, // Content Identifier retornado
        uri: data.uri, // URI permanente gerada (ipfs://... ou ar://...)
        identityProof
    };
}