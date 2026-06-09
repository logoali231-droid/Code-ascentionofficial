"use client";

export default function DevServiceWorkerButton() {
  async function unregister() {
    try {
      const registrations =
        await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations.map((r) => r.unregister())
      );

      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );

      console.log("✅ Service Workers removidos");
      console.log("✅ Cache Storage limpo");

      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <button
      onClick={unregister}
      className="
        fixed
        bottom-4
        right-4
        z-[999999]
        rounded-lg
        border
        border-red-500
        bg-slate-950
        px-3
        py-2
        text-xs
        font-black
        uppercase
        text-red-400
        hover:bg-red-950
      "
    >
      Unregister SW
    </button>
  );
}
