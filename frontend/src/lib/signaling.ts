/**
 * WebRTC Signaling Message Interface
 */
export interface SignalingMessage {
  type:
    | "join"
    | "offer"
    | "answer"
    | "ice-candidate"
    | "leave"
    | "mute-toggle"
    | "mute-all"
    | "end-meeting"
    | "kick-participant";
  from: string;
  to: string | null;
  payload: any;
}

export type MessageHandler = (message: SignalingMessage) => void;

/**
 * WebSocket Client Wrapper for WebRTC Signaling.
 * Manages WebSocket lifecycle, auto-reconnects, and message dispatching.
 */
export class SignalingClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback: MessageHandler;

  constructor(meetingCode: string, participantId: string, onMessage: MessageHandler) {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_WS_HOST || "meetroom-77y7.onrender.com";
    this.url = `${wsProtocol}//${host}/ws/meetings/${meetingCode}?participant_id=${encodeURIComponent(
      participantId
    )}`;
    this.onMessageCallback = onMessage;
  }

  public connect(): void {
    if (this.ws) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[SignalingClient] Connected to signaling WebSocket.");
    };

    this.ws.onmessage = (event) => {
      try {
        const message: SignalingMessage = JSON.parse(event.data);
        console.log(`[SignalingClient] Received [${message.type}] from '${message.from}'`);
        this.onMessageCallback(message);
      } catch (err) {
        console.error("[SignalingClient] Error parsing incoming WebSocket message:", err);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[SignalingClient] WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("[SignalingClient] Signaling WebSocket connection closed.");
    };
  }

  public send(type: SignalingMessage["type"], to: string | null, payload: any = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = { type, to, payload };
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn("[SignalingClient] Cannot send message: WebSocket is not connected.");
    }
  }

  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
