import { SpondBase } from "./base.js";
import { SpondApiError } from "./errors.js";
import type { GetTransactionsOptions, Transaction } from "./types.js";

/**
 * Client for the Spond Club API (financial transactions).
 *
 * @example
 * ```ts
 * const club = new SpondClub({ username: "me@example.com", password: "secret" });
 *
 * const transactions = await club.getTransactions("my-club-id");
 *
 * club.close();
 * ```
 */
export class SpondClub extends SpondBase {
  protected get defaultApiUrl(): string {
    return "https://api.spond.com/club/v1/";
  }

  /**
   * Fetch transactions for a Spond Club.
   *
   * The API returns at most 25 items per request, so this method
   * automatically paginates until all items are fetched (up to `maxItems`).
   *
   * @param clubId  - The Spond Club ID.
   * @param options - Pagination options.
   */
  async getTransactions(
    clubId: string,
    options: GetTransactionsOptions = {},
  ): Promise<Transaction[]> {
    const maxItems = options.maxItems ?? 100;
    const allTransactions: Transaction[] = [];
    let skip = options.skip ?? 0;

    while (allTransactions.length < maxItems) {
      const batch = await this.fetchTransactionPage(clubId, skip);

      if (batch.length === 0) {
        break;
      }

      allTransactions.push(...batch);
      skip += batch.length;
    }

    // Trim to maxItems in case the last batch pushed us over
    return allTransactions.slice(0, maxItems);
  }

  /**
   * Fetch a single page of transactions from the API.
   */
  private async fetchTransactionPage(
    clubId: string,
    skip: number,
  ): Promise<Transaction[]> {
    if (!this.token) {
      await this.login();
    }

    const url = `${this.apiUrl}transactions?skip=${skip}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "X-Spond-Clubid": clubId,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new SpondApiError(res.status, body);
    }

    return (await res.json()) as Transaction[];
  }
}
