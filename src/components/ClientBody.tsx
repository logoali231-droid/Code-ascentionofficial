"use client";

import { useEffect, useRef, useState } from "react";
import { get, performStorageCleanup } from "@/lib/others/db";
import { usePathname, useRouter } from "next/navigation";

const ECO_KEY = "eco_telemetry_v4";

// =========================================================
// 🌍 ECOLOGICAL CONSTANTS
// =========================================================

// Brazil average grid intensity
const GRID_CO2_INTENSITY = 0.08; // kgCO2/kWh

// average datacenter water cooling
const WATER_PER_KWH_L = 1.8;

// mobile baseline
const BASE_IDLE_WATTS = 0.8;

// estimated transfer cost
const NETWORK_KWH_PER_GB = 0.06;

// cloud AI request approximation
const CLOUD_CO2_PER_REQUEST = 0.0025;

const CLOUD_KWH_PER_REQUEST = 0.0008;

// trees absorb roughly 21kg/year
const TREE_CO2_OFFSET_KG = 21;

// inference boosts
const CPU_INFERENCE_BOOST = 1.5;
const GPU_INFERENCE_BOOST = 3.5;

// =========================================================
// 🧠 MODEL POWER ESTIMATES
// =========================================================

const MODEL_POWER_MAP: Record<string, number> = {
  qwen: 2.5,
  phi3mini: 4.5,
  phi35: 7,
  default: 3,
};

// =========================================================
// DOWNLOAD DEDUPE
// =========================================================

const countedDownloads = new Set<string>();

// =========================================================
// TYPES
// =========================================================

interface EcoState {
  totalEnergyKWh: number;
  totalCO2kg: number;
  totalWaterL: number;
  totalHours: number;

  totalInferenceSeconds: number;
  totalInferenceEnergyKWh: number;

  totalDownloadedMB: number;

  localInferenceCount: number;

  cloudRequestsAvoided: number;
  cloudCO2AvoidedKg: number;
  cloudEnergyAvoidedKWh: number;

  totalTreesEquivalent: number;

  sessionStart: number;
}

// =========================================================
// STORAGE
// =========================================================

function loadEcoState(): EcoState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(ECO_KEY);

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveEcoState(state: EcoState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      ECO_KEY,
      JSON.stringify(state)
    );
  } catch {}
}

// =========================================================
// MODEL DETECTION
// =========================================================

function detectCurrentModel(): string {
  try {
    const raw =
      localStorage.getItem(
        "selected_model"
      ) || "";

    const lower = raw.toLowerCase();

    if (lower.includes("phi-3.5")) {
      return "phi35";
    }

    if (lower.includes("phi")) {
      return "phi3mini";
    }

    if (lower.includes("qwen")) {
      return "qwen";
    }

    return "default";
  } catch {
    return "default";
  }
}

// =========================================================
// DEVICE POWER HEURISTIC
// =========================================================

function estimateInferencePower(
  modelKey: string
) {
  const cores =
    navigator.hardwareConcurrency || 4;

  const mem =
    (navigator as any).deviceMemory || 4;

  const hasWebGPU =
    "gpu" in navigator;

  const modelPower =
    MODEL_POWER_MAP[modelKey] ||
    MODEL_POWER_MAP.default;

  let extra =
    modelPower +
    cores * 0.08 +
    mem * 0.12;

  extra += hasWebGPU
    ? GPU_INFERENCE_BOOST
    : CPU_INFERENCE_BOOST;

  return extra;
}

// =========================================================
// MAIN
// =========================================================

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // =======================================================
  // UI
  // =======================================================

  const [profile, setProfile] =
    useState("Standard");

  const [trees, setTrees] =
    useState(0);

  const [co2, setCo2] =
    useState(0);

  const [water, setWater] =
    useState(0);

  const [energy, setEnergy] =
    useState(0);

  const [hours, setHours] =
    useState(0);

  const [cloudAvoided, setCloudAvoided] =
    useState(0);

  const [cloudCO2Avoided, setCloudCO2Avoided] =
    useState(0);

  const [cloudEnergyAvoided, setCloudEnergyAvoided] =
    useState(0);

  // =======================================================
  // REFS
  // =======================================================

  const hydratedRef =
    useRef(false);

  const sessionStartRef =
    useRef(Date.now());

  const inferenceActiveRef =
    useRef(false);

  // cumulative totals
  const totalInferenceSecondsRef =
    useRef(0);

  const totalInferenceEnergyRef =
    useRef(0);

  const totalDownloadedMBRef =
    useRef(0);

  const localInferenceCountRef =
    useRef(0);

  const cloudRequestsAvoidedRef =
    useRef(0);

  const cloudCO2AvoidedKgRef =
    useRef(0);

  const cloudEnergyAvoidedRef =
    useRef(0);

  // =======================================================
  // RESTORE
  // =======================================================

  useEffect(() => {
    const saved = loadEcoState();

    if (saved) {
      totalInferenceSecondsRef.current =
        saved.totalInferenceSeconds || 0;

      totalInferenceEnergyRef.current =
        saved.totalInferenceEnergyKWh || 0;

      totalDownloadedMBRef.current =
        saved.totalDownloadedMB || 0;

      localInferenceCountRef.current =
        saved.localInferenceCount || 0;

      cloudRequestsAvoidedRef.current =
        saved.cloudRequestsAvoided || 0;

      cloudCO2AvoidedKgRef.current =
        saved.cloudCO2AvoidedKg || 0;

      cloudEnergyAvoidedRef.current =
        saved.cloudEnergyAvoidedKWh || 0;

      sessionStartRef.current =
        saved.sessionStart || Date.now();

      setEnergy(
        saved.totalEnergyKWh || 0
      );

      setCo2(
        saved.totalCO2kg || 0
      );

      setWater(
        saved.totalWaterL || 0
      );

      setHours(
        saved.totalHours || 0
      );

      setTrees(
        saved.totalTreesEquivalent || 0
      );

      setCloudAvoided(
        saved.cloudRequestsAvoided || 0
      );

      setCloudCO2Avoided(
        saved.cloudCO2AvoidedKg || 0
      );

      setCloudEnergyAvoided(
        saved.cloudEnergyAvoidedKWh || 0
      );
    }

    hydratedRef.current = true;
  }, []);

  // =======================================================
  // SERVICE WORKER + USER LOAD
  // =======================================================

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) =>
            console.log(
              "SW registration failed",
              err
            )
          );
      });
    }

    async function load() {
      if (
        pathname === "/" ||
        pathname === "/machineLock"
      ) {
        return;
      }

      const user = await get(
        "user",
        "main"
      );

      if (!user) {
        router.push("/machineLock");
        return;
      }

      if (user.profile) {
        setProfile(user.profile);
      }

      performStorageCleanup().catch(
        () => {}
      );
    }

    load();
  }, [router, pathname]);

  // =======================================================
  // PROFILE APPLY
  // =======================================================

  useEffect(() => {
    document.body.setAttribute(
      "data-profile",
      profile
    );
  }, [profile]);

  // =======================================================
  // 🌩️ WEBLLM DOWNLOAD TRACKING
  // =======================================================

  useEffect(() => {
    const originalFetch =
      window.fetch;

    window.fetch = async (
      ...args
    ) => {
      try {
        const url = String(args[0]);

        const response =
          await originalFetch(
            ...args
          );

        const isModelAsset =
          url.includes(".bin") ||
          url.includes(".wasm") ||
          url.includes(
            "huggingface"
          );

        if (
          isModelAsset &&
          !countedDownloads.has(url)
        ) {
          countedDownloads.add(url);

          const length =
            Number(
              response.headers.get(
                "content-length"
              )
            ) || 0;

          const mb =
            length / 1024 / 1024;

          if (mb > 0.5) {
            totalDownloadedMBRef.current +=
              mb;
          }
        }

        return response;
      } catch {
        return originalFetch(
          ...args
        );
      }
    };

    return () => {
      window.fetch =
        originalFetch;
    };
  }, []);

  // =======================================================
  // 🌱 WEBLLM INFERENCE API
  // =======================================================

  useEffect(() => {
    (window as any)
      .__START_WEBLLM_INFERENCE =
      () => {
        if (
          inferenceActiveRef.current
        ) {
          return;
        }

        inferenceActiveRef.current =
          true;

        localInferenceCountRef.current += 1;

        cloudRequestsAvoidedRef.current += 1;

        cloudCO2AvoidedKgRef.current +=
          CLOUD_CO2_PER_REQUEST;

        cloudEnergyAvoidedRef.current +=
          CLOUD_KWH_PER_REQUEST;
      };

    (window as any)
      .__END_WEBLLM_INFERENCE =
      () => {
        inferenceActiveRef.current =
          false;
      };
  }, []);

  // =======================================================
  // 🌍 ECO ENGINE
  // =======================================================

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    let lastTick =
      performance.now();

    const interval =
      setInterval(() => {
        const now =
          performance.now();

        const deltaSeconds =
          (now - lastTick) / 1000;

        lastTick = now;

        // ===================================================
        // INFERENCE ACCUMULATION
        // ===================================================

        const model =
          detectCurrentModel();

        const inferenceExtraWatts =
          estimateInferencePower(
            model
          );

        if (
          inferenceActiveRef.current
        ) {
          totalInferenceSecondsRef.current +=
            deltaSeconds;

          const deltaKWh =
            (inferenceExtraWatts *
              deltaSeconds) /
            3600000;

          totalInferenceEnergyRef.current +=
            deltaKWh;
        }

        // ===================================================
        // TOTAL RUNTIME
        // ===================================================

        const totalHours =
          (Date.now() -
            sessionStartRef.current) /
          3_600_000;

        // ===================================================
        // IDLE ENERGY
        // ===================================================

        const idleKWh =
          (BASE_IDLE_WATTS *
            totalHours) /
          1000;

        // ===================================================
        // NETWORK ENERGY
        // ===================================================

        const networkKWh =
          (totalDownloadedMBRef.current /
            1024) *
          NETWORK_KWH_PER_GB;

        // ===================================================
        // TOTALS
        // ===================================================

        const totalEnergy =
          idleKWh +
          totalInferenceEnergyRef.current +
          networkKWh;

        const totalCO2 =
          totalEnergy *
          GRID_CO2_INTENSITY;

        const totalWater =
          totalEnergy *
          WATER_PER_KWH_L;

        const treesEquivalent =
          totalCO2 /
          TREE_CO2_OFFSET_KG;

        // ===================================================
        // UI
        // ===================================================

        setEnergy(totalEnergy);

        setCo2(totalCO2);

        setWater(totalWater);

        setTrees(
          treesEquivalent
        );

        setHours(totalHours);

        setCloudAvoided(
          cloudRequestsAvoidedRef.current
        );

        setCloudCO2Avoided(
          cloudCO2AvoidedKgRef.current
        );

        setCloudEnergyAvoided(
          cloudEnergyAvoidedRef.current
        );

        // ===================================================
        // PERSIST
        // ===================================================

        saveEcoState({
          totalEnergyKWh:
            totalEnergy,

          totalCO2kg:
            totalCO2,

          totalWaterL:
            totalWater,

          totalHours:
            totalHours,

          totalInferenceSeconds:
            totalInferenceSecondsRef.current,

          totalInferenceEnergyKWh:
            totalInferenceEnergyRef.current,

          totalDownloadedMB:
            totalDownloadedMBRef.current,

          localInferenceCount:
            localInferenceCountRef.current,

          cloudRequestsAvoided:
            cloudRequestsAvoidedRef.current,

          cloudCO2AvoidedKg:
            cloudCO2AvoidedKgRef.current,

          cloudEnergyAvoidedKWh:
            cloudEnergyAvoidedRef.current,

          totalTreesEquivalent:
            treesEquivalent,

          sessionStart:
            sessionStartRef.current,
        });
      }, 2000);

    return () =>
      clearInterval(interval);
  }, []);

  // =======================================================
  // CLEANUP ON TAB HIDE
  // =======================================================

  useEffect(() => {
    const onVisibility = () => {
      if (
        document.hidden &&
        inferenceActiveRef.current
      ) {
        inferenceActiveRef.current =
          false;
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );
    };
  }, []);

  // =======================================================
  // HUD
  // =======================================================

  return (
    <>
      {children}

      <div
        className="
          fixed bottom-3 right-3 z-50
          bg-black/65
          backdrop-blur-md
          border border-green-500/20
          rounded-2xl
          px-4 py-3
          text-[11px]
          text-green-300
          shadow-xl
          flex flex-col gap-1
          min-w-[210px]
        "
      >
        <div className="flex items-center gap-2">
          🌱
          <span>
            {trees.toFixed(6)}
          </span>

          <span className="opacity-70">
            tree eq.
          </span>
        </div>

        <div className="opacity-70">
          ⚡{" "}
          {energy.toFixed(5)} kWh
        </div>

        <div className="opacity-70">
          🌍{" "}
          {co2.toFixed(6)} kgCO₂
        </div>

        <div className="opacity-70">
          💧{" "}
          {water.toFixed(4)} L
        </div>

        <div className="opacity-70">
          🕒{" "}
          {hours.toFixed(2)} h
        </div>

        <div className="opacity-70">
          ☁️ avoided:
          {" "}
          {cloudAvoided.toFixed(0)}
          {" "}
          req
        </div>

        <div className="opacity-70">
          🌿 cloud CO₂ saved:
          {" "}
          {cloudCO2Avoided.toFixed(4)}
          {" "}
          kg
        </div>

        <div className="opacity-70">
          🔋 cloud energy saved:
          {" "}
          {cloudEnergyAvoided.toFixed(4)}
          {" "}
          kWh
        </div>
      </div>
    </>
  );
  }
