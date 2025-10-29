# Authentication with Clerk

Clerk is a plug-and-play authentication platform for React apps that spares you from building sign-in, sign-up, user-profile and organization flows from scratch; instead, you drop in Clerk’s components and instantly get secure, fully managed auth that you can style to match your own design system. It shines when you need modern features—email or social login, session management, multi-organization switching—without wiring up OAuth, JWTs and UI yourself.

The documentation shows:

- Core UI primitives: `SignedIn` / `SignedOut` for conditional rendering; modal-style `SignInButton` and `SignUpButton` with your custom `<Button>` as children; `UserButton` for profile and account actions; `SignOutButton` to end sessions; and `OrganizationSwitcher` for multi-tenant apps—all condensed into a single page for rapid copy-and-paste integration.
- React hooks: `useUser` for knowing whether the user is authenticated, and details about the authenticated user.

---

## Clerk React Components Reference

### 1. Conditional UI helpers

```tsx
import { SignedIn, SignedOut } from "@clerk/clerk-react";
```

```tsx
<SignedOut>{/* signed‑out only */}</SignedOut>
<SignedIn>{/* signed‑in only */}</SignedIn>
```

---

### 2. Modal Sign‑In / Sign‑Up buttons

```tsx
import { SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

<SignedOut>
  <SignInButton mode="modal">
    <Button>Sign in</Button>
  </SignInButton>

  <SignUpButton mode="modal">
    <Button variant="outline">Create account</Button>
  </SignUpButton>
</SignedOut>;
```

- Always set `mode="modal"`, which opens the auth flow in‑place instead of redirecting.
- Pass **any** element as a child to keep styling consistent—here we reuse our `<Button>` component.

---

### 3. User menu & sign‑out (signed‑in state)

```tsx
import {
  SignedIn,
  UserButton,
  SignSignOutBSignOutButtonuttonUpButton,
} from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

<SignedIn>
  <UserButton />
  <SignOutButton>
    <Button variant="ghost">Sign out</Button>
  </SignOutButton>
</SignedIn>;
```

- `<UserButton />` shows the avatar dropdown (profile, orgs, sign‑out).
- `<SignOutButton />` ends the session and can redirect via `redirectUrl`.

---

### 4. Organization aware apps

```tsx
import { SignedIn, OrganizationSwitcher } from "@clerk/clerk-react";

<SignedIn>
  <OrganizationSwitcher hidePersonal />
</SignedIn>;
```

Lets users create or switch workspaces without leaving the page.

## Clerk React Hooks Reference

#### `useUser()`

Access the current **User** object, including loading & sign‑in state and helpers to update or sign the user out. Return shape: `{ isLoaded, isSignedIn, user }`. Use it to gate UI or pull profile data.

```tsx
import { useUser } from "@clerk/clerk-react";

export const Greeting = () => {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return <Spinner />;
  if (!isSignedIn) return <p>Please sign in</p>;

  return <p>Hello {user.firstName}!</p>;
};
```
