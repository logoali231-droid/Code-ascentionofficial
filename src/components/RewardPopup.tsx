"use client";

export default function RewardPopup({ show, text }: any) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div className="bg-yellow-400 text-black px-6 py-3 rounded-xl text-lg animate-bounce">
        {text}
      </div>
    </div>
  );
}