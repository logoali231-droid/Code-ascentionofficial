"use client";

import { playSound } from "./sounds";

export function useSound() {
  return {
    play: playSound,
  };
}