/**
 * Thrown when authentication with the Spond API fails
 * (invalid credentials, missing token in response, etc.).
 */
export class SpondAuthError extends Error {
  constructor(message = "Authentication failed — check your credentials") {
    super(message);
    this.name = "SpondAuthError";
  }
}

/**
 * Thrown when the Spond API returns a non-OK HTTP response.
 */
export class SpondApiError extends Error {
  /** HTTP status code returned by the API. */
  readonly status: number;
  /** Raw response body (may be empty). */
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Spond API error ${status}: ${body}`);
    this.name = "SpondApiError";
    this.status = status;
    this.body = body;
  }
}
