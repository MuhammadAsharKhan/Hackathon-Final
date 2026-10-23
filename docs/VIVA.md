# Viva guide

This is a plain-language walkthrough of the main flows for the hackathon review. Each section explains what happens, where the code lives, and the questions a reviewer is likely to ask. Read the flow first, then open the named files and follow the function calls.

## 1. Register and login

### What happens

1. The client sends `name`, `email`, `password`, `age` and an optional `gender` to `POST /api/auth/register`.
2. `register` checks for an existing email, creates the user unverified, emails a six digit code and returns 201 without a session.
3. The `User` model hashes the password in a `pre("save")` hook with bcrypt and gives the new user a nine digit uid in a `pre("validate")` hook.
4. The client stores only the email in `sessionStorage` and shows `/verify-email`. The code is exchanged for a session there.
5. Login sends `email` and `password` to `POST /api/auth/login`, where `login` loads the password hash and compares it with bcrypt.
6. If the email is unknown, `login` still compares against `DUMMY_HASH`, so a failed email and a failed password take about the same time.
7. A correct password on an unverified account sends a fresh code and answers 403 with `EMAIL_NOT_VERIFIED`, which the client turns into the verify page.
8. On success, `createSession` returns an access token and a refresh token, and `setRefreshCookie` stores the refresh token in an httpOnly cookie.
9. The client stores the access token in memory and sends it as `Authorization: Bearer <token>` on later requests.

### Files and functions

- `server/src/controllers/auth.controller.js`: `register`, `login`
- `server/src/models/User.js`: `assignUid` and `hashPassword` hooks, `comparePassword`
- `server/src/utils/tokens.js`: `createSession`, `setRefreshCookie`
- `client/src/pages/Register.jsx`, `client/src/pages/Login.jsx`, `client/src/pages/VerifyEmail.jsx`
- `client/src/context/AuthContext.jsx`: `startSession`, `login`, `register`, `verifyEmail`

### Likely questions

**Why is the password hashed in the model instead of the controller?**
The model owns the password field, so every save path gets the same treatment. If a future controller creates or changes a user, it cannot forget to hash. The hook checks `isModified("password")`, so saving an unrelated field does not re-hash the old hash.

**Why compare against a dummy hash when the email is unknown?**
Without it, a missing account returns almost immediately while a real account spends time in bcrypt. That timing difference lets an attacker learn which emails are registered. The dummy comparison keeps both failures in the same range.

**Why is validation done on the client and the server?**
The client copy gives fast feedback and avoids pointless requests. The server copy is the one that matters for security because a request can bypass the browser entirely. Both use the same password rules, including the 72 byte bcrypt limit.

**Why does register not sign the user in?**
Anyone can type an address that is not theirs. Signing in before the code is entered would let a stranger hold a session for an email they do not own. The session starts only when the mailbox is proved.

## 2. Email verification

### What happens

1. `POST /api/auth/register` creates the account with `emailVerified: false` and sends a code. The answer is `{ email, verificationRequired: true }` with no tokens and no cookie.
2. The code lives in `PasswordOtp` with `purpose: "email-verification"`, keyed by email and purpose, so it cannot collide with a password reset code.
3. The rules match the reset flow: six digits, HMAC-SHA256 with `JWT_RESET_SECRET`, ten minute life, five wrong tries, a 60 second gap between sends and five sends per hour.
4. `POST /api/auth/verify-email` compares the code, sets `emailVerified`, deletes the record and answers like login with the user, access token and refresh cookie.
5. `POST /api/auth/resend-verification` always answers 200 and sends only when an unverified account exists within the limits.
6. Login checks the password first. A correct password on an unverified account sends a code and answers 403 with `code: "EMAIL_NOT_VERIFIED"`.
7. `protect` and `refreshSession` reject an unverified account with 401, so even a hand-made token cannot use the API.
8. Registering again with an unverified email updates the profile and password and sends a fresh code, so an abandoned sign-up does not lock the address.
9. `EMAIL_VERIFICATION_REQUIRED=false` skips the code and signs the new account in immediately. Old accounts are marked verified at startup.
10. The client keeps the email in `sessionStorage`, shows `/verify-email`, and moves to the originally requested page after success.

### Files and functions

- `server/src/controllers/auth.controller.js`: `register`, `sendOtpCode`, `verifyEmail`, `resendVerification`, `login`
- `server/src/models/PasswordOtp.js`: `purpose` and the `{ email, purpose }` unique index
- `server/src/utils/ensureEmailVerification.js`: backfill and old index cleanup
- `server/src/middleware/auth.js`, `refreshSession`: the unverified checks
- `client/src/pages/VerifyEmail.jsx`, `client/src/lib/pendingVerification.js`
- `client/src/hooks/useResendCountdown.js`, `client/src/components/auth/EmailVerificationFlow.jsx`

### Likely questions

**Why reuse the password OTP model?**
The hashing, expiry, attempt limit and send quota were already solved and tested. A `purpose` field separates the two jobs while the compound index keeps one active code per email and purpose.

**Why not trust the client saying the email is verified?**
The browser is not a security boundary. The server sets the flag, and every protected request reads it from the database, so a client cannot claim a state it does not have.

**Why clear the password when Google links to an unverified account?**
The account existed before anyone proved the address. The stored hash may belong to whoever typed the email first, so Google's proof of ownership must invalidate it. Clearing the hash and sessions closes that window.

**What does the startup backfill do?**
Accounts created before this feature have no `emailVerified` field. Marking them verified keeps current users working. The same task gives old OTP records the reset purpose and drops the old unique index on `userId`.

## 3. Access and refresh tokens

### What happens

1. `createSession` signs a short lived access token with `JWT_ACCESS_SECRET` and a longer lived refresh token with `JWT_REFRESH_SECRET`.
2. The access token stays in `client/src/lib/tokenStore.js`, which is a module level variable. It is never written to `localStorage` or `sessionStorage`.
3. The refresh token is sent in an httpOnly cookie named `rt`, scoped to `/api/auth`, with `sameSite` from `COOKIE_SAMESITE` and `secure` in production.
4. The server stores only a SHA-256 hash of each refresh token on the user document.
5. On a page load, `AuthContext` calls `POST /api/auth/refresh`, gets a new access token and user, and continues the session without showing the login page.
6. When a request returns 401, the axios response interceptor calls refresh once and retries the original request with the new access token.
7. `refreshSession` in the auth controller removes the old token hash, records it as `previousRefreshToken`, and creates a new session.

### Files and functions

- `server/src/utils/tokens.js`: `signAccessToken`, `signRefreshToken`, `hashToken`, `createSession`, `removeExpiredSessions`, `storeRefreshToken`
- `server/src/controllers/auth.controller.js`: `refreshSession`, `rotateStoredToken`, `isRecentRotation`, `revokeAllSessions`
- `client/src/api/http.js`: `refreshSession`, `retryWithFreshToken`
- `client/src/context/AuthContext.jsx`: the bootstrap effect
- `client/src/lib/tokenStore.js`

### Likely questions

**Why keep the access token in memory instead of localStorage?**
Any script that runs on the page can read localStorage. An in-memory token disappears on reload, but the httpOnly refresh cookie restores the session. This limits the damage from a cross-site scripting bug.

**Why is the refresh token in an httpOnly cookie?**
JavaScript cannot read an httpOnly cookie, so a script injected into the page cannot steal the long lived token. The cookie is also scoped to `/api/auth`, so ordinary API requests do not carry it, and `sameSite` blocks most cross-site sends.

**Why store a hash of the refresh token?**
A database leak should not hand an attacker working sessions. The server can hash the presented token and compare it with the stored hash, just as it does with passwords.

**Why rotate the refresh token?**
Rotation makes a stolen token useful only until the real user refreshes. If the old token appears again after the grace window, the server treats it as reuse, clears every session for that user and returns 401.

**Why allow the previous token for ten seconds?**
Two tabs can load at the same time and both send the same cookie. The short grace window lets the second tab finish instead of being treated as an attacker. After `REFRESH_GRACE_MS`, the same token is rejected.

**Why keep only five sessions?**
Each login adds a refresh token. Without a cap, the array would grow forever. `createSession` removes expired tokens and `$slice: -5` keeps the newest five.

## 4. Protected routes

### What happens

1. The client route table wraps signed-in pages in `ProtectedRoute` and auth pages in `GuestRoute`.
2. `ProtectedRoute` waits for `AuthContext` to finish its bootstrap refresh, then redirects a signed-out user to `/login` with the current location in `state.from`.
3. `Login` and `Register` use `redirectPath` to rebuild the full path, including search and hash, and navigate there after success.
4. `GuestRoute` sends a signed-in user away from `/login` and `/register`.
5. On the server, `protect` reads the bearer token, verifies it and loads a small user object into `req.user`. An account that has not verified its email is rejected with 401.
6. `restrictTo("admin")` checks `req.user.role` before an admin route runs.
7. Every user-owned query also filters by `owner: req.user.id`; the route guard is not the only protection.

### Files and functions

- `server/src/middleware/auth.js`: `protect`, `restrictTo`
- `client/src/components/ProtectedRoute.jsx`, `client/src/components/GuestRoute.jsx`
- `client/src/lib/navigation.js`: `redirectPath`
- `client/src/App.jsx`
- `client/src/pages/AdminUsers.jsx`, `client/src/pages/AdminAi.jsx`

### Likely questions

**Is hiding a page in React enough protection?**
No. The browser code is not a security boundary. Every protected endpoint runs `protect`, and admin endpoints also run `restrictTo("admin")`. The page guard only decides what to render.

**Why load the user from the database on every request?**
A token can outlive a deleted or demoted account. Loading the current user means a deleted account stops working immediately, a role change takes effect on the next request and an unverified account stays locked out.

**Why do item queries filter by owner as well as id?**
An id from the client is not proof of ownership. Filtering by both `_id` and `owner` prevents one user from reading or changing another user's item by guessing an id.

**What happens when the session expires while a page is open?**
The 401 interceptor refreshes the token and retries once. If refresh also fails, the token is cleared, `auth:logout` resets the context and the route guard sends the user to sign in.

## 5. OTP password reset

### What happens

1. `POST /api/auth/forgot-password` looks up the email and always returns the same message, whether or not the account exists.
2. `sendOtpCode` allows one code per minute and five per hour for each purpose. Over the limit it returns silently instead of revealing the quota.
3. The six digit code is generated with `crypto.randomInt`, hashed with HMAC-SHA256 using `JWT_RESET_SECRET`, and stored with a ten minute expiry.
4. `POST /api/auth/verify-otp` compares the submitted code with `crypto.timingSafeEqual`.
5. A wrong code increments `attempts`; after five wrong tries the record is deleted.
6. A correct code is replaced by a short lived reset token. The token carries the user id, the purpose and a `jti` that is stored on the OTP record.
7. `POST /api/auth/reset-password` checks the purpose and `jti`, rejects a password equal to the current one, saves the new password, marks the account verified and deletes the OTP record.
8. A reset clears every refresh token, so every other session is signed out.

### Files and functions

- `server/src/controllers/auth.controller.js`: `forgotPassword`, `readSendQuota`, `sendOtpCode`, `verifyOtp`, `recordFailedOtpAttempt`, `issueResetToken`, `resetPassword`
- `server/src/utils/otp.js`: `createOtpCode`, `hashOtpCode`, `otpCodeMatches`, `signResetToken`, `verifyResetToken`
- `server/src/utils/password.js`: `ensurePasswordDiffers`, `saveNewPassword`
- `server/src/models/PasswordOtp.js`
- `client/src/components/auth/EmailVerificationFlow.jsx`, `ForgotPasswordModal.jsx`

### Likely questions

**Why always return the same message for forgot password?**
A different answer for a registered email would let anyone test which emails have accounts. The endpoint says a code was sent if the account exists, and the client shows the same line either way.

**Why hash a six digit code?**
Six digits are easy to brute force, so the hash alone is not enough. The real protections are the ten minute expiry, the five attempt limit, the one minute resend gap and the per hour send cap. Hashing still means a database reader cannot simply read the current code.

**Why is the code not the reset token?**
The code is short and human typed. The reset token is a signed JWT tied to a specific OTP record by `jti`. Exchanging the code once for a token means the code cannot be replayed after a successful reset.

**Why is the reset token purpose checked?**
Both the access token and the reset token are JWTs. Checking `purpose === "password-reset"` stops a token minted for one job from being used for another.

**Why does a reset sign out other sessions?**
If someone changed the password because an account was compromised, the attacker's refresh tokens must stop working. Clearing the array is the simplest reliable way to do that.

## 6. Google sign-in

### What happens

1. `GoogleButton` renders only when `VITE_GOOGLE_CLIENT_ID` is set.
2. Google returns an ID token credential to the browser.
3. The client sends it to `POST /api/auth/google`.
4. `verifyGoogleCredential` verifies the token with `google-auth-library` and checks that the audience matches `GOOGLE_CLIENT_ID`.
5. `googleSignIn` rejects a profile whose email is missing or not verified.
6. `findOrCreateGoogleUser` looks up the user by `googleId`, then by email, links `googleId` to an existing account, or creates a new verified account with `hasPassword: false`.
7. The response uses the same session path as a password login, so the refresh cookie and access token work the same way.
8. A new Google account has `age: null`, so `CompleteProfileModal` asks for an age before the user continues.

### Files and functions

- `server/src/controllers/auth.controller.js`: `googleSignIn`, `verifyGoogleCredential`, `findOrCreateGoogleUser`, `googleDisplayName`
- `server/src/validators/auth.validators.js`: `googleSignInSchema`
- `client/src/components/auth/GoogleButton.jsx`, `GoogleSection.jsx`
- `client/src/components/auth/CompleteProfileModal.jsx`

### Likely questions

**Why require a verified Google email?**
Without that check, someone could create a Google account with an email they do not control and link it to an existing password account. The verified flag is what makes the email a trustworthy identity.

**What happens if a user registered with a password and later uses Google?**
The server finds the account by email and adds `googleId`. On a verified account the password remains, so both sign-in methods work. If the password account was never verified, Google has now proved the address, so the old password hash and refresh tokens are cleared first. The reverse is safe because linking happens only after Google confirms the email.

**Why does the server verify the credential instead of trusting the client?**
The browser can send any string. Only Google's public keys can prove that the credential was issued for this app. `verifyIdToken` checks the signature and the audience.

**What if Google is not configured?**
`config.googleClientId` is empty, so the route answers 503 and the client hides the Google button and divider. The rest of the auth flow still works.

## 7. uid generation

### What happens

1. A uid is nine digits, for example `839498284`.
2. `createUid` draws a number with `crypto.randomInt(100000000, 1000000000)`.
3. It checks the model with `exists({ uid })` before returning.
4. If the number is taken, it tries again, up to ten times.
5. Every model that carries a uid assigns it in a `pre("validate")` hook, so inserts cannot forget it.
6. The field has a unique index and is immutable.
7. `ensureUids` runs at startup and fills uid on older documents that predate the field.
8. Public lookups use the uid, while ownership checks still use the internal id and `owner`.

### Files and functions

- `server/src/utils/uid.js`: `createUid`
- `server/src/utils/ensureUids.js`: `backfillUids`, `ensureUids`
- `server/src/models/User.js`, `Item.js`, `Conversation.js`
- `server/src/controllers/user.controller.js`: `findUserByUid`
- `server/src/controllers/item.controller.js`: `getItemByUid`

### Likely questions

**Why use a nine digit uid instead of the Mongo ObjectId?**
A uid is short enough to read, say and type. It also gives the public user lookup a separate identifier from the internal `_id`, so the API does not expose database ids.

**What happens if two users get the same uid?**
The pre-check makes it very unlikely, but the unique index is the final guard. If two requests race past the check, the second insert fails with a duplicate key error, and the error handler turns that into a 409. The uid is assigned before the insert, so a retry would need a new request. The chance is about one in 900 million per pair.

**Why is the uid immutable?**
Other people may share their uid. Changing it would break every link and lookup. The model marks the field immutable and the controllers never accept a uid for an ownership check.

**Why does the server backfill uid at startup?**
Older documents were created before the field existed. The unique index and the hooks only cover new inserts, so `ensureUids` fills the gaps once. It logs only how many documents changed.

## 8. Avatar upload

### What happens

1. `AvatarUpload` checks the file type and size in the browser before sending anything.
2. The user picks a JPEG, PNG or WebP image up to 2 MB.
3. `uploadAvatar` sends multipart form data with the field name `avatar`.
4. `avatarUpload` uses multer memory storage, a 2 MB limit, one file and the same type allowlist.
5. `updateAvatar` checks that Cloudinary is configured, then `uploadToCloudinary` streams the buffer to the `hackathon/avatars` folder.
6. The Cloudinary public id is `user_<uid>` with `overwrite: true`, so a new upload replaces the old file instead of piling up copies.
7. The image is cropped to 400 by 400 with face gravity, then the user stores `avatarUrl` and `avatarPublicId`.
8. `deleteAvatar` removes the Cloudinary asset and clears both fields. If Cloudinary is missing, both routes answer 503.

### Files and functions

- `server/src/middleware/upload.js`: `avatarUpload`
- `server/src/controllers/user.controller.js`: `updateAvatar`, `uploadToCloudinary`, `deleteAvatar`
- `server/src/config/cloudinary.js`: `isCloudinaryConfigured`
- `client/src/components/profile/AvatarUpload.jsx`
- `client/src/api/users.api.js`: `uploadAvatar`, `deleteAvatar`

### Likely questions

**Why keep the upload in memory instead of writing it to disk?**
The server is stateless and may run in more than one place. A temporary disk file would need cleanup and would not be shared between instances. The file is small, so a buffer is simpler.

**Why check the type and size twice?**
The browser check gives a fast, friendly message. The server check is the real one because a request can bypass the page. Multer enforces the size and `fileFilter` enforces the MIME type.

**Why is the Cloudinary public id based on the uid?**
It gives one predictable asset per user and lets `overwrite: true` replace the old image. It also means a user cannot choose the public id or overwrite someone else's asset.

**What happens if the old image delete fails?**
`deleteAvatar` logs the Cloudinary error and still clears the user fields. The account no longer points at the image, which is the important state. The orphaned asset can be cleaned up separately.

## 9. AI chat

### What happens

1. `POST /api/ai/chat` requires a signed-in user, a message and an optional `conversationUid`.
2. `loadAiSettings` returns the single `AiSettings` document, creating defaults if it is missing.
3. If a conversation uid is present, `findOwnedConversation` loads it with `owner: req.user.id`; otherwise the chat starts a new conversation.
4. The last 20 messages are mapped to provider messages and sent with the new user message.
5. `chatWithPool` claims a provider key and calls Gemini or the OpenAI-compatible Grok endpoint.
6. The reply is saved only after the provider succeeds. A failed call does not leave a half written conversation.
7. A new conversation uses the first 40 characters of the first message as its title.
8. The response returns the conversation uid and title, the assistant reply and the provider and model that answered, and the client appends the reply and refreshes the list.

### Files and functions

- `server/src/controllers/ai.controller.js`: `chat`, `findOwnedConversation`, `saveExchange`, `listConversations`, `getConversation`, `deleteConversation`
- `server/src/services/aiKeyPool.js`: `chatWithPool`, `tryAvailableKeys`
- `server/src/services/aiProviders.js`: `askGemini`, `askGrok`
- `server/src/models/Conversation.js`
- `client/src/hooks/useChat.js`: `send`, `retry`, `openConversation`
- `client/src/components/ai/ChatPanel.jsx`, `MessageList.jsx`, `MessageInput.jsx`

### Likely questions

**Why send only the last 20 messages?**
Provider requests have token limits and cost money. Twenty messages usually preserve the thread without sending the entire history. The full conversation stays in MongoDB for the next request and for the UI.

**Why save the exchange only after the provider replies?**
If the provider fails, saving the user message would leave a conversation that looks answered but is not. Saving both messages together keeps each stored turn complete.

**Why is the conversation scoped by owner?**
A conversation uid is public enough to appear in a URL, but it is not an authorization token. Every read, write and delete filters by `owner: req.user.id`, so another signed-in user cannot open it.

**Why does the client keep the failed message for Retry?**
The request may fail after the user message was shown. Retrying with `appendUser: false` resends the same text without adding a duplicate bubble. The server still has no stored turn because it only saves on success.

**Why render Markdown without raw HTML?**
Assistant output is untrusted text. `react-markdown` with `remark-gfm` and no raw HTML plugin means a reply cannot inject a script or an event handler. Code blocks are rendered by the shared `CodeBlock` component.

## 10. AI key rotation

### What happens

1. Provider keys are encrypted with AES-256-GCM using `AI_KEY_SECRET` before they are stored.
2. The API only returns a masked value with the last four characters.
3. `claimAvailableKey` atomically claims an enabled, active key whose cooldown has passed, using `findOneAndUpdate` and `sort: { lastUsedAt: 1 }`.
4. Claiming sets `lastUsedAt` and increments `usageCount` before the provider call.
5. `tryAvailableKeys` starts with the default provider and tries at most six keys across both providers.
6. A 401 or 403 marks the key `invalid`. A 429 or 5xx sets `cooldownUntil` from `Retry-After` or `AI_COOLDOWN_SECONDS`.
7. A timeout or network error also cools the key down. Other 4xx errors stop the request with 422 because another key will not fix a bad request.
8. When no usable key remains, the route answers 503 with a short busy message. Provider bodies and plaintext keys never reach the response.

### Files and functions

- `server/src/services/aiKeyPool.js`: `claimAvailableKey`, `claimNextAvailableKey`, `markKeyFailure`, `requestProviderReply`, `tryAvailableKeys`, `chatWithPool`, `testAiKey`
- `server/src/services/aiProviders.js`: `ProviderError`, `postJsonRequest`, `classifyStatus`, `throwProviderError`
- `server/src/utils/crypto.js`: `encryptSecret`, `decryptSecret`, `maskKey`
- `server/src/controllers/aiAdmin.controller.js`: `buildKeyResponse`, `listAiKeys`, `createAiKey`, `updateAiKey`, `testStoredAiKey`
- `client/src/pages/AdminAi.jsx`, `client/src/components/ai/AdminKeysTable.jsx`

### Likely questions

**How does rotation pick a key?**
It picks the least recently used enabled key for the preferred provider, then the other provider if none is available. The claim is a single atomic Mongo update, so two parallel requests should not claim the same key at the same moment.

**What happens when a key fails?**
The failure type decides. An auth failure disables the key until an admin replaces or re-enables it. A rate limit or server failure gives it a cooldown and moves on. A request error stops the call, because sending the same bad request to another key would only waste time.

**Why encrypt the keys?**
The database is a separate trust boundary from the application configuration. Encryption with `AI_KEY_SECRET` means a database dump does not directly reveal working provider keys. The app still needs the secret in its environment to decrypt them.

**Why only show the last four characters?**
Admins need to tell keys apart, not read them back. Masking keeps the full key out of the API response, the browser and browser history. Replacing a key is the way to change it.

**Why cap the attempts at six?**
Each failed attempt costs time and can hit another provider limit. Six covers the normal two to four keys in a small deployment and then returns a clear 503 instead of hanging.

## 11. Error handling

### What happens

1. Controllers throw `ApiError` for expected failures such as a missing item, a bad password or a forbidden role.
2. `asyncHandler` wraps every async controller and forwards a rejected promise to Express with `next`.
3. Zod validation runs in `validate` before the controller and returns a 400 with `errors: [{ field, message }]`.
4. `normalizeError` maps ApiError, Zod errors, Mongoose validation errors, cast errors, duplicate keys, JWT errors, multer errors and bad JSON to one response shape.
5. Unexpected errors become a generic 500. The stack is logged, never sent in production.
6. The success shape is `{ success: true, data, message? }`; the error shape is `{ success: false, message, code?, errors? }`. The optional `code` lets the client react to a specific case, such as `EMAIL_NOT_VERIFIED`.
7. On the client, `getErrorMessage` reads the message and `getFieldErrors` turns the field list into an object for form inputs.
8. A 401 can trigger the one retry described in the token flow. Other failures are shown in the form, an error state or a toast.

### Files and functions

- `server/src/utils/ApiError.js`
- `server/src/utils/asyncHandler.js`
- `server/src/middleware/validate.js`
- `server/src/middleware/error.js`: `normalizeError`, `errorHandler`
- `client/src/lib/errors.js`: `getErrorMessage`, `getFieldErrors`
- `client/src/api/http.js`: the response interceptor

### Likely questions

**Why a custom ApiError instead of throwing strings?**
A string has no status code and no field list. `ApiError` carries `statusCode`, `message` and optional `errors`, so the handler can build a consistent response without guessing.

**Why does asyncHandler exist?**
Express 4 does not catch a rejected promise from an async handler. Without the wrapper, the request would hang or produce an unhandled rejection. `asyncHandler` turns the rejection into `next(error)`.

**Why hide the stack in production?**
A stack can reveal file paths, library versions and internal structure. The client only needs a short message. Developers still get the stack in the server log.

**Why return field errors as an array?**
The form needs to attach a message to a specific input. An array of `{ field, message }` keeps that mapping explicit and works for nested Zod paths such as `name.first`.

**Why is the client validation not enough?**
It is a convenience, not a security control. A request can skip the browser or be edited by hand. The server repeats every rule and is the only place that decides whether data is valid.

## Where to change things quickly

### Add a field to a model

1. Add the field to the Mongoose schema in `server/src/models/`.
2. Add it to the create or update Zod schema in `server/src/validators/`.
3. Read and write it in the controller. Remember `$set` and `runValidators: true` on updates.
4. If the field should be public, check the model `toJSON` transform. It already removes `_id`, `__v`, passwords and provider secrets.
5. Add the input to the relevant client form and the display to the relevant page.
6. Add the field to the API contract in `docs/ARCHITECTURE.md` if it changes a request or response.
7. Backfill old documents only if the field is required. `ensureUids` is the pattern for a one-time startup backfill.

### Add a module

1. Create the model, validator, controller and routes file under `server/src/`. Scope user-owned queries by `owner: req.user.id`.
2. Mount the router in `server/src/routes/index.js`.
3. Create `client/src/api/things.api.js` using the shared `http` instance.
4. Build the page from `ItemRow`, `ItemFormModal`, `Pagination` and the shared UI. Use `Dashboard.jsx` as the reference.
5. Add the route in `client/src/App.jsx`, wrapped in `ProtectedRoute` when it needs a session.
6. Add the nav link in `client/src/components/layout/Navbar.jsx`.
7. Run the API suite and `npm run build:client`.

### Change the theme

1. Read `theme.md` first. It lists the tokens and the copy rules.
2. Change the CSS variables in `client/src/index.css`. The Tailwind names in `client/tailwind.config.js` map to those variables.
3. Change a shared primitive only when every page should change. Page specific classes belong on the page.
4. Check both light and dark appearance if you add a color, and check a 360px viewport.
5. Do not hardcode hex values in JSX. Use the token utilities such as `bg-background`, `text-muted-foreground` and `border-border`.

### Change the AI prompt

1. Sign in as an admin and open `/admin/ai`.
2. Edit `System prompt` and save. This writes `AiSettings.systemPrompt` and affects the next chat request.
3. Change `AI_DEFAULTS.systemPrompt` in `server/src/config/aiDefaults.js` only when you want a new default for a fresh database. Existing databases keep their saved prompt.
4. Change the provider, model or base URL on the same page. The base URL must be https, except localhost in development.
5. Run one chat and one key test after the change. A model name that the provider does not recognize will fail at request time, not when the settings are saved.
