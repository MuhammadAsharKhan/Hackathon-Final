# Architecture

The repository is a two-app monorepo: an Express API in `server/` and a React single-page app in `client/`. The root `package.json` only orchestrates install, dev and build. There is no shared code package; the client talks to the API over HTTP.

## File tree

```
.
├── .gitignore                     Ignores node_modules, .env files, build output and editor files
├── package.json                   Root scripts: install:all, dev, build, start
├── package-lock.json              Root lockfile (concurrently only)
├── README.md                      Setup, environment variables, scripts and deployment
├── theme.md                       Design tokens, typography, component and copy rules
├── knowledge.md                   Compact orientation for coding agents
├── docs/
│   ├── ARCHITECTURE.md            This document
│   └── VIVA.md                    Plain-language flow walkthrough and review questions
├── client/
│   ├── index.html                 Vite entry document, mounts #root
│   ├── package.json               Client dependencies and dev/build/preview scripts
│   ├── package-lock.json          Client lockfile
│   ├── vite.config.js             React plugin, @ alias, port 5173, /api proxy to :5000
│   ├── jsconfig.json              Editor path alias for @/*
│   ├── tailwind.config.js         Maps CSS variables to Tailwind color and font tokens
│   ├── postcss.config.js          Tailwind and autoprefixer plugins
│   ├── vercel.json                /api rewrite to Railway plus SPA fallback
│   ├── .env.example               VITE_API_URL=/api, VITE_GOOGLE_CLIENT_ID and VITE_FACEBOOK_APP_ID
│   └── src/
│       ├── main.jsx               React root, BrowserRouter, AuthProvider, Toaster
│       ├── App.jsx                Route table and toast styling
│       ├── index.css              Tailwind layers, CSS variable tokens, base styles, keyframes
│       ├── api/
│       │   ├── http.js            Axios instance, bearer interceptor, single-flight refresh, retry
│       │   ├── auth.api.js        register, login, Google, Facebook, forgot password, OTP, reset, refresh, logout, me
│       │   ├── users.api.js       updateProfile, changePassword, avatar upload and removal, uid lookup, listUsers
│       │   ├── items.api.js       listItems, getItem, createItem, updateItem, deleteItem
│       │   └── ai.api.js          chat, conversations and the admin key and settings calls
│       ├── config/
│       │   ├── google.js          Reads VITE_GOOGLE_CLIENT_ID
│       │   ├── facebook.js        Reads VITE_FACEBOOK_APP_ID and the Graph API version
│       │   └── features.js        aiPage and aiWidget flags
│       ├── lib/
│       │   ├── tokenStore.js      In-memory access token get/set/clear
│       │   ├── cn.js              clsx plus tailwind-merge class helper
│       │   ├── errors.js          getErrorMessage and getFieldErrors from API errors
│       │   ├── validation.js      Shared field validators, gender choices and password hint
│       │   ├── format.js          Date and short date formatting
│       │   ├── navigation.js      Full-path redirect helper for sign-in and register
│       │   ├── pendingVerification.js Session storage for the email awaiting a code
│       │   ├── scroll.js          Reduced-motion aware scroll helpers
│       │   └── ai.js              Starter prompts, provider labels, message length limit
│       ├── context/
│       │   └── AuthContext.jsx    User state, bootstrap refresh, login, register, logout, updateUser
│       ├── hooks/
│       │   ├── useAuth.js         Context reader with a guard against use outside the provider
│       │   ├── useDebounce.js     Debounced value hook used by the dashboard search
│       │   ├── useDocumentTitle.js Sets the document title per page
│       │   ├── useMountedRef.js   Guards async state updates after unmount
│       │   ├── useResendCountdown.js 60 second resend timer for both OTP screens
│       │   └── useChat.js         Chat state, sending, retry, conversations and widget storage
│       ├── components/
│       │   ├── ProtectedRoute.jsx Redirects signed-out users to /login and enforces roles
│       │   ├── GuestRoute.jsx     Redirects signed-in users away from /login and /register
│       │   ├── ui/
│       │   │   ├── Button.jsx     Variants primary, secondary, ghost, danger; sizes; loading state
│       │   │   ├── Input.jsx      Label, error, hint, aria wiring
│       │   │   ├── Textarea.jsx   Multiline equivalent of Input
│       │   │   ├── Select.jsx     Labeled native select with error and hint support
│       │   │   ├── Card.jsx       Bordered surface container
│       │   │   ├── Badge.jsx      Small status label with tone variants
│       │   │   ├── Modal.jsx      Dialog with Esc and backdrop close, scroll lock, focus handling
│       │   │   ├── ConfirmDialog.jsx Destructive confirmation built on Modal
│       │   │   ├── Spinner.jsx    Loading indicator
│       │   │   ├── EmptyState.jsx Icon, title, description and optional action
│       │   │   ├── ErrorState.jsx Error panel with retry
│       │   │   ├── Pagination.jsx Previous and next controls with page count
│       │   │   ├── PageHeader.jsx Title, description and action slot
│       │   │   ├── Avatar.jsx     Image or initials fallback
│       │   │   ├── Tabs.jsx       Keyboard accessible tab list with roving arrow keys
│       │   │   ├── OtpInput.jsx   Six digit code input, auto-advance, backspace and paste
│       │   │   ├── CopyButton.jsx Clipboard action with a copied state
│       │   │   ├── Divider.jsx    Plain "or" divider between sign-in options
│       │   │   ├── Field.jsx      Label, hint and error wrapper
│       │   │   ├── FormError.jsx  Form level error text
│       │   │   ├── Table.jsx      Shared table shell
│       │   │   ├── SectionHeading.jsx Section title with an optional action
│       │   │   └── Container.jsx  Page width wrapper
│       │   ├── auth/
│       │   │   ├── GoogleButton.jsx      Google credential button, only when VITE_GOOGLE_CLIENT_ID is set
│       │   │   ├── GoogleSection.jsx     Button plus the "or" divider
│       │   │   ├── FacebookButton.jsx    Facebook SDK button, only when VITE_FACEBOOK_APP_ID is set
│       │   │   ├── FacebookSection.jsx   Facebook button below the Google section
│       │   │   ├── EmailVerificationFlow.jsx Password reset email and code steps with onVerified
│       │   │   ├── ForgotPasswordModal.jsx Reset flow opened from the Login page
│       │   │   └── CompleteProfileModal.jsx Age request after sign-in when age is null
│       │   ├── items/
│       │   │   ├── ItemRow.jsx     One item row with edit and delete actions
│       │   │   └── ItemFormModal.jsx Create and edit form inside the shared Modal
│       │   ├── profile/
│       │   │   ├── AvatarUpload.jsx Preview, type and 2 MB checks before upload, remove action
│       │   │   ├── AccountPanel.jsx Name, age, gender, email and uid form
│       │   │   └── PasswordPanel.jsx Password form plus the email verification modal
│       │   ├── ai/
│       │   │   ├── ChatPanel.jsx       Shared panel, variant page or widget
│       │   │   ├── ConversationSidebar.jsx Conversations, new chat, delete with confirm
│       │   │   ├── MessageList.jsx     Empty state, starters, auto-scroll and error bubble
│       │   │   ├── MessageBubble.jsx   Markdown, copy button and provider caption
│       │   │   ├── MessageInput.jsx    Auto-grow textarea, Enter to send and character counter
│       │   │   ├── TypingIndicator.jsx Three animated dots
│       │   │   ├── CodeBlock.jsx       Language label and copy button
│       │   │   ├── Markdown.jsx        react-markdown plus remark-gfm, no raw HTML
│       │   │   ├── AiChatWidget.jsx    Floating button and compact panel
│       │   │   ├── KeyFormModal.jsx    Add or replace an admin key
│       │   │   ├── KeyStatusBadge.jsx  Active, cooling, invalid and disabled chips
│       │   │   ├── AdminKeysTable.jsx  Provider key table and its actions
│       │   │   └── AiSettingsForm.jsx  Provider, model and prompt settings
│       │   └── layout/
│       │       ├── AppLayout.jsx  Navbar, main container and footer with an Outlet
│       │       ├── AuthLayout.jsx Centered card shell for the auth pages
│       │       ├── Navbar.jsx     Brand, links, user menu, mobile menu
│       │       ├── ScrollManager.jsx Instant top on route change, smooth hash targets
│       │       └── Footer.jsx     Single-line footer
│       └── pages/
│           ├── Home.jsx           Public landing page with signed-in and signed-out actions
│           ├── Login.jsx          Email and password, Google and Facebook when configured, forgot password
│           ├── Register.jsx       Name, email, age, gender and password; Google and Facebook when configured
│           ├── VerifyEmail.jsx    Six digit code, resend countdown and the pending email
│           ├── Dashboard.jsx      Reference CRUD page built from ItemRow, ItemFormModal and Pagination
│           ├── Profile.jsx        Account and Passwords tabs, avatar upload, uid copy
│           ├── FindUser.jsx       Nine digit uid lookup with result and not-found states
│           ├── AiBuddy.jsx        Full page chat with the conversation sidebar
│           ├── AdminAi.jsx        Keys table, key actions and AI settings, admin only
│           ├── AdminUsers.jsx     Paginated user table, admin only
│           └── NotFound.jsx       404 page with a link home
└── server/
    ├── package.json               Server dependencies and dev/start/seed scripts
    ├── package-lock.json          Server lockfile
    ├── .env.example               Environment template
    └── src/
        ├── index.js               Process entry: connect, backfill uids and verification, seed AI, listen, keep-alive, shutdown
        ├── app.js                 Express app: security middleware, routes, 404 and error handler
        ├── config/
        │   ├── env.js             Dotenv loading and Zod validation of every environment variable
        │   ├── db.js              Mongoose connect and disconnect helpers
        │   ├── cloudinary.js      Cloudinary client, configured only when all three credentials exist
        │   └── aiDefaults.js      Default AI models, base URLs, grok vendor detection, base URL guard
        ├── routes/
        │   ├── index.js           Mounts /auth, /users, /items and the AI router
        │   ├── auth.routes.js     register, login, google, facebook, forgot-password, verify-otp, reset-password, refresh, logout, me
        │   ├── user.routes.js     profile, password, avatar, uid lookup, admin user list
        │   ├── item.routes.js     item CRUD plus the owner-scoped uid lookup
        │   ├── ai.routes.js       AI chat, conversations and the admin key and settings routes
        │   └── health.routes.js   GET /api/health, mounted outside the global rate limiter
        ├── controllers/
        │   ├── auth.controller.js Registration, email verification, login, Google and Facebook sign-in, password reset, refresh rotation, logout, current user
        │   ├── user.controller.js Profile update, password change, avatars, uid lookup, admin user listing
        │   ├── item.controller.js Owner-scoped item CRUD and uid lookup
        │   ├── ai.controller.js   Chat and conversation handlers
        │   ├── aiAdmin.controller.js Key and settings handlers
        │   └── health.controller.js Status, uptime, timestamp and database state
        ├── middleware/
        │   ├── auth.js            protect verifies the access token; restrictTo enforces roles
        │   ├── validate.js        Runs a Zod schema against body, query or params
        │   ├── rateLimit.js       Global, auth, otp, uid and AI chat limiters
        │   ├── upload.js          Multer memory upload, 2 MB, JPEG, PNG and WebP only
        │   ├── error.js           Maps errors to JSON responses, hides stacks in production
        │   └── notFound.js        Converts unmatched routes into a 404 ApiError
        ├── models/
        │   ├── User.js            uid, name, email, optional password, age, gender, avatar, googleId, facebookId, sessions
        │   ├── Item.js            uid, title, description, status, owner reference
        │   ├── Conversation.js    uid, owner, title and message history for AI chats
        │   ├── PasswordOtp.js     Reset and verification codes per email and purpose, with a TTL index
        │   ├── AiKey.js           Encrypted provider keys with status, cooldown and usage counters
        │   └── AiSettings.js      Single settings document: default provider, models, base URLs, prompt
        ├── services/
        │   ├── aiProviders.js     Gemini and OpenAI-compatible calls, one provider error type
        │   ├── aiKeyPool.js       Atomic key claiming, rotation, cooldown and invalid marking
        │   └── aiSetup.js         Seeds keys and settings from the environment, loads settings
        ├── validators/
        │   ├── auth.validators.js Register, login, Google, Facebook, forgot, verify and reset schemas
        │   ├── user.validators.js Profile, password, uid and user list query schemas
        │   ├── item.validators.js Item create, update, id, uid and list query schemas
        │   └── ai.validators.js   Chat, conversation, key and settings schemas
        ├── utils/
        │   ├── ApiError.js        Error class carrying a status code and optional field errors
        │   ├── asyncHandler.js    Wraps async controllers so rejections reach the error handler
        │   ├── tokens.js          Access and refresh signing, hashing, cookie options, session cap
        │   ├── uid.js             Nine digit uid generator, checks uniqueness before returning
        │   ├── ensureUids.js      Startup backfill of missing uids on users and items
        │   ├── ensureEmailVerification.js Startup backfill of emailVerified plus the OTP index migration
        │   ├── crypto.js          AES-256-GCM encryption and masking for stored provider keys
        │   ├── otp.js             Code hashing, timing-safe compare and reset token signing
        │   ├── password.js        Password reuse check and session-clearing save
        │   ├── mailer.js          Resend delivery through fetch, development console fallback
        │   └── keepAlive.js       Production self-ping of /api/health
        └── scripts/
            └── seed.js            Creates or promotes the admin user, then exits
```

## Request flow

1. The browser calls `/api/...`.
2. In development, Vite proxies `/api` to `http://localhost:5000`. In production on Vercel, the rewrite in `client/vercel.json` forwards `/api/:path*` to Railway.
3. Express trusts `TRUST_PROXY_HOPS` proxies (`1` by default, `2` behind a Vercel rewrite), then runs `helmet`, `compression`, CORS, the JSON body parser with a 10 KB limit, and `cookie-parser`.
4. Health routes are mounted first, then the global rate limiter, then the API router.
5. Inside a router: `protect` verifies the bearer token and loads the user, `restrictTo` checks the role, `validate` parses the body, query or params with Zod.
6. The controller queries Mongoose and returns `{ success: true, data, message? }`.
7. Unknown routes become a 404 `ApiError`. `errorHandler` maps every error to `{ success: false, message, errors? }` and only includes `stack` outside production.

The client wraps all of this in `client/src/api/http.js`, which attaches the access token, unwraps `response.data.data`, and retries a request once after a silent refresh. The refresh promise is module level, so the auth bootstrap and concurrent 401 responses share one rotation. The server also accepts the immediately previous refresh token for ten seconds, which covers two tabs loading at the same time.

## Scrolling and motion

`client/src/index.css` sets `scroll-behavior: smooth`, `scroll-padding-top: 5rem` for the sticky header, and `scrollbar-gutter: stable` so opening a modal does not move the page. The `prefers-reduced-motion: reduce` block sets `scroll-behavior: auto` and collapses animations.

`components/layout/ScrollManager.jsx` runs once inside the router. A pathname change without a hash calls `window.scrollTo` with `behavior: "instant"`. A hash change waits one frame, then calls `scrollIntoView` with smooth behavior, or `auto` when reduced motion is requested. It also listens for native `hashchange` events, so links that bypass the router still work.

Pages keep composition local: search and status changes reset to page one, pagination scrolls the list into view, and a delete of the only row on a page above one moves to the previous page.

## Auth flow

1. Register creates the account, sends a verification code and returns no session. Verifying the code, and later logins, use the same session: a 15-minute access JWT signed with `JWT_ACCESS_SECRET`, and a 7-day refresh JWT signed with `JWT_REFRESH_SECRET`.
2. The access token is returned in the response body and kept in memory by `client/src/lib/tokenStore.js`. Nothing is written to `localStorage` or `sessionStorage`.
3. The refresh token is set as an httpOnly cookie named `rt` with `path=/api/auth`, `sameSite` from `COOKIE_SAMESITE`, and `secure` in production. Its SHA-256 hash is stored on the user document. At most five sessions are kept; the oldest is dropped.
4. On mount, `AuthContext` calls `POST /api/auth/refresh`. The browser sends the cookie, the server rotates it (the old hash is removed, a new one is stored) and returns a fresh access token plus the user. This is the silent restore after a reload.
5. When any request returns 401, the response interceptor calls refresh once. Concurrent 401s share one promise, so only one rotation happens. The original request is retried once with the new token.
6. If refresh fails, the token is cleared and a window event `auth:logout` resets context state; route guards then send the user to `/login`.
7. If a refresh token that is no longer stored is presented, the server treats it as reuse, clears every session for that user and returns 401.
8. Logout removes the presented session hash and clears the cookie. The access token stays valid until it expires; the client discards it immediately.
9. Changing the password clears all sessions, creates a new one and returns a new access token, which the profile page stores.

## Email verification

New password accounts start with `emailVerified: false`. `EMAIL_VERIFICATION_REQUIRED` defaults to `true`; setting it to `false` verifies the account during register and returns the session as before, which is the fallback when email delivery is not ready.

1. `POST /api/auth/register` validates the body, creates the user and sends a code. It answers 201 with `{ email, verificationRequired: true }` and no tokens or cookie. A verified email is 409. An unverified email updates the name, age, gender and password, then sends a fresh code so an abandoned sign-up does not lock the address.
2. The code reuses `PasswordOtp` with `purpose: "email-verification"` and the same rules as a reset code: six digits from `crypto.randomInt`, HMAC-SHA256, ten minute life, five wrong tries, a 60 second gap and five sends per hour. The unique index is `{ email, purpose }`, so a reset code and a verification code can coexist.
3. `POST /api/auth/verify-email` accepts `{ email, otp }`, marks the user verified, deletes the code and responds like login with the user, access token and refresh cookie.
4. `POST /api/auth/resend-verification` always answers 200 with a generic message and sends only for an unverified account within the limits.
5. Login checks the password first. A correct password on an unverified account sends a fresh code and answers 403 with `code: "EMAIL_NOT_VERIFIED"`. A wrong password stays 401 with the usual message.
6. `protect` and refresh reject an unverified user with 401. Completing a password reset marks the account verified because it proves control of the mailbox.
7. Google accounts are verified. Linking Google to an unverified password account clears the password hash, `hasPassword` and every refresh token, so a password created before verification cannot survive.
8. A startup task in `utils/ensureEmailVerification.js` marks accounts that predate the field as verified. It also adds the purpose to old OTP records and drops the old unique index on `userId`.
9. The client stores only the pending email, in `sessionStorage`, and `/verify-email` exchanges the code for the session. Login with `EMAIL_NOT_VERIFIED` goes to the same page with a notice.

## API contract

All responses are JSON. Success bodies have `success: true` and a `data` object. Errors have `success: false`, a `message`, and optionally `errors: [{ field, message }]`.

| Method | Path | Auth | Input | `data` |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Public | none | `{ status, uptime, timestamp, db }` |
| POST | `/api/auth/register` | Public | `{ name, email, password, age, gender? }` | `{ email, verificationRequired: true }` (201), or `{ user, accessToken }` when verification is off |
| POST | `/api/auth/verify-email` | Public, otp limiter | `{ email, otp }` | `{ user, accessToken }` |
| POST | `/api/auth/resend-verification` | Public, otp limiter | `{ email }` | `{ requested: true }` |
| POST | `/api/auth/login` | Public | `{ email, password }` | `{ user, accessToken }`; 403 with `code: "EMAIL_NOT_VERIFIED"` before verification |
| POST | `/api/auth/google` | Public | `{ credential }` | `{ user, accessToken }` |
| POST | `/api/auth/facebook` | Public, auth limiter | `{ accessToken }` | `{ user, accessToken }`; 400 without a shared email, 409 when the email is taken, 503 without app credentials |
| POST | `/api/auth/forgot-password` | Public, otp limiter | `{ email }` | `{ requested: true }` |
| POST | `/api/auth/verify-otp` | Public, otp limiter | `{ email, otp }` | `{ resetToken }` |
| POST | `/api/auth/reset-password` | Public, otp limiter | `{ resetToken, newPassword }` | `{}` |
| POST | `/api/auth/refresh` | Refresh cookie | none | `{ user, accessToken }` |
| POST | `/api/auth/logout` | Refresh cookie optional | none | `{ loggedOut: true }` |
| GET | `/api/auth/me` | Bearer | none | `{ user }` |
| PATCH | `/api/users/me` | Bearer | any of `name`, `age`, `gender` | `{ user }` |
| PATCH | `/api/users/me/password` | Bearer | `{ currentPassword, newPassword }` or `{ resetToken, newPassword }` | `{ user, accessToken }` |
| PUT | `/api/users/me/avatar` | Bearer | multipart field `avatar` | `{ user }` |
| DELETE | `/api/users/me/avatar` | Bearer | none | `{ user }` |
| GET | `/api/users/uid/:uid` | Bearer, uid limiter | none | `{ user: { uid, name, avatarUrl, createdAt } }` |
| GET | `/api/users` | Bearer, admin | `page`, `limit` (max 100) | `{ users, pagination }` |
| GET | `/api/items` | Bearer | `page`, `limit` (max 50), `search`, `status` | `{ items, pagination }` |
| POST | `/api/items` | Bearer | `{ title, description?, status? }` | `{ item }` (201) |
| GET | `/api/items/uid/:uid` | Bearer, owner | none | `{ item }` |
| GET | `/api/items/:id` | Bearer, owner | none | `{ item }` |
| PATCH | `/api/items/:id` | Bearer, owner | any of `title`, `description`, `status` | `{ item }` |
| DELETE | `/api/items/:id` | Bearer, owner | none | `{ id }` |
| POST | `/api/ai/chat` | Bearer, chat limiter | `{ conversationUid?, message }` | `{ conversation, reply, provider, model }` |
| GET | `/api/ai/conversations` | Bearer | none | `{ conversations }` |
| GET | `/api/ai/conversations/:uid` | Bearer, owner | none | `{ conversation }` |
| DELETE | `/api/ai/conversations/:uid` | Bearer, owner | none | `{ uid }` |
| GET | `/api/admin/ai/keys` | Bearer, admin | none | `{ keys }` |
| POST | `/api/admin/ai/keys` | Bearer, admin | `{ provider, label, apiKey }` | `{ key }` (201) |
| PATCH | `/api/admin/ai/keys/:id` | Bearer, admin | any of `label`, `apiKey`, `enabled` | `{ key }` |
| DELETE | `/api/admin/ai/keys/:id` | Bearer, admin | none | `{ id }` |
| POST | `/api/admin/ai/keys/:id/test` | Bearer, admin | none | `{ ok, reply?, error? }` |
| GET | `/api/admin/ai/settings` | Bearer, admin | none | `{ settings }` |
| PUT | `/api/admin/ai/settings` | Bearer, admin | any settings field | `{ settings }` |

Shared shapes:

- `user`: `{ id, uid, name, email, age, gender, avatarUrl, hasPassword, emailVerified, role, createdAt, updatedAt }`. `role` is `user` or `admin`. `age` and `gender` are `null` when not set.
- `item`: `{ id, uid, owner, title, description, status, createdAt, updatedAt }`. `status` is `todo`, `in_progress` or `done`.
- `conversation`: `{ id, uid, owner, title, messages, createdAt, updatedAt }`.
- `pagination`: `{ page, limit, total, pages }`.

Status codes: 400 validation or malformed id, 401 missing, invalid or unverified credentials, 403 wrong role, disallowed origin or unverified login, 404 missing resource, 409 duplicate email, 413 body over 10 KB or image over 2 MB, 422 the model could not answer the request, 429 rate limited, 500 unexpected, 503 feature not configured or every AI key busy.

Errors can also carry a stable `code`. Login uses `EMAIL_NOT_VERIFIED` so the client can redirect without matching message text.

## Unique ids

Every user, item and conversation carries a `uid`: nine digits, unique index, immutable. `utils/uid.js` draws it from `crypto.randomInt` and checks the model for a collision before returning. Models assign it in a `pre("validate")` hook, so every insert gets one. On startup `ensureUids()` backfills documents created before uids existed and logs only the count.

Public lookups use the uid: `GET /api/users/uid/:uid` returns `uid`, `name`, `avatarUrl` and `createdAt` only, and `GET /api/items/uid/:uid` is scoped to the owner.

## Google sign-in

`POST /api/auth/google` verifies the Google ID token against `GOOGLE_CLIENT_ID` with `google-auth-library`, requires a verified email, then finds the user by `googleId`, links `googleId` to an existing account with the same email, or creates a verified account without a password (`hasPassword: false`, `age: null`). Linking to an unverified password account first clears its password hash and refresh tokens, because Google has now proved who owns the address. The response is the same as login: a user, an access token and the refresh cookie. Without `GOOGLE_CLIENT_ID` the route answers 503.

The client shows `GoogleButton` and the `or` divider only when `VITE_GOOGLE_CLIENT_ID` is set. A Google account arrives with `age: null`, so `CompleteProfileModal` asks for age on the next screen; it cannot be dismissed except by signing out and it saves through `PATCH /api/users/me`.

## Facebook sign-in

`POST /api/auth/facebook` accepts `{ accessToken }` from the Facebook JavaScript SDK and calls `GET https://graph.facebook.com/debug_token` with `input_token` and the `APP_ID|APP_SECRET` app token. The token must report `is_valid` and an `app_id` equal to `FACEBOOK_APP_ID`; anything else is 401. The profile then comes from `/me?fields=id,name,email` with the token in the `Authorization` header.

The user is found by `facebookId`. Without a match, a missing email answers 400 because the account would be unusable, and an email that already belongs to an account answers 409 instead of linking, so a Facebook login never takes over a password account. Otherwise the user is created with no password, `hasPassword: false`, `emailVerified: true`, and `age` and `gender` null. The response is the same as login: a user, an access token and the refresh cookie. Without both app credentials the route answers 503.

`FacebookButton` loads `https://connect.facebook.net/en_US/sdk.js` once per page, calls `FB.init` with `VITE_FACEBOOK_APP_ID` and Graph API v26.0, then `FB.login` with the `public_profile,email` scope. A closed or cancelled dialog shows nothing. `FacebookSection` places the button under the Google section and adds the `or` divider when Google is not configured. The whole section is hidden when `VITE_FACEBOOK_APP_ID` is empty. New accounts have `age: null`, so the same `CompleteProfileModal` asks for the age.

## Avatars

`PUT /api/users/me/avatar` accepts one multipart field named `avatar`, limited to 2 MB and JPEG, PNG or WebP. Multer keeps it in memory and `config/cloudinary.js` uploads it to `hackathon/avatars` as `user_<uid>`, overwriting, cropped to 400x400 with face gravity. The user stores `avatarUrl` and `avatarPublicId`. `DELETE` removes the asset and clears both fields. Without Cloudinary credentials both routes answer 503.

## Password reset

The reset flow uses a six digit code and a short lived token.

1. `POST /api/auth/forgot-password` always returns the same message. It creates a code only when the account exists, at most once per 60 seconds and at most five times per window.
2. The code is stored as an HMAC-SHA256 hash keyed by `JWT_RESET_SECRET` and expires after 10 minutes. Resend delivers it; without `RESEND_API_KEY` in development the server prints it to the console.
3. `POST /api/auth/verify-otp` compares the code with `crypto.timingSafeEqual`, counts attempts, deletes the record after five wrong tries and returns a 10 minute `resetToken` whose `jti` is stored on the record.
4. `POST /api/auth/reset-password` checks the token purpose and `jti`, sets the password, marks the account verified, clears every session and deletes the record.
5. `PATCH /api/users/me/password` accepts either the current password or a reset token that belongs to the signed-in user, so a Google-only account can set a first password. Both paths reject a new password equal to the existing one.

On the client, `EmailVerificationFlow` handles the email and code steps with a 60 second resend countdown and the same message whether or not the account exists. `ForgotPasswordModal` continues with the new password and calls `POST /api/auth/reset-password`. On the Profile page the same flow runs inside a modal with the email locked; after verification the current password field is disabled with "Verified via email" and the form sends `{ resetToken, newPassword }` instead.

## AI Buddy

All AI code sits in `ai*` files and is mounted by one line in `routes/index.js`.

- `AiSettings` is a single document: default provider, model and base URL per provider, and the system prompt. `aiSetup.js` creates it, and on every boot adds the environment keys whose plaintext the database does not already hold. A key stored under an older `AI_KEY_SECRET` cannot be decrypted, so it is treated as absent and replaced. Removing a key from the environment does not delete the stored copy.
- Keys are encrypted with AES-256-GCM using `AI_KEY_SECRET` and stored in `encryptedKey`. The API only ever returns a masked value with the last four characters.
- `aiKeyPool.js` claims keys atomically with `findOneAndUpdate` and `sort: { lastUsedAt: 1 }`, so least recently used first and parallel requests spread. It marks `lastUsedAt` and increments `usageCount` before the call. Base URLs must be https in production, must not carry credentials, and may not point at private or loopback hosts there.
- 429, 5xx, timeouts and network errors set `cooldownUntil` from `Retry-After` or `AI_COOLDOWN_SECONDS`. 401, 403 and `API key not valid` mark the key `invalid`. Other 4xx answers 422 and records `lastError` without trying another key. At most six keys are tried; when all fail the route answers 503 with the busy message and `code` `ai_keys_failed`, or `ai_no_active_keys` when no key was available to try. Provider bodies and keys never reach the response.
- Each attempt has a 12 second timeout and the whole rotation stops at a 28 second deadline, so a proxy never sees a chat request pass 30 seconds. A 200 answer that is HTML, invalid JSON or cut off mid body becomes a clean provider error instead of a 500.
- An empty model reply becomes the assistant message `I cannot help with that request.`
- `POST /api/ai/chat` sends the system prompt plus the last 20 messages and titles a new conversation with the first 40 characters of the first message. Each exchange is appended with one atomic `$push` that keeps only the newest 200 messages, which stays under the 16 MB document limit.

### Remove AI Buddy

1. Delete `routes/ai.routes.js`, `controllers/ai.controller.js`, `controllers/aiAdmin.controller.js`, `validators/ai.validators.js`.
2. Delete `models/AiKey.js`, `models/AiSettings.js`, `models/Conversation.js`, `services/aiProviders.js`, `services/aiKeyPool.js`, `services/aiSetup.js`, `config/aiDefaults.js`, `utils/crypto.js`.
3. Delete the `router.use(aiRoutes)` line and its import in `routes/index.js`, and the `setupAi()` call in `index.js`.
4. Delete the AI variables from `.env.example` and the schemas in `config/env.js`. Nothing else references the AI code.
5. On the client, follow [Remove AI Buddy on the client](#remove-ai-buddy-on-the-client).

## Client AI Buddy

`client/src/config/features.js` is the switchboard:

```js
features = { aiPage: true, aiWidget: false }
```

- `aiPage` adds the `/ai-buddy` route and its nav link, and keeps the admin page at `/admin/ai` in use.
- `aiWidget` mounts `AiChatWidget` in `AppLayout`: a floating button that opens `ChatPanel variant="widget"`, full screen under `sm` and a 26rem panel above it. The widget keeps one conversation uid in `sessionStorage` so it survives a reload.
- Both variants use `hooks/useChat.js` for state and `api/ai.api.js` for calls, so a change to one applies to both.
- `MessageBubble` renders assistant text with `react-markdown` and `remark-gfm` but no raw HTML. Fenced code blocks become `CodeBlock` with a language label and a copy button.
- Sending appends the user message, disables input while the request runs and keeps a failed message for `Retry`. The list only scrolls when the reader is near the bottom.
- `AdminAi.jsx` shows the masked keys table, the add, replace, enable, disable, test and delete actions, and the settings form for provider, models, base URLs and the system prompt.

### Remove AI Buddy on the client

1. Set `aiPage: false` and `aiWidget: false` in `config/features.js`. That hides the page, the nav link and the widget without deleting code.
2. To delete it entirely, remove `components/ai/`, `pages/AiBuddy.jsx`, `pages/AdminAi.jsx`, `api/ai.api.js`, `hooks/useChat.js`, `lib/ai.js` and `config/features.js`.
3. Remove the `/ai-buddy` and `/admin/ai` routes from `App.jsx`, the two nav links from `Navbar.jsx`, and the `AiChatWidget` mount from `AppLayout.jsx`. The server removal steps above then leave no AI code behind.

### Turn AI Buddy into a site-wide chatbot

1. Set `aiWidget: true` and, when the full page should go away, `aiPage: false`.
2. Adjust the system prompt in `/admin/ai` so every page sees the same voice and limits.
3. The widget's conversation uid lives in `sessionStorage`; clearing site data starts a fresh chat. Nothing else changes.

## Adding a module

### Backend

1. Create `server/src/models/Thing.js`. Include an `owner` reference when records belong to a user, a `uid` field with the same `pre("validate")` hook as `Item.js`, and a `toJSON` transform that exposes `id` and removes `_id` and `__v`.
2. Create `server/src/validators/thing.validators.js` with a create schema, an update schema (at least one field required), an id schema (`24` hex characters) and a list query schema (`page`, `limit`, filters).
3. Create `server/src/controllers/thing.controller.js`. Wrap handlers with `asyncHandler`, scope every query by `owner: req.user.id`, throw `ApiError` for missing records, and return `{ success: true, data }`.
4. Create `server/src/routes/thing.routes.js`. Apply `router.use(protect)`, then chain `validate` before each controller. Add `restrictTo("admin")` to admin-only routes.
5. Register it in `server/src/routes/index.js` with `router.use("/things", thingRoutes)`. Nothing else in `app.js` changes.

### Frontend

1. Create `client/src/api/things.api.js`. Call `http` and unwrap `response.data.data`, following `items.api.js`.
2. Create `client/src/pages/Things.jsx` by copying `Dashboard.jsx` and its `items/ItemRow` and `items/ItemFormModal` components: `PageHeader`, debounced search, filters, list, modal form, confirm dialog, pagination, loading, empty and error states, toasts.
3. Add the route in `client/src/App.jsx` inside the `AppLayout` route, wrapped in `ProtectedRoute` (add `roles={["admin"]}` when needed).
4. Add a nav link in `client/src/components/layout/Navbar.jsx`, visible to signed-in users and to admins only when the page is admin-only.
5. Use `getErrorMessage` and `getFieldErrors` from `client/src/lib/errors.js` for failures, and `toast.success` for confirmations.

## Conventions

- Server code is ESM with explicit `.js` extensions in imports.
- Validation always happens in a validator, never inside a controller.
- Controllers never touch `req.body` without prior validation and never trust a client-supplied owner id.
- Client data access goes through `client/src/api/*`, never directly through axios in a page.
- The access token is only ever held by `tokenStore`.
- Every interactive element has a visible focus state; motion respects `prefers-reduced-motion`.
- Pages compose components from `components/ui`; no raw controls or dialog markup belongs in a page. Follow the component inventory in `theme.md`.
- Copy follows the rules in `theme.md` and `knowledge.md`. Short, literal text only; no banned marketing words, exclamation marks, rhetorical questions or em dashes.
