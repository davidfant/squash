## Environment

The current project is a Cloudflare Worker containing a Vite React app and a tRPC API. This will be deployed in a Cloudflare Worker and must run in workerd.

Use pnpm as your package manager, not npm or yarn

Store environment variables in `.dev.vars`. When updating `.dev.vars` always run `pnpm typegen` afterwards so that Cloudflare Worker TypeScript types are updated correctly.

## API best practices

- Use tRPC procedures to define your API endpoints
- Make sure to always validate input using Zod schemas with `.input()` on procedures
- Make sure to always type the API route output strongly using `.output()` or by returning typed data. This ensures that the React app can use the API in a type-safe way.

## Interacting with the API from the React App

The project uses tRPC with React Query integration for type-safe API calls:
`import { trpc } from "@/trpc";`

This provides **fully type-safe** API calls with automatic type inference from your tRPC router.

**Core Concepts**

- **Queries**: Use `trpc.[procedure].useQuery()` for fetching data
- **Mutations**: Use `trpc.[procedure].useMutation()` for data modifications
- Full TypeScript type safety from server to client with zero code generation
- Automatic React Query integration with caching, refetching, and optimistic updates

---

**Queries**

```tsx
import { trpc } from "@/trpc";

function UserCard({ id }: { id: string }) {
  const query = trpc.users.getById.useQuery({ id });

  if (query.isLoading) return <Spinner />;
  if (query.isError) return <Error msg={query.error.message} />;
  return <div>{query.data.name}</div>;
}
```

Notes:

- Input parameters are automatically typed based on your tRPC procedure's `.input()` schema
- The returned `data` is automatically typed based on your procedure's return type
- All standard React Query options are available (enabled, refetchInterval, etc.)

---

**Mutations**

```tsx
import { trpc } from "@/trpc";

function RenameUser({ id }: { id: string }) {
  const utils = trpc.useUtils(); // tRPC utilities for cache management

  const mutation = trpc.users.update.useMutation({
    onSuccess: (data) => {
      // data is fully typed based on your procedure's return type
      utils.users.getById.invalidate({ id }); // invalidate and refetch
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const name = new FormData(e.currentTarget).get("name") as string;
        mutation.mutate({ id, name });
      }}
    >
      <input name="name" />
      <button disabled={mutation.isPending}>Save</button>
    </form>
  );
}
```

Notes:

- `mutation.mutate()` accepts parameters matching your procedure's `.input()` schema
- On failure, `mutation.error` contains the error details
- Use `trpc.useUtils()` for cache management and optimistic updates

---

**Defining tRPC Procedures**

In [src/worker/router.ts](src/worker/router.ts), define your API endpoints:

```typescript
import { z } from "zod";
import { procedure, router } from "./trpc";

export const appRouter = router({
  users: router({
    getById: procedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        // Fetch user by ID
        return { id: input.id, name: "John Doe" };
      }),
    update: procedure
      .input(z.object({ id: z.string(), name: z.string() }))
      .mutation(async ({ input }) => {
        // Update user
        return { id: input.id, name: input.name };
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

**Error Handling Pattern**

```tsx
if (query.error) {
  return <Alert variant="destructive">{query.error.message}</Alert>;
}
```

tRPC provides type-safe error handling with detailed error information automatically propagated to the client.

## Google Calendar API docs

```typescript
// to call a tool add this in the backend. you must cast result.data to the expected typescript type to make sure our code is typesafe
const result = await composio.tools.execute("GOOGLECALENDAR_CREATE_EVENT", {
  userId: '...',
  arguments: {
    ...
  },
});
if (!result.successful) {
  console.error(result.error);
  return:
}
const resultData = result.data as { ... };
```

```typescript
// tool slug: GOOGLECALENDAR_CREATE_EVENT
namespace GoogleCalendarCreateEvent {
  /**
   * Creates a new event in a Google Calendar.
   * @slug composio.google_calendar_create_event
   */
  export interface Input {
    /**
     * Event start time in ISO format without timezone.
     * Format: YYYY-MM-DDTHH:MM:SS or YYYY-MM-DDTHH:MM
     * @required
     * @example "2025-10-15T15:00:00"
     */
    start_datetime: string;

    /**
     * List of attendee email addresses.
     * @example ["user@example.com", "ai.prototyping.course@gmail.com"]
     */
    attendees?: string[];

    /**
     * Additional properties for birthday events; usually null.
     * @example null
     */
    birthday_properties?: Record<string, any> | null;

    /**
     * Target calendar identifier; "primary" for the user's main calendar.
     * @required
     * @example "primary"
     */
    calendar_id: string;

    /**
     * Create a Google Meet link (requires paid Google Workspace account).
     * @example true
     */
    create_meeting_room?: boolean;

    /**
     * Event description; may contain HTML.
     * @example "Composio Test"
     */
    description?: string;

    /**
     * Defines the kind of event being created.
     * Allowed: "birthday" | "default" | "focusTime" | "outOfOffice" | "workingLocation"
     * @required
     * @example "default"
     */
    event_type: string;

    /**
     * Duration in hours (0–24). Use this instead of passing 60 minutes.
     * @default 0
     * @example 1
     */
    event_duration_hour?: number;

    /**
     * Duration in minutes (0–59 only).
     * @default 30
     * @example 30
     */
    event_duration_minutes?: number;

    /**
     * If true, the organizer is not added as an attendee.
     * @default false
     * @example false
     */
    exclude_organizer?: boolean;

    /**
     * For "focusTime" events (requires Workspace Enterprise).
     * @example null
     */
    focus_time_properties?: Record<string, any> | null;

    /**
     * Allow guests to invite others.
     * @example true
     */
    guests_can_invite_others?: boolean;

    /**
     * Allow attendees to view each other.
     * @example true
     */
    guests_can_see_other_guests?: boolean;

    /**
     * Allow guests to modify the event.
     * @example false
     */
    guests_can_modify?: boolean;

    /**
     * Free-form text description of location.
     * @example "San Francisco, CA"
     */
    location?: string;

    /**
     * Properties specific to out-of-office events.
     * @example null
     */
    out_of_office_properties?: Record<string, any> | null;

    /**
     * RRULE/EXRULE/RDATE/EXDATE lines defining recurrence.
     * @example ["RRULE:FREQ=WEEKLY;COUNT=4"]
     */
    recurrence?: string[];

    /**
     * Whether to send updates to attendees.
     * @default true
     * @example true
     */
    send_updates?: boolean;

    /**
     * Title of the event.
     * @required
     * @example "Composio Test"
     */
    summary: string;

    /**
     * Time zone for event times; required if datetime is naive.
     * @default "UTC"
     * @example "America/Los_Angeles"
     */
    timezone?: string;

    /**
     * Busy/available setting.
     * Allowed: "opaque" | "transparent"
     * @default "opaque"
     * @example "opaque"
     */
    transparency?: string;

    /**
     * Event visibility level.
     * Allowed: "default" | "public" | "private" | "confidential"
     * @default "default"
     * @example "default"
     */
    visibility?: string;

    /**
     * Used for working-location events (Workspace Enterprise only).
     * @example null
     */
    working_location_properties?: Record<string, any> | null;
  }

  export interface Output {
    /**
     * Indicates whether the API call succeeded.
     * @example true
     */
    successful: boolean;

    /**
     * Contains the created calendar event data.
     */
    data: {
      response_data: CalendarEvent;
    };

    /**
     * Error message, if any.
     * @example null
     */
    error: string | null;

    /**
     * Log identifier for tracing API requests.
     * @example "log_YjX7O_auWoa6"
     */
    log_id: string;
  }

  export interface CalendarEvent {
    id: string;
    kind: string;
    etag: string;
    status: string;
    htmlLink: string;
    iCalUID: string;
    summary: string;
    description?: string;
    location?: string;
    created: string;
    updated: string;
    eventType: string;
    sequence: number;
    start: EventDateTime;
    end: EventDateTime;
    reminders: { useDefault: boolean };
    attendees?: Attendee[];
    organizer: Organizer;
    creator: Creator;
  }

  export interface EventDateTime {
    dateTime: string;
    timeZone: string;
  }

  export interface Attendee {
    email: string;
    organizer?: boolean;
    responseStatus?: string;
    self?: boolean;
  }

  export interface Organizer {
    email: string;
    self?: boolean;
  }

  export interface Creator {
    email: string;
    self?: boolean;
  }
}

// tool slug: GOOGLECALENDAR_EVENTS_LIST
namespace GoogleCalendarListEvents {
  /**
   * Lists events from a specified calendar.
   * @slug composio.google_calendar_list_events
   */
  export interface Input {
    /**
     * Calendar identifier. Use "primary" for the current user's main calendar.
     * @required
     * @example "primary"
     */
    calendar_id: string;

    /**
     * Deprecated and ignored.
     * @example false
     */
    always_include_email?: boolean;

    /**
     * Restrict to specific event types.
     * Allowed: "birthday" | "default" | "focusTime" | "fromGmail" | "outOfOffice" | "workingLocation"
     * @example ["default", "outOfOffice"]
     */
    event_types?: string[];

    /**
     * iCalendar event ID for direct lookup.
     * @example "abcd1234@google.com"
     */
    i_cal_uid?: string;

    /**
     * Maximum number of attendees to include.
     * @example 10
     */
    max_attendees?: number;

    /**
     * Maximum number of events per page (≤2500).
     * @default 250
     * @example 250
     */
    max_results?: number;

    /**
     * Sort order for returned events.
     * Allowed: "startTime" | "updated"
     * @example "startTime"
     */
    order_by?: string;

    /**
     * Token for paginated result sets.
     * @example "Cg0IABCw9Jj0zQEaJ..."
     */
    page_token?: string;

    /**
     * Filter for private extended properties (name=value).
     * @example ["team=dev"]
     */
    private_extended_property?: string[];

    /**
     * Free-text search query.
     * @example "weekly team meeting"
     */
    q?: string;

    /**
     * Filter for shared extended properties (name=value).
     * @example ["project=alpha"]
     */
    shared_extended_property?: string[];

    /**
     * Include cancelled events in the response.
     * @default false
     * @example true
     */
    show_deleted?: boolean;

    /**
     * Include hidden invitations where responseStatus='needsAction'.
     * @default false
     * @example false
     */
    show_hidden_invitations?: boolean;

    /**
     * Expand recurring events into single instances.
     * @default false
     * @example true
     */
    single_events?: boolean;

    /**
     * Token to fetch only events updated since last sync.
     * @example "CPjY5t-..."
     */
    sync_token?: string;

    /**
     * Upper bound (exclusive) for event start time (RFC3339).
     * @example "2025-12-31T23:59:59Z"
     */
    time_max?: string;

    /**
     * Lower bound (exclusive) for event end time (RFC3339).
     * @example "2025-01-01T00:00:00Z"
     */
    time_min?: string;

    /**
     * Time zone for event times in the response (IANA identifier).
     * @example "America/New_York"
     */
    time_zone?: string;

    /**
     * Lower bound for event last modification time (RFC3339).
     * @example "2025-06-01T00:00:00Z"
     */
    updated_min?: string;
  }

  export interface Output {
    /**
     * Calendar access role for the current user.
     * @example "owner"
     */
    accessRole: string;

    /**
     * Default reminder configuration for the calendar.
     * @example [{ "method": "popup", "minutes": 30 }]
     */
    defaultReminders: Reminder[];

    /**
     * Calendar description.
     */
    description: string;

    /**
     * Entity tag of the response.
     * @example "\"p32ft3p58vij900o\""
     */
    etag: string;

    /**
     * Events returned from the list request.
     */
    items: CalendarEvent[];
  }

  export interface Reminder {
    method: string;
    minutes: number;
  }

  export interface CalendarEvent {
    id: string;
    kind: string;
    etag: string;
    status: string;
    htmlLink: string;
    iCalUID: string;
    summary: string;
    description?: string;
    location?: string;
    created: string;
    updated: string;
    eventType: string;
    hangoutLink?: string;
    sequence: number;
    start: EventDateTime;
    end: EventDateTime;
    reminders: { useDefault: boolean };
    attendees?: Attendee[];
    organizer: Organizer;
    creator: Creator;
    conferenceData?: ConferenceData;
  }

  export interface EventDateTime {
    dateTime: string;
    timeZone: string;
  }

  export interface Attendee {
    email: string;
    organizer?: boolean;
    responseStatus?: string;
    self?: boolean;
  }

  export interface Organizer {
    email: string;
    self?: boolean;
  }

  export interface Creator {
    email: string;
    self?: boolean;
  }

  export interface ConferenceData {
    conferenceId: string;
    conferenceSolution: ConferenceSolution;
    createRequest: CreateRequest;
    entryPoints: EntryPoint[];
  }

  export interface ConferenceSolution {
    iconUri: string;
    key: { type: string };
    name: string;
  }

  export interface CreateRequest {
    conferenceSolutionKey: { type: string };
    requestId: string;
    status: { statusCode: string };
  }

  export interface EntryPoint {
    entryPointType: string;
    label: string;
    uri: string;
  }
}

// tool slug: GOOGLECALENDAR_LIST_CALENDARS
namespace GoogleCalendarListCalendars {
  /**
   * Retrieves a paginated list of calendars from the user's calendar list.
   * @slug composio.googlecalendar_list_calendars
   */
  export interface Input {
    /**
     * Maximum number of calendars to return per page. Maximum allowed value is 250.
     * @default 100
     * @example 50
     */
    maxResults?: number;

    /**
     * Minimum access role the user must have for the returned calendars.
     * Allowed values: "freeBusyReader" | "reader" | "writer" | "owner"
     * @example "reader"
     */
    minAccessRole?: string;

    /**
     * Token for retrieving a specific page of results from a previous list operation.
     * @example "Cg0IABCw9Jj0zQEaJ..."
     */
    pageToken?: string;

    /**
     * Include calendar list entries deleted from the user's list.
     * Deleted entries are returned with the `deleted` field set to true.
     * When using `syncToken`, deleted (and hidden) entries changed since the previous list are always included,
     * and this parameter must not be set to false.
     * @default false
     */
    showDeleted?: boolean;

    /**
     * Include calendars hidden in the user interface.
     * When using `syncToken`, hidden (and deleted) entries changed since the previous list are always included,
     * and this parameter must not be set to false.
     * @default false
     */
    showHidden?: boolean;

    /**
     * Sync token from a previous list request's `nextSyncToken` to retrieve only entries changed since the last sync.
     * When provided, only `syncToken` and optionally `pageToken` are used; other filters are ignored.
     * `minAccessRole` cannot be combined with `syncToken`.
     * @example "CP_T6IWpp5ADEhtiam9ybi5zb2RlcmJlcmc5N0BnbWFpbC5jb20="
     */
    syncToken?: string;
  }

  export interface Output {
    /**
     * Whether the API call succeeded.
     * @example true
     */
    successful: boolean;

    /**
     * The data returned by the API.
     */
    data: {
      response_data: CalendarList;
    };

    /**
     * Error message if the call failed.
     * @example null
     */
    error: string | null;

    /**
     * Internal log identifier for tracing requests.
     * @example "log_YjX7O_auWoa6"
     */
    log_id: string;
  }

  /**
   * The full list of calendars and sync state.
   */
  export interface CalendarList {
    /**
     * Entity tag of the collection.
     * @example "\"p33vt7q45l6jp00o\""
     */
    etag: string;

    /**
     * Type of the collection returned.
     * @example "calendar#calendarList"
     */
    kind: string;

    /**
     * Token to use for the next incremental sync.
     * @example "CP_T6IWpp5ADEhtiam9ybi5zb2RlcmJlcmc5N0BnbWFpbC5jb20="
     */
    nextSyncToken?: string;

    /**
     * Calendars in the user's calendar list.
     */
    items: CalendarListEntry[];
  }

  export interface CalendarListEntry {
    /**
     * The user's access role on the calendar.
     * Allowed: "freeBusyReader" | "reader" | "writer" | "owner"
     * @example "owner"
     */
    accessRole: string;

    /**
     * Background color of the calendar in '#RRGGBB' format.
     * @example "#f83a22"
     */
    backgroundColor: string;

    /**
     * ID of the color chosen for the calendar.
     * @example "3"
     */
    colorId: string;

    /**
     * The conference properties for the calendar.
     */
    conferenceProperties: ConferenceProperties;

    /**
     * Default reminders for events on this calendar.
     */
    defaultReminders: DefaultReminder[];

    /**
     * Description of the calendar, if set.
     * @example "Week numbers displayed weekly"
     */
    description?: string;

    /**
     * Entity tag of the calendar entry.
     * @example "\"1445061190412000\""
     */
    etag: string;

    /**
     * Foreground color of the calendar in '#RRGGBB' format.
     * @example "#000000"
     */
    foregroundColor: string;

    /**
     * Identifier of the calendar.
     * @example "primary" | "p#weeknum@group.v.calendar.google.com"
     */
    id: string;

    /**
     * Type of the resource.
     * @example "calendar#calendarListEntry"
     */
    kind: string;

    /**
     * Whether the calendar is currently selected/visible in the UI.
     * @default false
     */
    selected?: boolean;

    /**
     * User's title for the calendar.
     * @example "Week Numbers"
     */
    summary: string;

    /**
     * Time zone of the calendar.
     * @example "Europe/Stockholm"
     */
    timeZone: string;

    /**
     * Notification settings for calendar-level notifications.
     */
    notificationSettings?: NotificationSettings;

    /**
     * Whether this calendar is the primary calendar of the user.
     */
    primary?: boolean;
  }

  export interface ConferenceProperties {
    /**
     * The types of conference solutions that are allowed for this calendar.
     * @example ["hangoutsMeet"]
     */
    allowedConferenceSolutionTypes: string[];
  }

  export interface DefaultReminder {
    /**
     * Reminder method.
     * Allowed: "email" | "popup"
     * @example "popup"
     */
    method: string;

    /**
     * Number of minutes before the event when the reminder triggers.
     * @example 30
     */
    minutes: number;
  }

  export interface NotificationSettings {
    /**
     * List of notification rules for the calendar.
     */
    notifications: Notification[];
  }

  export interface Notification {
    /**
     * Notification method.
     * Allowed: "email" | "sms"
     * @example "email"
     */
    method: string;

    /**
     * Type of notification.
     * Allowed: "eventCreation" | "eventChange" | "eventCancellation" | "eventResponse"
     * @example "eventCreation"
     */
    type: string;
  }
}
```
