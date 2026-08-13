"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

export function showComingSoonToast(featureName?: string) {
  if (typeof window !== "undefined") {
    const msg = featureName
      ? `🧑‍🍳 ${featureName} is cooking right now! Coming Soon 🚀`
      : "🧑‍🍳 Feature in the oven! Coming Soon 🚀";
    window.dispatchEvent(new CustomEvent("meetroom:toast", { detail: { message: msg } }));
  }
}

export default function ToastContainer() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      setToast({ id: Date.now(), message: customEvent.detail.message });

      setTimeout(() => {
        setToast(null);
      }, 3500);
    };

    window.addEventListener("meetroom:toast", handleToast);
    return () => window.removeEventListener("meetroom:toast", handleToast);
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-800 flex items-center gap-3 text-sm font-medium">
        <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
        <span>{toast.message}</span>
        <button
          onClick={() => setToast(null)}
          className="text-gray-400 hover:text-white transition-colors p-0.5 rounded-lg ml-2"
          aria-label="Dismiss toast"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
