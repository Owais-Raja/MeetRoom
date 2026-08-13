/**
 * WebRTC Configuration using public STUN & TURN servers for Cross-Network NAT Traversal.
 * Uses max-bundle and rtcpMuxPolicy to bundle audio and video onto a single network socket.
 * Combines Google, Cloudflare, Twilio STUN servers with Metered TURN relay servers to connect
 * peers across mobile hotspots (4G/5G), corporate firewalls, and remote home ISPs.
 */
export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turn:global.relay.metered.ca:80",
        "turn:global.relay.metered.ca:443",
        "turn:global.relay.metered.ca:443?transport=tcp",
      ],
      username: "openrelay",
      credential: "openrelay",
    },
  ],
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
  iceCandidatePoolSize: 10,
};

/**
 * Creates and configures a new RTCPeerConnection instance for a remote peer.
 * 
 * @param peerId Unique participant ID of the remote peer.
 * @param localStream Local MediaStream containing camera and microphone tracks.
 * @param onIceCandidate Callback fired when local ICE candidates are discovered.
 * @param onRemoteStream Callback fired when remote audio/video tracks arrive.
 */
export function createPeerConnection(
  peerId: string,
  localStream: MediaStream | null,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onRemoteStream: (stream: MediaStream) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIGURATION);
  const remoteStream = new MediaStream();

  // 1. Add all active local media tracks (Audio + Video) to the Peer Connection
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
  }

  // 2. Handle local ICE candidate discovery -> send via signaling server
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  // Log ICE connection state changes for cross-network debugging
  pc.oniceconnectionstatechange = () => {
    console.log(`[WebRTC ICE State] Peer '${peerId}': ${pc.iceConnectionState}`);
  };

  // 3. Handle incoming remote media tracks -> attach to remote video element
  pc.ontrack = (event) => {
    console.log(`[WebRTC] Received remote track '${event.track.kind}' from peer '${peerId}'`);
    
    if (event.streams && event.streams[0]) {
      event.streams[0].getTracks().forEach((track) => {
        if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });
    } else if (event.track) {
      if (!remoteStream.getTracks().some((t) => t.id === event.track.id)) {
        remoteStream.addTrack(event.track);
      }
    }

    // Always output a fresh MediaStream wrapper so React detects reference changes and updates video elements
    onRemoteStream(new MediaStream(remoteStream.getTracks()));
  };

  return pc;
}
