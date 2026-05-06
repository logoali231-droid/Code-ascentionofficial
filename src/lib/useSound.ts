"use client";

const sounds: Record<string, string> = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  click: "/sounds/click.mp3",
  streak: "/sounds/streak.mp3",
  levelup: "/sounds/levelup.mp3",
};

const cache: Record<string, HTMLAudioElement> = {};

export function playSound(
  type: keyof typeof sounds,
  cognitive?: string
) {
  try {
    // 🎯 skip sound for visual users
    if (cognitive === "Visual_Logic") return;

    if (!cache[type]) {
      cache[type] = new Audio(sounds[type]);
    }

    const audio = cache[type];

    // 🔊 cognitive tuning
    if (cognitive === "ADHD_Focus") audio.volume = 0.7;
    else if (cognitive === "Deep_Dive") audio.volume = 0.25;
    else audio.volume = 0.5;

    audio.currentTime = 0;
    audio.play();
  } catch (e) {
    console.warn("Sound failed", e);
  }
}