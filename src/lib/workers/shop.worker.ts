/* eslint-disable no-restricted-globals */
import { save, get } from "../db";

let shopTransactionAborted = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "ABORT") {
    shopTransactionAborted = true;
    return;
  }

  if (type === "PURCHASE_ITEM") {
    shopTransactionAborted = false;

    try {
      if (shopTransactionAborted) return;

      const user = await get("user", "main");
      if (!user) throw new Error("USER_NOT_FOUND");

      const item = payload.item;
      const userCoins = user.coins || 0;
      const basePrice = item.price || 0;

      // --- ABSORVIDO DE ECONOMY.TS (Lógica de Precificação Dinâmica) ---
      // 1. Barreira de capital baseada no acumulo de moedas
      const capitalBarrierMultiplier = 1 + Math.sqrt(userCoins / 100000);
      // 2. Escalonamento procedural por nível
      const levelScaling = 1 + (user.level || 1) * 0.03;
      // 3. Preço final calculado em thread isolada
      const finalPrice = Math.floor(
        basePrice * levelScaling * capitalBarrierMultiplier,
      );

      if (shopTransactionAborted) return;

      if (userCoins < finalPrice) {
        self.postMessage({
          type: "PURCHASE_ERROR",
          error: "Moedas insuficientes para o valor inflacionado!",
        });
        return;
      }

      if (user.level < (item.requiredLevel || 0)) {
        self.postMessage({
          type: "PURCHASE_ERROR",
          error: "Nível de autorização insuficiente!",
        });
        return;
      }

      // --- GERENCIAMENTO DE PILHA DE INVENTÁRIO ---
      const inventory = [...(user.inventory || [])];
      const isChip = item.type === "chip";
      const existingIndex = isChip
        ? -1
        : inventory.findIndex((i: any) => i.id === item.id);

      if (existingIndex > -1) {
        inventory[existingIndex].quantity =
          (inventory[existingIndex].quantity || 1) + 1;
      } else {
        const newItem = {
          ...item,
          quantity: 1,
          acquiredAt: Date.now(),
          ...(isChip && {
            durability: item.maxDurability || 100,
            maxDurability: item.maxDurability || 100,
          }),
        };
        inventory.push(newItem);
      }

      if (shopTransactionAborted) return;

      // --- PERSISTÊNCIA ATÔMICA ---
      const updatedUser = {
        ...user,
        coins: userCoins - finalPrice,
        inventory,
      };

      // Executa a função global de persistência do db.ts mapeada
      await save("user", "main", updatedUser);

      self.postMessage({
        type: "PURCHASE_SUCCESS",
        payload: {
          newBalance: updatedUser.coins,
          itemName: item.name,
        },
      });
    } catch (err) {
      if (shopTransactionAborted) return;
      self.postMessage({
        type: "PURCHASE_ERROR",
        error:
          err instanceof Error
            ? err.message
            : "Falha no barramento de transação.",
      });
    }
  }
};

export default {};
