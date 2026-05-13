import { SpondAuthError, SpondApiError } from "./errors.js";
import type { LoginResponse, SpondConfig } from "./types.js";

export interface RequestOptions {
  params?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Abstract base class that handles authentication and HTTP requests
 * for both the core Spond API and the SpondClub API.
 */
export abstract class SpondBase {
  protected readonly username: string;
  protected readonly password: string;
  private readonly _apiUrl: string | undefined;
  protected token: string | null = null;

  constructor(config: SpondConfig) {
    this.username = config.username;
    this.password = config.password;
    this._apiUrl = config.apiUrl;
  }

  /** Subclasses provide their own default base URL. */
  protected abstract get defaultApiUrl(): string;

  /** Resolved API base URL (user-provided or subclass default). */
  protected get apiUrl(): string {
    return this._apiUrl ?? this.defaultApiUrl;
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  /**
   * Authenticate with the Spond API using email/password credentials.
   * Called automatically before the first authenticated request.
   */
  async login(): Promise<void> {
    const url = "https://api.spond.com/core/v1/auth2/login";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.username, password: this.password }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new SpondAuthError(
        `Login failed with status ${res.status}: ${body}`,
      );
    }

    const data = (await res.json()) as LoginResponse;
    const accessToken = data.accessToken?.token;

    if (!accessToken) {
      throw new SpondAuthError(
        "Login response did not contain an accessToken — check your credentials",
      );
    }

    this.token = accessToken;
  }

  // ---------------------------------------------------------------------------
  // HTTP helpers
  // ---------------------------------------------------------------------------

  /** Ensure we have a valid token before making an authenticated request. */
  private async ensureAuth(): Promise<void> {
    if (!this.token) {
      await this.login();
    }
  }

  /**
   * Make an authenticated HTTP request to the Spond API.
   *
   * Automatically logs in if no token is present. Throws `SpondApiError` on
   * non-OK responses.
   */
  protected async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    await this.ensureAuth();

    let url = `${this.apiUrl}${path}`;

    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
      Authorization: `Bearer ${this.token}`,
      ...options.headers,
    };

    const res = await fetch(url, {
      method,
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new SpondApiError(res.status, body);
    }

    // Some endpoints return empty bodies (204, etc.)
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * No-op for now — native `fetch` doesn't need cleanup.
   * Provided for API symmetry and future connection-pooling support.
   */
  close(): void {
    // Nothing to clean up with native fetch.
  }
}
