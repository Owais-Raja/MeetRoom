"use client";

import { useState } from "react";
import { X, Copy, Check, Share2, Video, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface ShareMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingCode: string;
  meetingTitle?: string;
  autoRedirectOnJoin?: boolean;
}

export default function ShareMeetingModal({
  isOpen,
  onClose,
  meetingCode,
  meetingTitle = "Meeting",
  autoRedirectOnJoin = true,
}: ShareMeetingModalProps) {
  const router = useRouter();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const meetingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/meeting/${meetingCode}`
      : `/meeting/${meetingCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(meetingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: meetingTitle,
          text: `Join my meeting on MeetRoom! Code: ${meetingCode}`,
          url: meetingUrl,
        });
      } catch (err) {
        console.warn("Share cancelled or failed:", err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleJoinNow = () => {
    onClose();
    if (autoRedirectOnJoin) {
      router.push(`/meeting/${meetingCode}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Share Meeting</h2>
              <p className="text-xs text-zinc-400">Invite participants to join your meeting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Meeting Code
            </label>
            <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <code className="text-blue-400 font-mono text-base font-bold">{meetingCode}</code>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition-colors flex items-center space-x-1.5"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Invite Link
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={meetingUrl}
                className="flex-1 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-xs font-mono truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-medium transition-colors flex items-center space-x-1.5 shadow-md"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
          <button
            onClick={handleNativeShare}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition-colors flex items-center space-x-1.5"
          >
            <Share2 className="w-4 h-4 text-blue-400" />
            <span>More Share Options</span>
          </button>

          {autoRedirectOnJoin && (
            <button
              onClick={handleJoinNow}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors flex items-center space-x-1.5"
            >
              <Video className="w-4 h-4" />
              <span>Join Meeting Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
