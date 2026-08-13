/**
 * WebRTC Configuration using public STUN & TURN servers for NAT Traversal.
 * Combines Google/Twilio STUN servers with Metered TURN relay servers to connect
 * peers across mobile hotspots, corporate firewalls, and remote home ISPs.
 */
export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelay",
      credential: "openrelay",
    },
  ],
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

  // 3. Handle incoming remote media tracks -> attach to remote video element
  pc.ontrack = (event) => {
    console.log(`[WebRTC] Received remote track '${event.track.kind}' from peer '${peerId}'`, event.streams);
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    } else if (event.track) {
      onRemoteStream(new MediaStream([event.track]));
    }
  };

  return pc;
}
