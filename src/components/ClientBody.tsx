"use client";

import { useEffect, useRef, useState } from "react";
import { get, performStorageCleanup } from "@/lib/others/db";
import { usePathname, useRouter } from "next/navigation";

/* =========================================================
   🌍 CORE KEYS
========================================================= */

const ECO_KEY = "eco_telemetry_v4";
const ECO_SESSION_KEY = "eco_session_v1";
const ECO_EVENT_LOG = "eco_event_log_v1";

/* =========================================================
   🌍 CONSTANTS
========================================================= */

const GRID_CO2_INTENSITY = 0.08;
const WATER_PER_KWH_L = 1.8;
const BASE_IDLE_WATTS = 0.8;
const NETWORK_KWH_PER_GB = 0.06;

const CLOUD_CO2_PER_REQUEST = 0.0025;
const CLOUD_KWH_PER_REQUEST = 0.0008;

const TREE_CO2_OFFSET_KG = 21;

const CPU_INFERENCE_BOOST = 1.5;
const GPU_INFERENCE_BOOST = 3.5;

/* =========================================================
   🧠 MODEL POWER
========================================================= */

const MODEL_POWER_MAP: Record<string, number> = {
  qwen: 2.5,
  phi3mini: 4.5,
  phi35: 7,
  default: 3,
};

/* =========================================================
   🔐 TRIPLE LOCK SYSTEM
========================================================= */

function getSessionId() {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(ECO_SESSION_KEY);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ECO_SESSION_KEY, id);
  }

  return id;
}

function getEventLog(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(ECO_EVENT_LOG) || "[]"));
  } catch {
    return new Set();
  }
}

function saveEventLog(set: Set<string>) {
  localStorage.setItem(ECO_EVENT_LOG, JSON.stringify([...set]));
}

function once(eventId: string, fn: () => void) {
  const log = getEventLog();
  if (log.has(eventId)) return false;

  log.add(eventId);
  saveEventLog(log);

  fn();
  return true;
}

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   STORAGE
========================================================= */

function loadEcoState(): EcoState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(ECO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveEcoState(state: EcoState) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ECO_KEY, JSON.stringify(state));
  } catch {}
}

/* =========================================================
   MODEL DETECTION
========================================================= */

function detectCurrentModel(): string {
  try {
    const raw = localStorage.getItem("selected_model") || "";
    const lower = raw.toLowerCase();

    if (lower.includes("phi-3.5")) return "phi35";
    if (lower.includes("phi")) return "phi3mini";
    if (lower.includes("qwen")) return "qwen";

    return "default";
  } catch {
    return "default";
  }
}

/* =========================================================
   DEVICE POWER
========================================================= */

function estimateInferencePower(modelKey: string) {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as any).deviceMemory || 4;
  const hasWebGPU = "gpu" in navigator;

  const modelPower = MODEL_POWER_MAP[modelKey] || 3;

  let extra = modelPower + cores * 0.08 + mem * 0.12;
  extra += hasWebGPU ? GPU_INFERENCE_BOOST : CPU_INFERENCE_BOOST;

  return extra;
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  /* ---------------- UI ---------------- */

  const [profile, setProfile] = useState("Standard");
  const [ecoExpanded, setEcoExpanded] = useState(false);

  const [trees, setTrees] = useState(0);
  const [co2, setCo2] = useState(0);
  const [water, setWater] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [hours, setHours] = useState(0);

  const [cloudAvoided, setCloudAvoided] = useState(0);
  const [cloudCO2Avoided, setCloudCO2Avoided] = useState(0);
  const [cloudEnergyAvoided, setCloudEnergyAvoided] = useState(0);

  /* ---------------- REFS ---------------- */

  const hydratedRef = useRef(false);
  const sessionStartRef = useRef(Date.now());
  const inferenceActiveRef = useRef(false);

  const totalInferenceSecondsRef = useRef(0);
  const totalInferenceEnergyRef = useRef(0);
  const totalDownloadedMBRef = useRef(0);

  const localInferenceCountRef = useRef(0);

  const cloudRequestsAvoidedRef = useRef(0);
  const cloudCO2AvoidedKgRef = useRef(0);
  const cloudEnergyAvoidedRef = useRef(0);

  /* =========================================================
     RESTORE
  ========================================================= */

  useEffect(() => {
    const saved = loadEcoState();

    if (saved) {
      totalInferenceSecondsRef.current = saved.totalInferenceSeconds || 0;
      totalInferenceEnergyRef.current = saved.totalInferenceEnergyKWh || 0;
      totalDownloadedMBRef.current = saved.totalDownloadedMB || 0;

      localInferenceCountRef.current = saved.localInferenceCount || 0;

      cloudRequestsAvoidedRef.current = saved.cloudRequestsAvoided || 0;
      cloudCO2AvoidedKgRef.current = saved.cloudCO2AvoidedKg || 0;
      cloudEnergyAvoidedRef.current = saved.cloudEnergyAvoidedKWh || 0;

      sessionStartRef.current = saved.sessionStart || Date.now();

      setEnergy(saved.totalEnergyKWh || 0);
      setCo2(saved.totalCO2kg || 0);
      setWater(saved.totalWaterL || 0);
      setHours(saved.totalHours || 0);
      setTrees(saved.totalTreesEquivalent || 0);

      setCloudAvoided(saved.cloudRequestsAvoided || 0);
      setCloudCO2Avoided(saved.cloudCO2AvoidedKg || 0);
      setCloudEnergyAvoided(saved.cloudEnergyAvoidedKWh || 0);
    }

    hydratedRef.current = true;
  }, []);

  /* =========================================================
     SW + USER LOAD
  ========================================================= */

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }

    async function load() {
      if (pathname === "/" || pathname === "/machineLock") return;

      const user = await get("user", "main");

      if (!user) {
        router.push("/machineLock");
        return;
      }

      if (user.profile) setProfile(user.profile);

      performStorageCleanup().catch(() => {});
    }

    load();
  }, [router, pathname]);

  /* =========================================================
     DOWNLOAD TRACKING (DEDUPED)
  ========================================================= */

  const downloadSet = useRef<Set<string>>(new Set());

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const url = String(args[0]);
      const response = await originalFetch(...args);

      const isModelAsset =
        url.includes(".bin") ||
        url.includes(".wasm") ||
        url.includes("huggingface");

      if (isModelAsset) {
        once(`download:${url}`, () => {
          const length = Number(response.headers.get("content-length")) || 0;
          const mb = length / 1024 / 1024;

          if (mb > 0.5) {
            totalDownloadedMBRef.current += mb;
          }
        });
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  /* =========================================================
     INFERENCE API
  ========================================================= */

  useEffect(() => {
    (window as any).__START_WEBLLM_INFERENCE = () => {
      if (inferenceActiveRef.current) return;

      inferenceActiveRef.current = true;

      once(`inference:${crypto.randomUUID()}`, () => {
        localInferenceCountRef.current += 1;
        cloudRequestsAvoidedRef.current += 1;
        cloudCO2AvoidedKgRef.current += CLOUD_CO2_PER_REQUEST;
        cloudEnergyAvoidedRef.current += CLOUD_KWH_PER_REQUEST;
      });
    };

    (window as any).__END_WEBLLM_INFERENCE = () => {
      inferenceActiveRef.current = false;
    };
  }, []);

  /* =========================================================
     ECO ENGINE
  ========================================================= */

  useEffect(() => {
    if (!hydratedRef.current) return;

    let lastTick = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - lastTick) / 1000;
      lastTick = now;

      const model = detectCurrentModel();
      const watts = estimateInferencePower(model);

      if (inferenceActiveRef.current) {
        totalInferenceSecondsRef.current += deltaSeconds;

        const deltaKWh = (watts * deltaSeconds) / 3600000;
        totalInferenceEnergyRef.current += deltaKWh;
      }

      const hours = (Date.now() - sessionStartRef.current) / 3600000;

      const idleKWh = (BASE_IDLE_WATTS * hours) / 1000;
      const networkKWh = (totalDownloadedMBRef.current / 1024) * NETWORK_KWH_PER_GB;

      const totalEnergy = idleKWh + totalInferenceEnergyRef.current + networkKWh;
      const totalCO2 = totalEnergy * GRID_CO2_INTENSITY;
      const totalWater = totalEnergy * WATER_PER_KWH_L;

      const treesEq = totalCO2 / TREE_CO2_OFFSET_KG;

      setEnergy(totalEnergy);
      setCo2(totalCO2);
      setWater(totalWater);
      setTrees(treesEq);
      setHours(hours);

      saveEcoState({
        totalEnergyKWh: totalEnergy,
        totalCO2kg: totalCO2,
        totalWaterL: totalWater,
        totalHours: hours,

        totalInferenceSeconds: totalInferenceSecondsRef.current,
        totalInferenceEnergyKWh: totalInferenceEnergyRef.current,
        totalDownloadedMB: totalDownloadedMBRef.current,

        localInferenceCount: localInferenceCountRef.current,

        cloudRequestsAvoided: cloudRequestsAvoidedRef.current,
        cloudCO2AvoidedKg: cloudCO2AvoidedKgRef.current,
        cloudEnergyAvoidedKWh: cloudEnergyAvoidedRef.current,

        totalTreesEquivalent: treesEq,
        sessionStart: sessionStartRef.current,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  /* =========================================================
     VISIBILITY
  ========================================================= */

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        inferenceActiveRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* =========================================================
     HUD
  ========================================================= */

  return (
    <>
      {children}

      <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end">
        <button
          onClick={() => setEcoExpanded((v) => !v)}
          className="bg-black/70 backdrop-blur-md border border-green-500/20 rounded-2xl px-4 py-2 text-[11px] text-green-300"
        >
          🌱 {trees.toFixed(6)} tree eq. {ecoExpanded ? "▲" : "▼"}
        </button>

        {ecoExpanded && (
          <div className="mt-2 bg-black/65 border border-green-500/20 rounded-2xl p-3 text-[11px] text-green-300">
            ⚡ {energy.toFixed(5)} kWh<br />
            🌍 {co2.toFixed(6)} kgCO₂<br />
            💧 {water.toFixed(4)} L<br />
            🕒 {hours.toFixed(2)} h<br />
            ☁️ {cloudAvoided.toFixed(0)} req avoided<br />
            🌿 {cloudCO2Avoided.toFixed(4)} kg CO₂ saved<br />
            🔋 {cloudEnergyAvoided.toFixed(4)} kWh saved
          </div>
        )}
      </div>
    </>
  );
}
