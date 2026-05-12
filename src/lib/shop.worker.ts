/**
 * Shop Worker - Code Ascension
 * Processa lógica de economia, buffs de prestígio e transações.
 */
import { calculateDiscount, processInventory } from "./aiShop";

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case "CALCULATE_TOTAL":
        // Processa descontos baseados na reputação da facção
        const finalPrice = await calculateDiscount(payload.price, payload.factionId);
        self.postMessage({ type: "PRICE_CALCULATED", finalPrice });
        break;

      case "PROCESS_PURCHASE":
        // Simula processamento de inventário pesado
        const updatedInventory = await processInventory(payload.itemId, payload.currentInventory);
        self.postMessage({ type: "PURCHASE_COMPLETE", updatedInventory });
        break;

      default:
        console.warn("[Shop Worker] Tipo de mensagem desconhecido:", type);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: "SHOP_ERROR", error: errorMessage });
  }
};
