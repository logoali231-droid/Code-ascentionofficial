/* eslint-disable no-restricted-globals */
import { calculateDiscount, processInventory } from "./aiShop";
import { save, get } from "./db";

/**
 * Worker de Loja Otimizado - Code Ascension
 * Responsável por transações atômicas para evitar lag no Samsung M23.
 */
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "PURCHASE_ITEM") {
    try {
      // 1. Recuperação de Estado (Fora da Main Thread)
      const user = await get("user", "main");
      if (!user) throw new Error("USER_NOT_FOUND");

      const item = payload.item;
      const currentCoins = user.coins || 0;

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
      self.postMessage({ 
        type: "PURCHASE_ERROR", 
        error: err instanceof Error ? err.message : "Erro na transação neural." 
      });
    }
  }

  // Funcionalidade Extra: Sincronização de Preços IA em Background
  if (type === "REFRESH_PRICES") {
    const user = await get("user", "main");
    const items = payload.items.map((it: any) => ({
      ...it,
      currentPrice: calculateDiscount(it.price, user?.faction)
    }));
    self.postMessage({ type: "PRICES_UPDATED", payload: { items } });
  }
};

export default {};
