"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusSquare, ArrowLeft, Loader2, LogIn } from "lucide-react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

export default function JoinPage() {
  const router = useRouter();

  const [inputCode, setInputCode] = useState("");
  const [displayName, setDisplayName] = useState("Default User");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean raw meeting code from input or full invite link
  const extractCode = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.includes("/meeting/")) {
      const parts = trimmed.split("/meeting/");
      const codePart = parts[1].split("/")[0].split("?")[0];
      return codePart;
    }
    return trimmed;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = extractCode(inputCode);

    if (!cleanCode) {
      setError("Please enter a valid meeting code or invite link.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate meeting code and register participant row
      await api.joinMeeting(cleanCode, displayName.trim() || "Guest");
      
      // Redirect to pre-join lobby
      router.push(`/meeting/${cleanCode}`);
    } catch (err: any) {
      console.error("Join validation error:", err);
      setError("Invalid meeting code or the meeting has ended.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-md w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center space-x-2 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800 shadow-2xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-zinc-800/80 pb-6">
            <div className="bg-blue-600/10 p-3 rounded-2xl border border-blue-500/20 text-blue-400">
              <PlusSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Join a Meeting</h1>
              <p className="text-sm text-zinc-400">Enter a meeting code or paste an invite link</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Meeting Code or Invite Link *
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="e.g. sync-team-101 or paste link"
                required
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Your Display Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name in the room"
                required
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Join Meeting</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
