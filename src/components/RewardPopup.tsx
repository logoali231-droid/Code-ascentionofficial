"use client";
export default function RewardPopup({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return (
    <div className="fixed top-10 left-0 right-0 z-[100] flex items-center justify-center pointer-events-none px-6">
      <div className="bg-yellow-400 text-black px-6 py-4 rounded-2xl text-lg font-black shadow-[0_0_30px_rgba(250,204,21,0.4)] animate-bounce border-2 border-black uppercase tracking-tighter">
        {text}
      </div>
    </div>
  );
}