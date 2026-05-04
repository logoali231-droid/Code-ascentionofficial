"use client";

import { save } from "@/lib/db";

export default function Settings() {
  function logout() {
    save("user", { id: "main" });
    location.href = "/";
  }

  function reset() {
    indexedDB.deleteDatabase("codeascent-db");
    location.reload();
  }

  return (
    <div className="p-4">
      <h1>Settings</h1>

      <button onClick={logout}>Logout</button>

      <button onClick={reset} className="mt-2 bg-red-600">
        Reset App
      </button>
    </div>
  );
}