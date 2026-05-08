"use client";

import { get, save, updateUser } from "./db";
import { playSound } from "./sounds";
import { calculateLevel } from "./level";

import {
  InventoryItem,
  UserStats,
} from "@/types";

/**
 * =========================================
 * RANK SYSTEM
 * =========================================
 */

export type RankTier =
  | "Initiate"
  | "Operator"
  | "Architect"
  | "Ghost"
  | "Overmind";

export const RANKS: {
  name: RankTier;
  minLevel: number;
  color: string;
}[] = [
  {
    name: "Initiate",
    minLevel: 1,
    color: "#94a3b8",
  },

  {
    name: "Operator",
    minLevel: 5,
    color: "#22c55e",
  },

  {
    name: "Architect",
    minLevel: 12,
    color: "#3b82f6",
  },

  {
    name: "Ghost",
    minLevel: 25,
    color: "#a855f7",
  },

  {
    name: "Overmind",
    minLevel: 40,
    color: "#f59e0b",
  },
];

/**
 * =========================================
 * XP CURVE
 * =========================================
 *
 * Prevents infinite inflation.
 * Makes progression slower later.
 */

function computeXPReward(
  base: number,
  level: number
) {
  /*
    Soft diminishing returns
  */

  const scaling =
    1 / (1 + level * 0.015);

  return Math.max(
    5,
    Math.floor(base * scaling)
  );
}

/**
 * =========================================
 * COIN CURVE
 * =========================================
 */

function computeCoinReward(
  base: number,
  level: number
) {
  const scaling =
    1 / (1 + level * 0.02);

  return Math.max(
    2,
    Math.floor(base * scaling)
  );
}

/**
 * =========================================
 * RANK HELPERS
 * =========================================
 */

export function getRankFromLevel(
  level: number
): RankTier {
  let current: RankTier =
    "Initiate";

  for (const rank of RANKS) {
    if (level >= rank.minLevel) {
      current = rank.name;
    }
  }

  return current;
}

export function getNextRank(
  level: number
) {
  return RANKS.find(
    (r) => r.minLevel > level
  );
}

/**
 * =========================================
 * MASTERY SYSTEM
 * =========================================
 */

export function computeMastery(
  xp: number,
  streak: number
) {
  /*
    Mastery is intentionally slow.
    Prevents instant maxing.
  */

  const xpFactor =
    Math.min(70, xp / 250);

  const streakFactor =
    Math.min(30, streak * 2);

  return Math.min(
    100,
    Math.floor(
      xpFactor + streakFactor
    )
  );
}

/**
 * =========================================
 * EXECUTION QUEUE
 * =========================================
 */

let transactionQueue:
  Promise<any> =
    Promise.resolve();

async function enqueueTransaction<T>(
  task: () => Promise<T>
): Promise<T> {
  const result =
    transactionQueue.then(task);

  transactionQueue =
    result.catch((err) => {
      console.error(
        "Transaction Error:",
        err
      );
    });

  return result;
}

/**
 * =========================================
 * ADD XP
 * =========================================
 */

export async function addXP(
  amount: number
) {
  return enqueueTransaction(
    async () => {
      const user =
        (await get(
          "user",
          "main"
        )) as UserStats;

      if (!user) return;

      const currentLevel =
        user.level || 1;

      /*
        Dynamic scaling
      */

      const finalXP =
        computeXPReward(
          amount,
          currentLevel
        );

      const newXP =
        (user.xp || 0) +
        finalXP;

      const newLevel =
        calculateLevel(newXP);

      const oldRank =
        getRankFromLevel(
          currentLevel
        );

      const newRank =
        getRankFromLevel(
          newLevel
        );

      const mastery =
        computeMastery(
          newXP,
          user.streak || 0
        );

      const leveledUp =
        newLevel > currentLevel;

      const rankUp =
        oldRank !== newRank;

      if (leveledUp) {
        playSound(
          "level-up",
          0.6
        );
      }

      if (rankUp) {
        playSound(
          "rare",
          0.9
        );
      }

      const updated =
        await updateUser({
          xp: newXP,

          level: newLevel,

          rank: newRank,

          mastery,

          lastXPReward:
            finalXP,
        });

      await save(
        "user",
        updated
      );

      return {
        ...updated,

        rankUp,

        leveledUp,

        gainedXP: finalXP,
      };
    }
  );
}

/**
 * =========================================
 * ADD COINS
 * =========================================
 */

export async function addCoins(
  amount: number
) {
  return enqueueTransaction(
    async () => {
      const user =
        (await get(
          "user",
          "main"
        )) as UserStats;

      if (!user) return;

      const finalCoins =
        computeCoinReward(
          amount,
          user.level || 1
        );

      const updated =
        await updateUser({
          coins:
            (user.coins || 0) +
            finalCoins,
        });

      await save(
        "user",
        updated
      );

      return updated;
    }
  );
}

/**
 * =========================================
 * BUY ITEM
 * =========================================
 */

export async function buyItem(
  item: InventoryItem
) {
  return enqueueTransaction(
    async () => {
      const user =
        (await get(
          "user",
          "main"
        )) as UserStats;

      if (!user)
        throw new Error(
          "USER_NOT_FOUND"
        );

      const price =
        item.price || 0;

      const currentCoins =
        user.coins || 0;

      /*
        Soft anti-hoarding
      */

      const dynamicPrice =
        Math.floor(
          price *
            (1 +
              (user.level || 1) *
                0.03)
        );

      if (
        currentCoins <
        dynamicPrice
      ) {
        playSound(
          "error",
          0.4
        );

        throw new Error(
          "INSUFFICIENT_CREDITS"
        );
      }

      const inventory:
        InventoryItem[] = [
        ...(user.inventory || []),
      ];

      const existingIndex =
        inventory.findIndex(
          (i) =>
            i.id === item.id
        );

      if (existingIndex > -1) {
        inventory[
          existingIndex
        ] = {
          ...inventory[
            existingIndex
          ],

          quantity:
            (inventory[
              existingIndex
            ].quantity || 1) + 1,
        };
      } else {
        inventory.push({
          ...item,

          quantity: 1,

          acquiredAt:
            Date.now(),
        });
      }

      const updated =
        await updateUser({
          coins:
            currentCoins -
            dynamicPrice,

          inventory,
        });

      await save(
        "user",
        updated
      );

      playSound(
        "buy",
        0.5
      );

      return updated;
    }
  );
}

/**
 * =========================================
 * USE ITEM
 * =========================================
 */

export async function useItem(
  itemId: string
) {
  return enqueueTransaction(
    async () => {
      const user =
        (await get(
          "user",
          "main"
        )) as UserStats;

      if (!user) return;

      const inventory:
        InventoryItem[] = [
        ...(user.inventory || []),
      ];

      const itemIndex =
        inventory.findIndex(
          (i) =>
            i.id === itemId
        );

      if (itemIndex === -1)
        return;

      const item =
        inventory[itemIndex];

      /*
        BOOSTERS
      */

      if (
        item.type ===
        "booster"
      ) {
        if (
          item.effect ===
          "xp_grant"
        ) {
          await addXP(
            item.effectValue ||
              100
          );
        }

        if (
          (item.quantity ||
            1) > 1
        ) {
          inventory[
            itemIndex
          ].quantity! -= 1;
        } else {
          inventory.splice(
            itemIndex,
            1
          );
        }
      }

      /*
        EQUIPPABLE CHIPS
      */

      else if (
        item.type === "chip"
      ) {
        inventory.forEach(
          (i) => {
            if (
              i.type ===
              "chip"
            ) {
              i.equipped =
                false;
            }
          }
        );

        inventory[
          itemIndex
        ].equipped =
          !item.equipped;
      }

      const updated =
        await updateUser({
          inventory,
        });

      await save(
        "user",
        updated
      );

      playSound(
        "click",
        0.3
      );
    }
  );
}