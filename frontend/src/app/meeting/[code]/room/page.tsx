"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  ShieldCheck,
  MessageSquare,
  VolumeX,
  UserX,
  X,
  Crown,
  MonitorUp,
  Share2,
  Send,
  Check,
  Copy,
} from "lucide-react";
import { api, Meeting } from "@/lib/api";
import { SignalingClient, SignalingMessage } from "@/lib/signaling";
import { createPeerConnection } from "@/lib/webrtc";
import ShareMeetingModal from "@/components/ShareMeetingModal";

interface RemotePeer {
  peerId: string;
  displayName: string;
  stream: MediaStream;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
}

interface RoomProps {
  params: Promise<{ code: string }>;
}

/**
 * Sub-component for rendering individual remote participant video tiles in the mesh grid.
 */
function RemoteVideoTile({ peer }: { peer: RemotePeer }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative w-full h-full min-h-[260px] bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 bg-zinc-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-800 text-xs font-medium flex items-center space-x-2">
        <span>{peer.displayName || "Participant"}</span>
        <Mic className="w-3.5 h-3.5 text-emerald-400" />
      </div>
    </div>
  );
}

export default function MeetingRoomPage({ params }: RoomProps) {
  const { code } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Participant metadata & server-assigned role
  const rawName = searchParams.get("name") || "Participant";
  const role = searchParams.get("role") || "participant";
  const initialMic = searchParams.get("mic") !== "false";
  const initialCam = searchParams.get("cam") !== "false";

  // Check saved display name if available
  const [name, setName] = useState(rawName);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("meetroom_user_name");
      if (savedName) setName(savedName);
    }
  }, []);

  // Session participant ID
  const [participantId] = useState(() => `peer_${Math.random().toString(36).substring(2, 9)}`);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isMuted, setIsMuted] = useState(!initialMic);
  const [isVideoOff, setIsVideoOff] = useState(!initialCam);

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Drawers state
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Chat messages & input
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Local media stream & video ref
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Mesh Topology: Map of active PeerConnections & Remote Peers state
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);

  const signalingClientRef = useRef<SignalingClient | null>(null);

  // Check if current user is the host
  const isHost = role === "host";

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // 1. Fetch meeting metadata
  useEffect(() => {
    async function loadMeeting() {
      try {
        const m = await api.getMeetingByCode(code);
        setMeeting(m);
      } catch (err) {
        console.error("Failed to load meeting room details:", err);
      }
    }
    loadMeeting();
  }, [code]);

  // 2. Initialize Local Stream & WebSocket Signaling
  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    async function setupCall() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        stream.getAudioTracks().forEach((t) => (t.enabled = initialMic));
        stream.getVideoTracks().forEach((t) => (t.enabled = initialCam));

        streamInstance = stream;
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const signaling = new SignalingClient(
          code,
          participantId,
          (message: SignalingMessage) => handleSignalingMessage(message, stream)
        );
        signalingClientRef.current = signaling;
        signaling.connect();
      } catch (err) {
        console.error("Failed to access camera/mic for mesh call:", err);
      }
    }

    setupCall();

    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (streamInstance) {
        streamInstance.getTracks().forEach((t) => t.stop());
      }
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      if (signalingClientRef.current) {
        signalingClientRef.current.close();
      }
    };
  }, [code, participantId]);

  // Helper: Get existing or create new RTCPeerConnection for a remote peer
  const getOrCreatePeerConnection = (
    targetPeerId: string,
    targetDisplayName: string,
    currentLocalStream: MediaStream | null
  ): RTCPeerConnection => {
    if (pcsRef.current.has(targetPeerId)) {
      return pcsRef.current.get(targetPeerId)!;
    }

    const pc = createPeerConnection(
      targetPeerId,
      screenStreamRef.current || currentLocalStream,
      (candidate) => {
        signalingClientRef.current?.send("ice-candidate", targetPeerId, { candidate });
      },
      (incomingStream) => {
        setRemotePeers((prev) => {
          const filtered = prev.filter((p) => p.peerId !== targetPeerId);
          return [
            ...filtered,
            {
              peerId: targetPeerId,
              displayName: targetDisplayName || "Participant",
              stream: incomingStream,
            },
          ];
        });
      }
    );

    pcsRef.current.set(targetPeerId, pc);
    return pc;
  };

  // 3. WebRTC Signaling Message Handler (including Chat & Host Controls)
  const handleSignalingMessage = async (msg: SignalingMessage, currentLocalStream: MediaStream | null) => {
    const { type, from, to, payload } = msg;

    if (from === participantId) return;

    const peerName = payload?.displayName || "Participant";

    switch (type) {
      case "join": {
        console.log(`[Mesh WebRTC] Peer '${from}' (${peerName}) joined room. Creating offer...`);
        const pc = getOrCreatePeerConnection(from, peerName, currentLocalStream);

        if (pc.signalingState === "stable") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          signalingClientRef.current?.send("offer", from, {
            sdp: offer,
            displayName: name,
          });
        }
        break;
      }

      case "offer": {
        console.log(`[Mesh WebRTC] Received offer from '${from}' (${peerName}). Creating answer...`);
        const pc = getOrCreatePeerConnection(from, peerName, currentLocalStream);

        if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
          if (pc.signalingState === "have-local-offer") {
            await pc.setLocalDescription({ type: "rollback" });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          signalingClientRef.current?.send("answer", from, {
            sdp: answer,
            displayName: name,
          });
        }
        break;
      }

      case "answer": {
        const pc = pcsRef.current.get(from);
        if (pc && pc.signalingState === "have-local-offer") {
          console.log(`[Mesh WebRTC] Received answer from '${from}'. Setting remote description...`);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
        break;
      }

      case "ice-candidate": {
        const pc = pcsRef.current.get(from);
        if (pc && payload.candidate) {
          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        }
        break;
      }

      case "leave": {
        console.log(`[Mesh WebRTC] Peer '${from}' left room.`);
        const pc = pcsRef.current.get(from);
        if (pc) {
          pc.close();
          pcsRef.current.delete(from);
        }
        setRemotePeers((prev) => prev.filter((p) => p.peerId !== from));
        break;
      }

      // -----------------------------------------------------------------------
      // REAL-TIME IN-CALL CHAT SIGNAL HANDLER
      // -----------------------------------------------------------------------
      case "chat": {
        const { sender, text, timestamp } = payload;
        setChatMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            sender: sender || "Participant",
            text,
            timestamp: timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isSelf: false,
          },
        ]);
        if (!isChatOpen) {
          setUnreadCount((prev) => prev + 1);
        }
        break;
      }

      // -----------------------------------------------------------------------
      // HOST CONTROL SIGNAL HANDLERS
      // -----------------------------------------------------------------------
      case "mute-all": {
        console.log("[Host Control] Host requested Mute All.");
        if (localStream) {
          localStream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        setIsMuted(true);
        alert("The meeting host has muted all participants.");
        break;
      }

      case "mute-participant": {
        if (to === participantId) {
          console.log("[Host Control] Host muted your microphone.");
          if (localStream) {
            localStream.getAudioTracks().forEach((t) => (t.enabled = false));
          }
          setIsMuted(true);
          alert("The meeting host has muted your microphone.");
        }
        break;
      }

      case "kick-participant": {
        if (to === participantId) {
          alert("You have been removed from the meeting by the host.");
          handleLeaveCall();
        }
        break;
      }

      case "end-meeting": {
        alert("The host has ended the meeting for all participants.");
        handleLeaveCall();
        break;
      }
    }
  };

  // Toggle Audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  // Screen Sharing Logic
  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      screenStreamRef.current = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];

      // Handle user clicking native browser "Stop Sharing" floating button
      screenTrack.onended = () => {
        stopScreenShare();
      };

      // Replace local video sender track across all active RTCPeerConnections
      pcsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      });

      // Update local preview video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }

      setIsScreenSharing(true);
    } catch (err) {
      console.warn("Screen share cancelled or failed:", err);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera video track to peer connections
    if (localStream) {
      const cameraTrack = localStream.getVideoTracks()[0];
      pcsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        }
      });

      // Restore local preview element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }

    setIsScreenSharing(false);
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  // In-Call Chat Sending
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const text = chatInputText.trim();

    // Broadcast chat message to peers via WebSocket signaling server
    signalingClientRef.current?.send("chat", null, {
      sender: name,
      text,
      timestamp,
    });

    // Append to local message history
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        sender: name,
        text,
        timestamp,
        isSelf: true,
      },
    ]);

    setChatInputText("");
  };

  // Host Action: Mute All Participants
  const handleMuteAll = () => {
    if (!isHost) return;
    signalingClientRef.current?.send("mute-all", null);
  };

  // Host Action: Mute Specific Participant
  const handleMuteSingleParticipant = (peerId: string) => {
    if (!isHost) return;
    signalingClientRef.current?.send("mute-participant", peerId);
  };

  // Host Action: Remove Specific Participant
  const handleRemoveParticipant = async (peerId: string) => {
    if (!isHost) return;
    try {
      signalingClientRef.current?.send("kick-participant", peerId);
      const pc = pcsRef.current.get(peerId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(peerId);
      }
      setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
    } catch (err) {
      console.error("Failed to remove participant:", err);
    }
  };

  // Host Action: End Meeting for All
  const handleEndMeetingForAll = async () => {
    if (!isHost) return;
    try {
      await api.endMeeting(code);
      signalingClientRef.current?.send("end-meeting", null);
      handleLeaveCall();
    } catch (err) {
      console.error("Error ending meeting:", err);
      handleLeaveCall();
    }
  };

  // Leave Call
  const handleLeaveCall = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    if (signalingClientRef.current) {
      signalingClientRef.current.close();
    }
    router.push("/");
  };

  const totalCount = 1 + remotePeers.length;
  const gridColsClass =
    totalCount === 1
      ? "grid-cols-1 max-w-4xl"
      : totalCount === 2
      ? "grid-cols-1 md:grid-cols-2 max-w-6xl"
      : totalCount <= 4
      ? "grid-cols-1 md:grid-cols-2 max-w-6xl"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl";

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col h-screen overflow-hidden relative">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">{meeting ? meeting.title : "Meeting Room"}</h1>
            <div className="flex items-center space-x-2 text-xs text-zinc-400">
              <span>Code: <code className="text-blue-400 font-mono">{code}</code></span>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="p-1 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded transition-colors flex items-center space-x-1 text-[11px]"
                title="Share Meeting Link"
              >
                <Share2 className="w-3 h-3 text-blue-400" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isScreenSharing && (
            <span className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full font-medium border border-blue-500/30 flex items-center space-x-1 animate-pulse">
              <MonitorUp className="w-3.5 h-3.5" />
              <span>Sharing Screen</span>
            </span>
          )}

          {isHost && (
            <span className="text-xs px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full font-medium border border-amber-500/20 flex items-center space-x-1">
              <Crown className="w-3.5 h-3.5" />
              <span>Host</span>
            </span>
          )}
          <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-medium border border-emerald-500/20">
            Mesh Call ({totalCount} Active)
          </span>
        </div>
      </header>

      {/* Main Grid Area & Slide-over Drawers */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-6 flex items-center justify-center bg-zinc-950 overflow-y-auto">
          <div className={`grid ${gridColsClass} gap-6 w-full items-center justify-center`}>
            {/* Local Video / Screen Share Tile */}
            <div className="relative w-full h-full min-h-[260px] bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  isScreenSharing ? "" : "transform -scale-x-100"
                } ${isVideoOff && !isScreenSharing ? "hidden" : "block"}`}
              />

              {isVideoOff && !isScreenSharing && (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-zinc-400 text-xs font-medium">Camera turned off</span>
                </div>
              )}

              <div className="absolute bottom-4 left-4 bg-zinc-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-800 text-xs font-medium flex items-center space-x-2">
                <span>{name} (You {isScreenSharing ? "• Presenting" : ""})</span>
                {isMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Remote Peer Video Tiles */}
            {remotePeers.map((peer) => (
              <RemoteVideoTile key={peer.peerId} peer={peer} />
            ))}
          </div>
        </div>

        {/* Slide-Over Participants Drawer */}
        {isParticipantsOpen && (
          <aside className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-sm">Participants ({totalCount})</h2>
              </div>
              <button
                onClick={() => setIsParticipantsOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Host Global Controls */}
            {isHost && (
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/50 space-y-2">
                <button
                  onClick={handleMuteAll}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <VolumeX className="w-4 h-4 text-amber-400" />
                  <span>Mute All Participants</span>
                </button>
              </div>
            )}

            {/* Participant List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* You (Local) */}
              <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-white">{name} (Me)</span>
                    {isHost && <span className="text-[10px] block text-amber-400 font-semibold">Host</span>}
                  </div>
                </div>
                {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              </div>

              {/* Remote Peers */}
              {remotePeers.map((peer) => (
                <div
                  key={peer.peerId}
                  className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {peer.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-white">{peer.displayName}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    {isHost && (
                      <>
                        <button
                          onClick={() => handleMuteSingleParticipant(peer.peerId)}
                          className="p-1 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Mute microphone"
                        >
                          <VolumeX className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveParticipant(peer.peerId)}
                          className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove participant"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Slide-Over In-Call Chat Drawer */}
        {isChatOpen && (
          <aside className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-sm">In-Call Chat</h2>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-2">
                  <MessageSquare className="w-8 h-8 stroke-1 text-zinc-600" />
                  <p className="text-xs">No messages yet.</p>
                  <p className="text-[11px] text-zinc-600">Send a message to start chatting with meeting participants.</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-zinc-400">
                      <span className="font-semibold text-zinc-300">{msg.isSelf ? "You" : msg.sender}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        msg.isSelf
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700/50"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center space-x-2">
              <input
                type="text"
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs"
              />
              <button
                type="submit"
                disabled={!chatInputText.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Control Bar */}
      <footer className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleAudio}
            className={`p-3.5 rounded-2xl transition-all flex items-center space-x-2 ${
              isMuted
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-xs font-medium hidden sm:inline">
              {isMuted ? "Unmute" : "Mute"}
            </span>
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl transition-all flex items-center space-x-2 ${
              isVideoOff
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            <span className="text-xs font-medium hidden sm:inline">
              {isVideoOff ? "Start Video" : "Stop Video"}
            </span>
          </button>

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl transition-all flex items-center space-x-2 ${
              isScreenSharing
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            <MonitorUp className="w-5 h-5" />
            <span className="text-xs font-medium hidden sm:inline">
              {isScreenSharing ? "Stop Share" : "Share Screen"}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setIsParticipantsOpen(!isParticipantsOpen);
              if (isChatOpen) setIsChatOpen(false);
            }}
            className={`p-3.5 rounded-2xl transition-colors flex items-center space-x-1.5 ${
              isParticipantsOpen
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">{totalCount}</span>
          </button>

          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              setUnreadCount(0);
              if (isParticipantsOpen) setIsParticipantsOpen(false);
            }}
            className={`p-3.5 rounded-2xl transition-colors relative ${
              isChatOpen
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
            title="In-Call Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {isHost ? (
            <button
              onClick={handleEndMeetingForAll}
              className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl shadow-lg transition-all flex items-center space-x-2"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-sm font-medium">End Meeting for All</span>
            </button>
          ) : (
            <button
              onClick={handleLeaveCall}
              className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl shadow-lg transition-all flex items-center space-x-2"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-sm font-medium">Leave</span>
            </button>
          )}
        </div>
      </footer>

      {/* Share Meeting Modal */}
      {meeting && (
        <ShareMeetingModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          meetingCode={meeting.meeting_code}
          meetingTitle={meeting.title}
          autoRedirectOnJoin={false}
        />
      )}
    </main>
  );
}
