"use client";

import { useState } from "react";
import { X, Copy, Check, Share2, Video } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-50">
              <Share2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Share Meeting
              </h2>
              <p className="text-xs text-gray-500">
                Invite participants to join
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Meeting Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Meeting Code
            </label>
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl">
              <code className="text-base font-bold font-mono" style={{ color: "#0B5CFF" }}>
                {meetingCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Invite Link */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Invite Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={meetingUrl}
                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-xs font-mono truncate focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 flex-shrink-0"
                style={{ backgroundColor: "#0B5CFF" }}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleNativeShare}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Share2 className="w-4 h-4" style={{ color: "#0B5CFF" }} />
            <span>More Options</span>
          </button>

          {autoRedirectOnJoin && (
            <button
              onClick={handleJoinNow}
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-5 py-2 rounded-xl shadow-sm transition-colors"
              style={{ backgroundColor: "#16A34A" }}
            >
              <Video className="w-4 h-4" />
              <span>Join Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
