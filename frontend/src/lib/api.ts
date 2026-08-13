// Base API URL for FastAPI backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface Participant {
  id: number;
  meeting_id: number;
  user_id?: number;
  display_name: string;
  role: string;
  joined_at?: string;
  left_at?: string;
  is_muted: boolean;
  is_video_on: boolean;
}

export interface Meeting {
  id: number;
  meeting_code: string;
  host_id: number;
  title: string;
  description?: string;
  meeting_type: "instant" | "scheduled";
  duration_minutes: number;
  status: "scheduled" | "ongoing" | "ended" | "cancelled";
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  host?: User;
  participants?: Participant[];
}

/**
 * Generic fetch wrapper for FastAPI backend API requests.
 */
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody || response.statusText}`);
  }

  return response.json();
}

/**
 * API methods corresponding to FastAPI REST routes
 */
export const api = {
  // Fetch default logged-in user
  getCurrentUser: (): Promise<User> => fetchAPI<User>("/api/users/me"),

  // Fetch upcoming scheduled meetings
  getUpcomingMeetings: (): Promise<Meeting[]> => fetchAPI<Meeting[]>("/api/meetings/upcoming"),

  // Fetch past/ended meetings
  getRecentMeetings: (): Promise<Meeting[]> => fetchAPI<Meeting[]>("/api/meetings/recent"),

  // Fetch specific meeting by meeting_code
  getMeetingByCode: (code: string): Promise<Meeting> => fetchAPI<Meeting>(`/api/meetings/${code}`),

  // Create an instant meeting
  createInstantMeeting: (title: string = "Instant Meeting"): Promise<Meeting> =>
    fetchAPI<Meeting>("/api/meetings/instant", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  // Schedule a future meeting
  scheduleMeeting: (data: {
    title: string;
    description?: string;
    scheduled_at: string;
    duration_minutes: number;
  }): Promise<Meeting> =>
    fetchAPI<Meeting>("/api/meetings/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Validate code and create participant record on join
  joinMeeting: (code: string, displayName: string): Promise<Participant> =>
    fetchAPI<Participant>(`/api/meetings/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ display_name: displayName }),
    }),

  // Host ends meeting for all participants
  endMeeting: (code: string): Promise<Meeting> =>
    fetchAPI<Meeting>(`/api/meetings/${code}/end`, {
      method: "POST",
    }),

  // Host removes a participant
  removeParticipant: (code: string, participantId: number): Promise<void> =>
    fetchAPI<void>(`/api/meetings/${code}/participants/${participantId}`, {
      method: "DELETE",
    }),
};
