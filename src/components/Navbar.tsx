"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  PlusCircle,
  Store,
  Archive,
  AlertTriangle
} from "lucide-react";

export default function Navbar() {
  const r = useRouter();
  const path = usePathname();

  const item = (href: string, icon: any) => {
    const Icon = icon;
    const active = path === href;

    return (
      <button
        onClick={() => r.push(href)}
        className={`flex flex-col items-center text-xs ${
          active ? "text-blue-400" : "text-slate-400"
        }`}
      >
        <Icon size={20} />
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around py-2">
      {item("/hub", Home)}
      {item("/new", PlusCircle)}
      {item("/shop", Store)}
      {item("/vault", Archive)}
      {item("/errors", AlertTriangle)}
    </div>
  );
}