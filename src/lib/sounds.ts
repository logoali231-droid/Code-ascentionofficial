"use client";

const cache: Record<string, HTMLAudioElement> = {};

let enabled = true;

// 🎧 mapa dos sons reais
const soundMap: Record<string, string> = {
  click: "/sounds/mixkit-cool-interface-click-tone-2568.mp3",
  success: "/sounds/success.mp3",
  error: "/sounds/error.mp3",
};

export function setSoundEnabled(value: boolean) {
  enabled = value;
}

export function isSoundEnabled() {
  return enabled;
}

export function playSound(
  name: keyof typeof soundMap,
  volume = 0.5
) {
  if (!enabled) return;

  try {
    if (!cache[name]) {
      cache[name] = new Audio(soundMap[name]);
    }

    const audio = cache[name];

    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;

    audio.play().catch(() => {});
  } catch (err) {
    console.warn("Sound error:", err);
  }
}