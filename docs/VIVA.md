# Viva guide

How the main flows work, which files and functions run them, and short answers to the questions a reviewer is likely to ask. Every path is relative to the repository root.

## 1. Register and email verification

Registering starts in `client/src/pages/Register.jsx`, which collects a name, email, age and password and calls `register` in `client/src/context/AuthContext.jsx`, which posts to `/api/auth/register`. The route in `server/src/routes/auth.routes.js` applies `authLimiter` and `validate(registerSchema)` before the `register` controller in `server/src/controllers/auth.controller.js` runs. The validator in `server/src/validators/auth.validators.js` trims and lowercases the email and rejects weak passwords, and every later lookup does the same, so `A@x.com ` and `a@x.com` are one account. If the email already belongs to a verified account the controller answers 409; if an earlier sign-up never verified, it refreshes the name, age and gender on that record and sends a fresh code instead of locking the address, but the stored password is kept. `sendOtpCode` creates a six digit code, stores only its hash in a `PasswordOtp` document with a ten minute expiry, a sixty second resend gap and five sends per hour, then mails it through `sendEmail`; when no Resend key is configured in development, the code is printed in the server log instead. The browser keeps the pending address with `client/src/lib/pendingVerification.js` and moves to `client/src/pages/VerifyEmail.jsx`, which submits the code to `verifyEmail`. That controller compares the code with `otpCodeMatches`, sets `emailVerified`, deletes the OTP record and starts a session with `createSession` and `setRefreshCookie`.

Questions a reviewer may ask:

- Why does an unverified duplicate register not return 409? The account is not usable yet, and treating an abandoned sign-up as an error would let anyone block an address they do not own. The details are refreshed and a new code is sent, but the password is kept: someone who cannot read that mailbox must not be able to replace the credentials of the account they are aiming at.
- Why store only the hash of the code? A database dump should not hand someone a working code. The code is short lived and the comparison is constant time.
- Why a code instead of a link? The same six box screen works on every device, is quick to retype, and does not depend on a deep link reaching the right browser.
- Why not sign the user in before verification? The session is issued only after `emailVerified` is true, so a mistyped address cannot hold an account.

## 2. Login and refresh tokens

`client/src/pages/Login.jsx` calls `login` in `client/src/context/AuthContext.jsx`, which posts to `/api/auth/login`. The `login` controller finds the user, compares the password with `bcrypt.compare`, and compares against a dummy hash when the email is unknown so both failures take similar time and return the same 401 message. A correct password on an unverified account answers 403 with code `EMAIL_NOT_VERIFIED` and sends a new code; a wrong password never reveals verification state. `createSession` in `server/src/utils/tokens.js` signs a short lived access JWT and a refresh JWT with a random `jti`, stores a SHA-256 hash of the refresh token in the user document, keeps the five newest sessions, and `setRefreshCookie` writes the token as an httpOnly cookie scoped to `/api/auth`. The client keeps only the access token, in memory in `client/src/lib/tokenStore.js`; `client/src/api/http.js` adds it as a bearer header and, on a 401, calls `refreshSession` once for all waiting requests and retries the original call once. `refreshSession` in the controller verifies the cookie, loads the user, rejects deleted or unverified accounts, rotates the stored hash and issues a new pair. A rotated token stays acceptable for ten seconds so two tabs refreshing together do not sign each other out; reuse after that window revokes every session and clears the cookie. `logout` removes the stored hash and clears the same cookie. On a page load the client only asks for a refresh when `hasSessionHint` from `client/src/lib/tokenStore.js` is true, a flag written on login and cleared on logout or on a failed refresh, because the httpOnly cookie cannot be read by the page and a guest would otherwise get a 401 on every visit.

Questions a reviewer may ask:

- Why an httpOnly cookie for the refresh token? JavaScript cannot read it, so a cross-site scripting bug cannot steal it, and the browser sends it automatically with `sameSite` protection.
- Why hash the refresh token in the database? A leaked database then contains no usable token. The server compares hashes, so a stolen row cannot be replayed as a cookie.
- Why rotate the refresh token? A new token per refresh means an old copy stops working, which is what makes reuse detection possible.
- Why not call refresh on every page load? The refresh cookie is httpOnly, so the page cannot see it. Asking anyway returns 401 for every visitor and logs an error in the console, so a small local flag says when a session is worth restoring.
- Why rate limit login? Passwords can be guessed; `authLimiter` in `server/src/middleware/rateLimit.js` allows 20 failed attempts per 15 minutes per IP and does not count successful ones.
- Why 15 minute access tokens and 7 day refresh tokens? Short access tokens limit the damage of a leaked one, and the refresh cookie saves the user from signing in every quarter of an hour.

## 3. Protected routes

`server/src/middleware/auth.js` exports `protect`, which reads the Authorization bearer token, verifies it with the access secret, loads the user from MongoDB and rejects deleted or unverified accounts, then puts a small user object on `req.user`. Routes apply it per router, for example `server/src/routes/user.routes.js`, and admin routes add `restrictTo("admin")` so the role check happens on the server. On the client, `client/src/components/ProtectedRoute.jsx` waits for `AuthContext` loading to finish, sends signed out visitors to `/login` with the requested location in state, and sends non-admins to `/dashboard`. `client/src/components/GuestRoute.jsx` does the opposite for login, register and verify, and `client/src/lib/navigation.js` rebuilds the full path, query and hash a deep link asked for. When an API call fails with 401, `client/src/api/http.js` refreshes and retries once, and a failed refresh dispatches `auth:logout` so the context clears the user without a redirect loop.

Questions a reviewer may ask:

- Why load the user on every request? A token can outlive an account. Loading the document catches deleted users and users who have not verified their email, and it gives the controller fresh profile data.
- Why guard on both client and server? The client guard is only for a clean screen transition. The server guard is the one that actually protects data.
- Why Express and Mongoose? Express keeps the request pipeline small and explicit with middleware, and Mongoose gives schemas, indexes, validation and hooks such as the uid assignment and password hashing in one place. Both are JavaScript, so one language covers the whole project.
- Why is the role not trusted from the token? The token payload is only a hint. Authorization uses `req.user.role` loaded from the database, so a role change takes effect immediately.

## 4. OTP password reset

The modal in `client/src/components/auth/ForgotPasswordModal.jsx` posts the email to `/api/auth/forgot-password`, which sits behind `otpLimiter`. `forgotPassword` in `auth.controller.js` looks the user up, calls `sendOtpCode` with the `password-reset` purpose, and always answers with the same generic sentence so it cannot be used to discover accounts. The code is stored hashed in a `PasswordOtp` document together with `attempts`, `sendCount`, `windowStart` and a ten minute `expiresAt`. `verifyOtp` checks the record and expiry, compares with `otpCodeMatches`, and on a wrong code increments `attempts` atomically with `$inc`, deleting the record at five failures so parallel guesses cannot pass the limit. A correct code clears the code hash, issues a short lived reset JWT with `signResetToken`, stores its `jti` on the record and returns the token, which makes the exchange single use. `resetPassword` verifies the token and the stored `jti`, refuses a password equal to the old one, saves the new hash through `saveNewPassword` and clears every refresh token so other sessions end. The same `EmailVerificationFlow` is reused from the profile password panel to prove the mailbox before an account without a password sets one.

Questions a reviewer may ask:

- Why not send a reset link? A six digit code is shorter to use, works on a phone that opened the mail, and avoids a second token in a URL that could leak through referrers.
- Why delete the record after five wrong codes? It stops slow guessing and forces a fresh code, which the user can request after the sixty second gap.
- Why is the reset token single use? The token only works while its `jti` matches the stored record, and `resetPassword` deletes that record on success.
- Why do other sessions die after a reset? Someone resetting a password may be recovering a compromised account, so every old refresh token is cleared.

## 5. Google sign-in

`client/src/components/auth/GoogleButton.jsx` renders the Google widget only when `VITE_GOOGLE_CLIENT_ID` exists and passes the returned credential to `loginWithGoogle` in `AuthContext`. The route `/api/auth/google` is rate limited and validated, then `googleSignIn` in `auth.controller.js` answers 503 when `GOOGLE_CLIENT_ID` is missing on the server. `verifyGoogleCredential` uses `google-auth-library` to check the ID token signature, expiry and audience against that client id, and the controller refuses a payload whose `email_verified` is not true. `findOrCreateGoogleUser` looks for a user by `googleId` first and by email second, so a second sign-in finds the same account instead of making a duplicate. A new Google user gets `emailVerified: true`, `hasPassword: false` and the Google picture as avatar; an existing unverified account is marked verified and its password is removed, because Google has just proved who owns the mailbox. The session is created with the same `createSession` and `setRefreshCookie` path as a password login, and the client navigates to the deep link it was trying to open.

Questions a reviewer may ask:

- Why verify the credential on the server? The browser can send anything. Only the server can check the signature and audience with the client id it trusts.
- Why check the audience? It proves the token was issued for this application and not for another site using the same Google project.
- Why remove the password of an unverified account? That password was set by someone who never proved they own the mailbox. Google has now proved it, so the old secret is discarded and the real owner signs in safely.
- Why does a Google-only account have no password? `hasPassword` stays false, and the profile page asks for email verification before the user sets a first password.

## 6. uid generation

Every new user gets a uid in the pre-validate hook of `server/src/models/User.js`, which calls `createUid` from `server/src/utils/uid.js`. `createUid` asks `crypto.randomInt` for a number between 100000000 and 999999999, so the result is always nine digits and never starts with zero, then checks `model.exists` before returning it. It tries ten times and throws if it cannot find a free number, which in practice would mean the space is exhausted. The field is unique and immutable at the schema level, so the database index is the last guard even if two requests race past the existence check. `ensureUids` in `server/src/utils/ensureUids.js` backfills accounts created before uids existed and is safe to run on every boot. `findUserByUid` returns only `uid`, `name`, `avatarUrl` and `createdAt`, so a lookup never exposes an email, age or gender, and the route is limited to thirty lookups a minute.

Questions a reviewer may ask:

- What if two users get the same uid? The unique index rejects the second write. The request that raced gets a duplicate key error, which the error handler maps to 409, and the generator checks for an existing uid before returning one.
- Why not sequential ids? They would reveal how many accounts exist and make guessing other users easy.
- Why is uid immutable? Other pages and shared links refer to it. Letting it change would break those references and the avatar public id that uses it.

## 7. Avatar upload

`client/src/components/profile/AvatarUpload.jsx` checks the chosen file before sending it: only JPEG, PNG and WebP, at most 2 MB, and it resets the file input so choosing the same file twice still fires. It shows a local preview from `URL.createObjectURL`, revokes that URL when it changes or the component unmounts, and sends the file with `FormData` through `client/src/api/users.api.js`. The route `PUT /api/users/me/avatar` runs `protect` and `avatarUpload`, a multer memory upload in `server/src/middleware/upload.js` that enforces the same 2 MB limit and MIME types on the server. `updateAvatar` in `server/src/controllers/user.controller.js` answers 503 when Cloudinary is not configured, then streams the buffer through `uploadToCloudinary` to the folder `hackathon/avatars` with the public id `user_<uid>`, overwrite on, and a 400 by 400 face crop. A provider failure becomes a clean 502 message, never a stack or a Cloudinary body. The controller stores the returned `secure_url` and public id on the user, and the client updates `AuthContext` so the new picture shows immediately. `deleteAvatar` destroys the stored public id and clears both fields, logging rather than failing when Cloudinary refuses the delete.

Questions a reviewer may ask:

- Why check the file again on the server? The browser check is a convenience. A crafted request can skip it, so the multer filter and the 2 MB limit are the real enforcement.
- Why memory storage? The file is small and goes straight to Cloudinary, so there is no temporary file to clean up.
- Why the same public id per user? It keeps one avatar per account and replaces the old file instead of leaving orphans, and Cloudinary returns a new versioned URL for the replacement.
- Why 400 by 400 with a face crop? Every avatar has the same shape and size, so the interface never has to deal with odd aspect ratios.

## 8. AI chat and key rotation

`client/src/pages/AiBuddy.jsx` drives `client/src/hooks/useChat.js`, which calls `sendChat` from `client/src/api/ai.api.js` and posts to `/api/ai/chat` behind `protect` and `aiChatLimiter`. The `chat` controller in `server/src/controllers/ai.controller.js` validates a 1 to 4000 character message, loads the stored settings with `loadAiSettings`, finds the conversation by uid and owner, and sends the last twenty messages to `chatWithPool`. Claiming a key happens in `server/src/services/aiKeyPool.js`: `claimAvailableKey` uses `findOneAndUpdate` to pick an enabled, active key of the default provider that is not cooling down and has not been tried, ordered by `lastUsedAt` so the least recently used key goes first, and increments its usage count. The stored key is decrypted with `decryptSecret`, and `askGemini` or `askGrok` in `server/src/services/aiProviders.js` makes the call with a twelve second abort timeout. An auth failure marks the key invalid, a rate limit, server error, timeout or network error puts it on cooldown until the retry-after or `AI_COOLDOWN_SECONDS`, and a 400 or 404 stops the rotation with a recorded `lastError` because another key would fail the same request. The loop tries at most six keys and stops at a twenty-eight second deadline, then answers 503 with code `ai_no_active_keys` when nothing was available or `ai_keys_failed` when every tried key failed. The reply is capped at 8000 characters, saved so parallel messages are not lost (a new conversation in one save, later exchanges with an atomic `$push` and `$slice`), and returned with the provider and model name.

Questions a reviewer may ask:

- How is the next AI key chosen? The pool asks the database for the enabled, active, non-cooling key with the oldest `lastUsedAt`, excluding keys already tried for this request, and marks it used in the same atomic update.
- What happens when a key fails? Auth errors disable it, temporary errors cool it down, and a rejected request records the reason and stops. The next key is tried when the failure is worth retrying, and a 503 with a clear code comes back when nothing works.
- Why store keys encrypted? A database backup or a support export should not expose provider keys. Encryption uses AES-256-GCM with `AI_KEY_SECRET`, the encrypted value is never selected by normal queries, and every response shows only a masked tail.
- Why not rotate on a 400 or 404? The request itself is wrong or the model name does not exist. Another key would produce the same answer, so the reason is recorded for the admin instead of burning every key.
- Why these timeouts? Twelve seconds per attempt keeps one slow provider from blocking the rest, and twenty-eight seconds total stays under the reverse proxy limit.
- Why do environment keys not overwrite admin edits? `setupAi` in `server/src/services/aiSetup.js` imports them only when no keys are stored, so a key added or disabled in the admin screen survives a restart.

## 9. Error handling

Every controller is wrapped in `asyncHandler` from `server/src/utils/asyncHandler.js`, which forwards a rejected promise to `next` so no async error escapes Express. Handlers throw `ApiError` from `server/src/utils/ApiError.js` with a status, message and optional code or field errors, and the `validate` middleware in `server/src/middleware/validate.js` turns Zod failures into a 400 with one entry per field. Unknown paths reach `notFound` in `server/src/middleware/notFound.js`, and everything else lands in `errorHandler` in `server/src/middleware/error.js`. That function maps `ApiError`, Zod, Mongoose validation and cast errors, duplicate key 11000, JWT errors, multer limits and body parser errors to the same JSON shape, and returns a generic 500 message for anything else. Stacks are logged on the server only and never sent to the browser, and production responses contain no internal message. The process also catches unhandled rejections and exits, and SIGTERM closes the HTTP server and Mongo connection so a redeploy does not leave a half-dead process. On the client, `getErrorMessage` in `client/src/lib/errors.js` turns the same responses into the text shown by forms and toasts.

Questions a reviewer may ask:

- Why one central error handler? Every route then returns the same shape, and a controller only has to throw instead of building a response for each failure.
- Why hide the 500 details? Internal messages can name files, queries or providers. The log keeps the stack for the developer, and the user gets a neutral sentence.
- Why is the JSON body limited to 10 KB? The API expects small JSON documents. The limit stops a large body from using memory before validation even runs.
- Why does the process exit on an unhandled rejection? After an unexpected rejection the process state is unknown. Exiting lets the platform restart a clean instance instead of serving broken requests.

## Where to change things quickly

**Add a field to an existing model.** For items, add the field and its validation to `server/src/models/Item.js`, allow it in `server/src/validators/item.validators.js`, and pass it through `createItem` and `updateItem` in `server/src/controllers/item.controller.js`. On the client add the input to `client/src/components/items/ItemFormModal.jsx` and show it in `client/src/components/items/ItemRow.jsx`. A user profile field follows the same idea: `server/src/models/User.js`, `server/src/validators/user.validators.js`, the allow list in `updateProfile` in `server/src/controllers/user.controller.js`, then `client/src/components/profile/AccountPanel.jsx`.

**Add a module.** Copy the items module: create a model in `server/src/models`, a Zod schema in `server/src/validators`, a controller in `server/src/controllers` and a router in `server/src/routes`, then mount the router in `server/src/routes/index.js` with `router.use("/things", thingRoutes)`. On the client add an API file next to `client/src/api/items.api.js`, a page modelled on `client/src/pages/Dashboard.jsx` with the shared table and pagination pieces, a route in `client/src/App.jsx` inside `ProtectedRoute`, and a link in the `links` array in `client/src/components/layout/Navbar.jsx`.

**Change the theme color.** The colors are CSS variables in `client/src/index.css` under `:root`, for example `--primary` and `--ring`. `client/tailwind.config.js` maps those variables to classes such as `bg-primary` and `text-foreground`, so editing a variable changes every component that uses the matching class. Keep contrast in mind, update the small color table in `theme.md`, and check the change on the buttons, links and focus outline.

**Change the AI prompt.** The default lives in `AI_DEFAULTS.systemPrompt` in `server/src/config/aiDefaults.js`. For a running instance, an admin edits it in `client/src/components/ai/AiSettingsForm.jsx`, which saves through `PUT /api/admin/ai/settings` to `updateAiSettings` in `server/src/controllers/aiAdmin.controller.js`; the prompt is validated by `aiSettingsSchema` and stored on the `AiSettings` document. The chat request sends it to the provider in `askGemini` and `askGrok` in `server/src/services/aiProviders.js`. `setupAi` creates the default only when no settings exist, so an admin change survives a restart.
