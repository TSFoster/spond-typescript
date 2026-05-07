import { SpondBase, type RequestOptions } from "./base.js";
import { SpondAuthError, SpondApiError } from "./errors.js";
import type {
  ChatMessage,
  ChangeResponseOptions,
  ClockResponse,
  CreateEventRequest,
  CreateGroupRequest,
  Event,
  FavoriteGroup,
  GetEventsOptions,
  GetPostsOptions,
  GroupDetailed,
  GroupMember,
  PersonalProfile,
  Post,
  SendMessageOptions,
  SpondConfig,
  UserHash,
} from "./types.js";

/** ISO datetime format used by the Spond API for query parameters. */
const API_DATE_FORMAT = (d: Date): string =>
  d.toISOString().replace(/\.\d{3}Z$/, ".000Z");

/**
 * Client for the core Spond API (groups, events, posts, messaging).
 *
 * @example
 * ```ts
 * const spond = new Spond({ username: "me@example.com", password: "secret" });
 *
 * const groups = await spond.getGroups();
 * const events = await spond.getEvents({ maxEvents: 10 });
 *
 * spond.close();
 * ```
 */
export class Spond extends SpondBase {
  protected get defaultApiUrl(): string {
    return "https://api.spond.com/core/v1/";
  }

  // ---- Cached data ----------------------------------------------------------

  private cachedGroups: GroupDetailed[] | null = null;
  private cachedEvents: Event[] | null = null;

  // ---- Chat state -----------------------------------------------------------

  private chatUrl: string | null = null;
  private chatAuth: string | null = null;

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  /** Fetch the personal profile of the authenticated user. */
  async getProfile(): Promise<PersonalProfile> {
    return this.request<PersonalProfile>("GET", "profile");
  }

  /** Fetch user hashes for the authenticated user. */
  async getHash(): Promise<UserHash> {
    return this.request<UserHash>("GET", "hash");
  }

  // ---------------------------------------------------------------------------
  // Groups
  // ---------------------------------------------------------------------------

  /**
   * Fetch all groups the authenticated user belongs to.
   * Results are cached for subsequent `getGroup()` lookups.
   */
  async getGroups(): Promise<GroupDetailed[]> {
    const groups = await this.request<GroupDetailed[]>("GET", "groups");
    this.cachedGroups = groups;
    return groups;
  }

  /**
   * Get a single group by ID.
   * Uses cached data from a prior `getGroups()` call, fetching first if needed.
   *
   * @throws {Error} If no group with the given ID is found.
   */
  async getGroup(groupId: string): Promise<GroupDetailed> {
    if (!this.cachedGroups) {
      await this.getGroups();
    }

    const group = this.cachedGroups!.find((g) => g.id === groupId);
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }
    return group;
  }

  /** Fetch the authenticated user's favorite groups. */
  async getFavoriteGroups(): Promise<FavoriteGroup[]> {
    return this.request<FavoriteGroup[]>("GET", "groups/favorites");
  }

  /** Create a new group. */
  async createGroup(data: CreateGroupRequest): Promise<GroupDetailed> {
    return this.request<GroupDetailed>("POST", "group", { body: data });
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /**
   * Fetch events matching the given filters.
   * Results are cached for subsequent `getEvent()` lookups.
   */
  async getEvents(options: GetEventsOptions = {}): Promise<Event[]> {
    const params: Record<string, string> = {
      includeComments: "true",
      includeHidden: String(options.includeHidden ?? false),
      addProfileInfo: "true",
      scheduled: String(options.includeScheduled ?? false),
      order: "asc",
      max: String(options.maxEvents ?? 100),
    };

    if (options.groupId) params.groupId = options.groupId;
    if (options.subGroupId) params.subGroupId = options.subGroupId;
    if (options.maxEnd)
      params.maxEndTimestamp = API_DATE_FORMAT(options.maxEnd);
    if (options.minEnd)
      params.minEndTimestamp = API_DATE_FORMAT(options.minEnd);
    if (options.maxStart)
      params.maxStartTimestamp = API_DATE_FORMAT(options.maxStart);
    if (options.minStart)
      params.minStartTimestamp = API_DATE_FORMAT(options.minStart);

    const events = await this.request<Event[]>("GET", "sponds", { params });
    this.cachedEvents = events;
    return events;
  }

  /**
   * Get a single event by ID.
   * Uses cached data from a prior `getEvents()` call, fetching first if needed.
   *
   * @throws {Error} If no event with the given ID is found.
   */
  async getEvent(eventId: string): Promise<Event> {
    if (!this.cachedEvents) {
      await this.getEvents();
    }

    const event = this.cachedEvents!.find((e) => e.id === eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    return event;
  }

  /** Create a new event. */
  async createEvent(data: CreateEventRequest): Promise<Event> {
    return this.request<Event>("POST", "sponds", { body: data });
  }

  /**
   * Update an existing event by merging partial data onto the current event.
   */
  async updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    return this.request<Event>("POST", `sponds/${eventId}`, { body: updates });
  }

  /** Accept an event invitation. */
  async acceptEvent(eventId: string): Promise<void> {
    await this.request<Record<string, never>>(
      "POST",
      `sponds/${eventId}/acceptHost`,
    );
  }

  /** Decline an event invitation. */
  async declineEvent(eventId: string): Promise<void> {
    await this.request<Record<string, never>>(
      "POST",
      `sponds/${eventId}/declineHost`,
    );
  }

  /**
   * Change the RSVP response for a specific user on an event.
   *
   * @param eventId - The event ID.
   * @param userId - The user/member ID whose response to change.
   * @param payload - The response payload (e.g. `{ accepted: true }`).
   * @param options - Optional request flags.
   */
  async changeResponse(
    eventId: string,
    userId: string,
    payload: Record<string, unknown>,
    options: ChangeResponseOptions = {},
  ): Promise<unknown> {
    return this.request("PUT", `sponds/${eventId}/responses/${userId}`, {
      body: payload,
      headers: options.skipPayment
        ? { "X-Spond-SkipPayment": "true" }
        : undefined,
    });
  }

  /**
   * Download the attendance report for an event as an XLSX buffer.
   */
  async getEventAttendanceXlsx(eventId: string): Promise<ArrayBuffer> {
    // This endpoint returns a binary file, so we handle it directly.
    if (!this.token) {
      await this.login();
    }

    const url = `${this.apiUrl}sponds/${eventId}/export`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new SpondApiError(res.status, body);
    }

    return res.arrayBuffer();
  }

  // ---------------------------------------------------------------------------
  // Posts
  // ---------------------------------------------------------------------------

  /** Fetch posts visible to the authenticated user. */
  async getPosts(options: GetPostsOptions = {}): Promise<Post[]> {
    const params: Record<string, string> = {
      type: options.type ?? "FEED",
      includeComments: String(options.includeComments ?? true),
      includeReadStatus: String(options.includeReadStatus ?? false),
      includeSeenCount: String(options.includeSeenCount ?? false),
      max: String(options.max ?? 20),
    };

    return this.request<Post[]>("GET", "posts", { params });
  }

  // ---------------------------------------------------------------------------
  // Chat / Messaging
  // ---------------------------------------------------------------------------

  /**
   * Authenticate with the Spond chat service.
   * Called automatically before the first chat request.
   */
  private async loginChat(): Promise<void> {
    if (!this.token) {
      await this.login();
    }

    const url = `${this.apiUrl}chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new SpondAuthError(`Chat login failed: ${res.status} ${body}`);
    }

    const data = (await res.json()) as { url: string; auth: string };
    this.chatUrl = data.url;
    this.chatAuth = data.auth;
  }

  /** Ensure chat credentials are available. */
  private async ensureChatAuth(): Promise<void> {
    if (!this.chatUrl || !this.chatAuth) {
      await this.loginChat();
    }
  }

  /**
   * Fetch recent chat conversations.
   *
   * @param maxChats - Maximum number of chats to return (default 100).
   */
  async getMessages(maxChats = 100): Promise<ChatMessage[]> {
    await this.ensureChatAuth();

    const url = `${this.chatUrl}/chats/?max=${maxChats}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { auth: this.chatAuth! },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new SpondApiError(res.status, body);
    }

    return (await res.json()) as ChatMessage[];
  }

  /**
   * Send a chat message.
   *
   * Either continue an existing chat (pass `chatId`) or start a new one
   * (pass both `userId` and `groupId`).
   */
  async sendMessage(options: SendMessageOptions): Promise<ChatMessage> {
    await this.ensureChatAuth();

    let payload: Record<string, unknown>;

    if (options.chatId) {
      // Continue existing chat
      payload = {
        chatId: options.chatId,
        text: options.text,
        type: "TEXT",
      };
    } else if (options.userId && options.groupId) {
      // Start new chat
      payload = {
        text: options.text,
        type: "TEXT",
        recipient: options.userId,
        groupId: options.groupId,
      };
    } else {
      throw new Error(
        "sendMessage requires either `chatId` to continue a chat, " +
          "or both `userId` and `groupId` to start a new one",
      );
    }

    const url = `${this.chatUrl}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        auth: this.chatAuth!,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new SpondApiError(res.status, body);
    }

    return (await res.json()) as ChatMessage;
  }

  // ---------------------------------------------------------------------------
  // Person lookup
  // ---------------------------------------------------------------------------

  /**
   * Search for a person across all groups by ID, email, full name, or profile ID.
   *
   * @param identifier - A user ID, email address, full name ("First Last"),
   *                     or profile ID to match against.
   * @throws {Error} If no matching person is found.
   */
  async getPerson(identifier: string): Promise<GroupMember> {
    if (!this.cachedGroups) {
      await this.getGroups();
    }

    for (const group of this.cachedGroups!) {
      for (const member of group.members) {
        if (matchesPerson(member, identifier)) {
          return member;
        }
        // Also search guardians
        for (const guardian of member.guardians ?? []) {
          if (matchesPerson(guardian, identifier)) {
            return guardian;
          }
        }
      }
    }

    throw new Error(`Person not found: ${identifier}`);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /** Get the current server time (no auth required). */
  async getClock(): Promise<ClockResponse> {
    const res = await fetch("https://api.spond.com/core/v1/clock");
    if (!res.ok) {
      const body = await res.text();
      throw new SpondApiError(res.status, body);
    }
    return (await res.json()) as ClockResponse;
  }

  /** Clear the cached groups and events, forcing a fresh fetch on next access. */
  clearCache(): void {
    this.cachedGroups = null;
    this.cachedEvents = null;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function matchesPerson(member: GroupMember, identifier: string): boolean {
  const fullName = `${member.firstName} ${member.lastName}`;
  return (
    member.id === identifier ||
    member.email === identifier ||
    fullName === identifier ||
    member.profile?.id === identifier
  );
}
