"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, PlusCircle, Store, Archive, AlertTriangle } from "lucide-react";

export default function Navbar() {
  const r = useRouter();
  const path = usePathname();

  const item = (href: string, Icon: any) => (
    <button
      onClick={() => r.push(href)}
      className={path === href ? "text-blue-400" : "text-gray-400"}
    >
      <Icon size={20} />
    </button>
  );

  return (
    <div className="fixed bottom-0 w-full flex justify-around bg-black p-2">
      {item("/hub", Home)}
      {item("/new", PlusCircle)}
      {item("/shop", Store)}
      {item("/vault", Archive)}
      {item("/errors", AlertTriangle)}
    </div>
  );
}