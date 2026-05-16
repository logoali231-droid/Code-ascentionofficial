/* eslint-disable no-restricted-globals */
import { calculateDiscount, processInventory } from "../aiShop";
import { save, get } from "../db";

/**
 * Worker de Loja Otimizado - Code Ascension
 * Responsável por transações atômicas seguras com suporte a cancelamento em checkpoints.
 */

let shopTransactionAborted = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "ABORT") {
    console.log("[Shop Worker] Sinal de aborto recebido para a transação atual.");
    shopTransactionAborted = true;
    return;
  }

  if (type === "PURCHASE_ITEM") {
    shopTransactionAborted = false; // Reseta para a nova transação
    
    try {
      // Checkpoint 1: Antes de ler dados pesados do banco
      if (shopTransactionAborted) return;

      // 1. Recuperação de Estado (Fora da Main Thread)
      const user = await get("user", "main");
      if (!user) throw new Error("USER_NOT_FOUND");

      const item = payload.item;
      const currentCoins = user.coins || 0;

      // Checkpoint 2: Antes de computar a lógica de inventário
      if (shopTransactionAborted) return;

      // 2. Cálculo de Preço com Desconto de Facção
      const finalPrice = calculateDiscount(item.price, user.faction);

      // 3. Validações de Segurança
      if (currentCoins < finalPrice) {
        self.postMessage({ type: "PURCHASE_ERROR", error: "Moedas insuficientes!" });
        return;
      }

      if (user.level < (item.requiredLevel || 0)) {
        self.postMessage({ type: "PURCHASE_ERROR", error: "Nível insuficiente!" });
        return;
      }

      // 4. Processamento de Inventário (Lógica de Pilha/Chips)
      const updatedInventory = processInventory(user.inventory || [], item);

      // Checkpoint Critico 3: Ponto limite de não-retorno. 
      // Se o usuário mudou de aba até aqui, nós paramos sem alterar o IndexedDB.
      if (shopTransactionAborted) {
        console.log("[Shop Worker] Transação abortada com segurança antes da escrita no DB.");
        return;
      }

      // 5. Persistência Atômica
      const updatedUser = {
        ...user,
        coins: currentCoins - finalPrice,
        inventory: updatedInventory,
        lastTransaction: Date.now()
      };

      await save("user", "main", updatedUser);

      // 6. Resposta de Sucesso
      self.postMessage({ 
        type: "PURCHASE_SUCCESS", 
        payload: { 
          newBalance: updatedUser.coins,
          itemName: item.name 
        } 
      });

    } catch (err) {
      if (shopTransactionAborted) return;
      
      self.postMessage({ 
        type: "PURCHASE_ERROR", 
        error: err instanceof Error ? err.message : "Erro na transação neural." 
      });
    }
  }

  // Sincronização de Preços IA em Background
  if (type === "REFRESH_PRICES") {
    if (shopTransactionAborted) return;

    const user = await get("user", "main");
    const items = payload.items.map((it: any) => ({
      ...it,
      currentPrice: calculateDiscount(it.price, user?.faction)
    }));

    if (shopTransactionAborted) return;

    self.postMessage({ type: "PRICES_UPDATED", payload: { items } });
  }
};

export default {};