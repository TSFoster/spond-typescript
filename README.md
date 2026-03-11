# spond

TypeScript client for the [Spond](https://spond.com) API. Zero runtime dependencies — uses native `fetch` on Node 18+.

## Install

```bash
npm install spond
```

## Quick start

```ts
import { Spond } from "spond";

const spond = new Spond({
  username: "me@example.com",
  password: "secret",
});

// Authentication happens automatically on first request
const groups = await spond.getGroups();
const events = await spond.getEvents({ maxEvents: 10 });

console.log(groups[0].name);
console.log(events[0].heading);
```

## API

### `Spond`

The main client for the core Spond API. Covers groups, events, posts, chat, and profile endpoints.

```ts
const spond = new Spond({ username, password });
```

#### Profile

| Method | Returns | Description |
| --- | --- | --- |
| `getProfile()` | `PersonalProfile` | Authenticated user's profile |
| `getHash()` | `UserHash` | User hashes (web, Android, iOS) |

#### Groups

| Method | Returns | Description |
| --- | --- | --- |
| `getGroups()` | `GroupDetailed[]` | All groups the user belongs to |
| `getGroup(groupId)` | `GroupDetailed` | Single group by ID (cached lookup) |
| `getFavoriteGroups()` | `FavoriteGroup[]` | Favorite groups |
| `createGroup(data)` | `GroupDetailed` | Create a new group |

#### Events

| Method | Returns | Description |
| --- | --- | --- |
| `getEvents(options?)` | `Event[]` | Events matching the given filters |
| `getEvent(eventId)` | `Event` | Single event by ID (cached lookup) |
| `createEvent(data)` | `Event` | Create a new event |
| `updateEvent(eventId, updates)` | `Event` | Partially update an event |
| `acceptEvent(eventId)` | `void` | Accept an event invitation |
| `declineEvent(eventId)` | `void` | Decline an event invitation |
| `changeResponse(eventId, userId, payload)` | `unknown` | Change a user's RSVP |
| `getEventAttendanceXlsx(eventId)` | `ArrayBuffer` | Download attendance XLSX |

`getEvents` accepts an options object:

```ts
await spond.getEvents({
  groupId: "abc-123",
  includeScheduled: true,
  includeHidden: false,
  maxEvents: 50,
  minStart: new Date("2025-01-01"),
  maxEnd: new Date("2025-12-31"),
});
```

#### Posts

| Method | Returns | Description |
| --- | --- | --- |
| `getPosts(options?)` | `Post[]` | Posts visible to the user |

#### Chat

| Method | Returns | Description |
| --- | --- | --- |
| `getMessages(maxChats?)` | `ChatMessage[]` | Recent chat conversations |
| `sendMessage(options)` | `ChatMessage` | Send or continue a chat message |

Chat authentication is handled automatically on first use. To send a message you can either continue an existing chat or start a new one:

```ts
// Continue existing chat
await spond.sendMessage({ chatId: "chat-id", text: "Hello!" });

// Start new chat
await spond.sendMessage({ userId: "user-id", groupId: "group-id", text: "Hi there" });
```

#### Person lookup

| Method | Returns | Description |
| --- | --- | --- |
| `getPerson(identifier)` | `GroupMember` | Find a person by ID, email, full name, or profile ID |

Searches across all groups and their members/guardians.

#### Utility

| Method | Returns | Description |
| --- | --- | --- |
| `getClock()` | `ClockResponse` | Current server time (no auth required) |
| `clearCache()` | `void` | Clear cached groups and events |

---

### `SpondClub`

Client for the Spond Club API (financial transactions).

```ts
import { SpondClub } from "spond";

const club = new SpondClub({ username, password });

const transactions = await club.getTransactions("club-id", { maxItems: 50 });
```

| Method | Returns | Description |
| --- | --- | --- |
| `getTransactions(clubId, options?)` | `Transaction[]` | Auto-paginating transaction fetch |

---

### Error handling

The package exports two error classes:

```ts
import { SpondAuthError, SpondApiError } from "spond";

try {
  await spond.getGroups();
} catch (err) {
  if (err instanceof SpondAuthError) {
    // Invalid credentials or login failure
  }
  if (err instanceof SpondApiError) {
    console.log(err.status); // HTTP status code
    console.log(err.body);   // Raw response body
  }
}
```

### Custom API URL

Both clients accept an optional `apiUrl` to override the default base URL, useful for testing or proxying:

```ts
const spond = new Spond({
  username: "me@example.com",
  password: "secret",
  apiUrl: "http://localhost:3000/core/v1/",
});
```

## Requirements

- Node.js 18 or later (uses native `fetch`)
- ESM only (`"type": "module"`)

## Examples

Ready-to-run scripts are in the `examples/` directory. They all read credentials
from environment variables and write output to `./exports/`.

| Script | Description |
| --- | --- |
| `overview.ts` | Print a summary of groups, events, chats, and transactions |
| `groups.ts` | Export each group as a JSON file |
| `attendance.ts` | Generate per-event attendance CSVs for a date range |
| `transactions.ts` | Export club transactions to a CSV |
| `ical.ts` | Generate an `.ics` calendar file of all events |

Run any example directly with [`tsx`](https://github.com/privatenumber/tsx) (no build step needed):

```bash
# Install tsx once
npm install --save-dev tsx

# Run an example
SPOND_USERNAME=you@example.com SPOND_PASSWORD=secret npx tsx examples/overview.ts

# Attendance report for a date range
SPOND_USERNAME=... SPOND_PASSWORD=... \
  npx tsx examples/attendance.ts --from 2025-01-01 --to 2025-12-31 --all

# Club transactions (requires SPOND_CLUB_ID)
SPOND_USERNAME=... SPOND_PASSWORD=... SPOND_CLUB_ID=<id> \
  npx tsx examples/transactions.ts --max 500
```

## Development

```bash
npm install
npm run typecheck           # type-check the library
npm run typecheck:examples  # type-check the examples
npm run build               # compile to dist/
```

## License

MIT
