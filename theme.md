# Theme

The interface is white, near-black and quiet, with one deep teal accent. Structure comes from 1px hairlines and spacing, not from shadows, gradients or color. A future prompt can say "follow theme.md" and get the same look.

## Tokens

Defined as CSS variables in `client/src/index.css` and mapped to Tailwind in `client/tailwind.config.js`. Change the values in one block to retheme the app.

| Variable | Value | Tailwind | Use |
| --- | --- | --- | --- |
| `--background` | `#ffffff` | `bg-background` | Page and card background |
| `--foreground` | `#0a0a0a` | `text-foreground` | Primary text, primary button fill |
| `--surface` | `#fafafa` | `bg-surface` | Secondary hover, subtle panels |
| `--surface-tint` | `#f0fdfa` | `bg-surface-tint` | Stat cards and the active menu row |
| `--muted` | `#f4f4f5` | `bg-muted` | Ghost hover, skeletons |
| `--muted-foreground` | `#71717a` | `text-muted-foreground` | Descriptions, hints, meta text |
| `--border` | `#e4e4e7` | `border-border` | Every hairline, inputs, dividers |
| `--primary` | `#0f766e` | `bg-primary`, `text-primary` | Primary action, active menu, accent text |
| `--primary-hover` | `#115e59` | `bg-primary-hover` | Primary button hover |
| `--primary-foreground` | `#ffffff` | `text-primary-foreground` | Text on primary |
| `--danger` | `#dc2626` | `text-danger`, `bg-danger` | Destructive action, field errors |
| `--success` | `#16a34a` | `text-success` | Completed status, success toast icon |
| `--ring` | `#0a0a0a` | `outline` | Focus outline |

Rules:

- Never hardcode a hex value in a component. Use the token utilities or `var(--...)`.
- No gradients, no colored section backgrounds, no decorative illustration.
- Teal is the only accent: primary buttons, the active menu row, accent status chips and the tinted stat surface. `danger` appears only for destructive actions and errors; `success` only for completed status and success feedback.
- Status colors come from `StatusBadge`. Do not pick a chip color by hand in a page.

## Typography

- Family: `Inter Variable` from `@fontsource-variable/inter`, then system UI fallbacks. Applied through `font-sans`.
- Body: 15px, line height 1.5, `antialiased`.
- Weights: 400 body, 500 labels and small headings, 600 page titles. Nothing heavier.
- Page title: `text-2xl font-semibold tracking-tight`.
- Card or modal title: `text-base font-semibold`.
- Body and form text: `text-sm`.
- Meta, hints and errors: `text-xs`.
- Headings use `tracking-tight`; the base layer sets `-0.015em` on `h1` to `h3`.
- Numbers in tables and pagination use `tabular-nums` when alignment matters.
- Uppercase is not used. Letter-spaced eyebrows are not used.

## Spacing and layout

- Container: `max-w-6xl` with `px-4 sm:px-6`.
- Page vertical rhythm: `py-10` to `py-12`; sections separated by `space-y-8`.
- Card padding: `p-5` or `p-6`. Modal padding: `px-6 py-5` body, `px-6 py-4` header and footer.
- Gaps: 2, 3, 4, 6, 8. Avoid arbitrary values.
- Radius: `rounded-lg` for controls and inputs, `rounded-xl` for cards and modal panels.
- Borders: 1px `border-border`. Dividers are the same token.
- Shadows: none on cards and controls. `shadow-sm` only on the modal panel. Toasts use a single 1px shadow.
- Backgrounds stay white; use `surface` or `muted` for hover and skeleton, never for large regions.

## Motion

- Color and opacity transitions: `duration-150`.
- Modal overlay: `150ms ease-out`. Modal panel: `180ms cubic-bezier(0.16, 1, 0.3, 1)`, a short rise and slight scale.
- Active buttons scale to `0.99`.
- Skeletons pulse between opacity 1 and 0.55 over 1.6s.
- `prefers-reduced-motion` collapses animation and transition durations; never remove the preference block.

## Component-first rule

Pages compose shared components. Do not hand-write a `button`, `input`, `select`, `textarea`, `table` or dialog in a page. A repeated layout or control pattern becomes a shared component instead of a copy. Components in `components/ui` accept `className` and spread the remaining props.

| Component | Use |
| --- | --- |
| `AppShell` | Sidebar, mobile drawer, top bar and the page column. |
| `Sidebar` | Role menu from `config/menus.js` and the signed-in footer. |
| `Topbar` | Page title, notification bell and user menu. |
| `NotificationBell` | Unread count polled every 30 s and the notification dropdown. |
| `UserMenu` | Name, role, change password and sign out. |
| `AuthLayout` | Centered shell for setup, sign-in and change password. |
| `Footer` | Single-line product footer. |
| `ScrollManager` | Top reset and hash scrolling for the router. |
| `SetupGate` | Setup status redirects for every route. |
| `ProtectedRoute` | Session, role and forced password gate. |
| `GuestRoute` | Redirects signed-in users away from the auth screens. |
| `Avatar` | Initials at `sm`, `md` or `lg`. |
| `Badge` | One short chip. Statuses use `StatusBadge`. |
| `Button` | Every action, with variant, size and loading state. |
| `Card` | Bordered surface for grouped content and list rows. |
| `Checkbox` | Labeled checkbox, used by settings and filters. |
| `ConfirmDialog` | Destructive confirmation built on `Modal`, with an optional error line. |
| `Container` | Page width and horizontal padding. |
| `CopyButton` | Clipboard action with a copied state and a fallback. |
| `DateInput` | Native date input with label, hint and error. |
| `Divider` | Plain separator between alternative actions. |
| `EmptyState` | Nothing yet, no match or a dismissed error. |
| `ErrorState` | Failed request with a retry action. |
| `Field` | Label, hint and error wrapper for one control. |
| `FormError` | Form-level error text. |
| `Input` | Single-line text, email, password, number and time fields. |
| `Modal` | Dialog, focus trap, scroll lock and mobile sheet. |
| `MonthInput` | Native month input with label, hint and error. |
| `OtpInput` | Six digit code entry with paste and auto-advance. |
| `PageHeader` | Page title, one-line description and actions. |
| `PageLoading` | Page level spinner with screen reader text. |
| `PageSection` | Titled block with an optional action row. |
| `Pagination` | Total, page count and previous and next controls. |
| `SectionHeading` | Section title with an optional action. |
| `Select` | Labeled native select. |
| `Spinner` | Loading indicator inside a button or page. |
| `StatusBadge` | Status label and tone for attendance, leave, payroll, employee and account rows. |
| `Table` | Table shell, row and cell. |
| `Tabs` | Keyboard accessible tab list that wraps on narrow screens. |
| `Textarea` | Multiline text input. |
| `DataTable` | Column config, skeleton rows, empty, error with retry, pagination and expandable rows. |
| `FilterBar` | Debounced search, selects, text fields and a date range. |
| `StatCard` | One number on the tinted surface. |
| `ChartCard` | Titled chart card with an empty state. |
| `ForgotPasswordModal` | Verify, then set a new password from sign-in. |
| `EmailVerificationFlow` | Email and code steps with a resend countdown. |
| `KeyFormModal` | Add or replace an AI provider key. |
| `KeyStatusBadge` | Active, cooling, invalid or disabled key chip. |

## Components

`Button`

- Variants: `primary` (solid teal), `secondary` (white with border), `ghost` (text only), `danger` (solid red).
- Sizes: `sm` 32px, `md` 40px, `lg` 44px.
- `loading` renders a spinner, sets `aria-busy` and disables the button.
- One primary button per view or modal footer. Secondary next to it. Ghost for inline and menu actions. Danger only behind a confirmation.

`Input`, `Textarea`, `Select`

- Always pass `label`. Use `hint` for format guidance and `error` for the message.
- The components wire `htmlFor`, `aria-invalid` and `aria-describedby`; do not duplicate ids manually.
- Height 40px, 12px horizontal padding, `rounded-lg`. Focus changes the border to foreground plus the global focus outline.
- Server field errors come from `getFieldErrors` and map to the `error` prop by field name.

`Card`

- White surface, 1px border, `rounded-xl`, no shadow. Used for grouped content and list rows.
- Do not nest cards. Use a divider or spacing instead.

`Badge`

- One short chip in a muted or outlined style. No counts and no custom colors.
- A domain status goes through `StatusBadge` so it keeps one label and one tone everywhere.

`Modal`

- Closes on Escape, backdrop click and the close button. Locks body scroll, focuses the first field, traps Tab and restores focus on close.
- Uses `role="dialog"`, `aria-modal`, `aria-labelledby`, and a bottom sheet layout on small screens.
- Footer holds the cancel action first, then the primary action.

`ConfirmDialog`

- Built on `Modal`, for destructive actions only. Title states the action, description names the record, confirm button uses `danger` and the loading state.

`PageHeader`

- Every page starts with it: title, one-sentence description, optional actions on the right.
- The bottom border separates it from content. No breadcrumbs.

`Pagination`

- Hidden when there is a single page. Shows `{total} items`, `Page X of Y`, Previous and Next.
- Disabled at the ends and while loading.

`EmptyState`

- Dashed border, one icon from lucide at `h-5 w-5 text-muted-foreground`, a short title, one sentence, optional action.
- Distinguish "nothing yet" from "no match for this filter" in the copy.

`Spinner`

- `h-4 w-4` inside buttons, `h-5 w-5` for page-level loading. Never colored.

`StatusBadge`

- `kind` names the domain (`attendance`, `leave`, `payroll`, `employee`, `account`) and `status` the value. The label and the tone come from one map in the component.
- Tones: `success` for done, approved and active; `accent` for late, pending and probation; `danger` for absent and rejected; `muted` for off, cancelled and inactive.
- `children` overrides the label and `tone` overrides the tone for the rare row that needs it.

`DataTable`

- Props: `columns` (`{ key, header, render, className }`), `rows`, `loading`, `error`, `errorTitle`, `onRetry`, `empty`, `pagination` and `renderExpanded`.
- Loading keeps the header row and shows five skeleton rows. Empty and error replace the table body with the shared states.
- `renderExpanded` adds a chevron column and a full width row below it. Use it for JSON, before and after blocks or long notes.

`FilterBar`

- Search debounces 400 ms; selects, text fields and dates call `onChange` immediately. Pages own the request and reset the page number.
- Clear filters appears only while a value is set.
- Below `lg` the controls stack full width; from `lg` they sit on one row.

`StatCard`, `ChartCard`

- StatCard puts one number on `bg-surface-tint` with a short label and an optional hint.
- ChartCard reserves a fixed height and shows the empty message instead of empty axes.

## States

- Loading: skeletons for lists and tables, spinner for button submissions and the auth bootstrap. Never flash an empty state before the first response.
- Empty: `EmptyState` with an action when the user can create the first record.
- Error: `EmptyState` or an inline message with a retry button. Never a blank screen.
- Disabled: `opacity-60` plus `cursor-not-allowed`; do not change the color.
- Destructive: confirm first, then toast on success and on failure.

## Accessibility

- Every interactive element has a visible focus ring: 2px `--ring`, 2px offset.
- Icons are `aria-hidden` unless they are the only content, in which case the button has an `aria-label`.
- Loading regions announce themselves with `role="status"` and screen-reader text.
- Form errors are text, not color alone.
- Color contrast: foreground on white is near-black; muted text is used only for secondary information, never for essential labels.

## Copy rules

- Short, factual, neutral. Sentence case.
- Buttons are verbs: "New department", "Save changes", "Post announcement", "Sign out", "Delete holiday".
- Titles are nouns: "Dashboard", "Profile", "Users".
- Descriptions are one sentence, no exclamation marks, no selling.
- Errors state what happened and what to do: "Cannot reach the server. Try again." Do not blame the user.
- Empty states are plain: "No departments yet", "Create the first department to group your people."
- No emoji anywhere. No lorem ipsum, no placeholder marketing text, no jokes, no filler.
- Use the domain nouns of the spec: employee, department, designation, leave type, holiday, announcement, account.

Banned words and patterns: seamless, elevate, unlock, empower, leverage, robust, cutting-edge, streamline, effortless, revolutionize, supercharge, game-changer, powerful, next-generation, in today's, delve, journey, tailored, holistic, your all-in-one, exclamation marks, rhetorical questions and em dashes used for style.

## Do and do not

Do:

- Build structure with borders, spacing and type scale.
- Use one primary action per screen and keep secondary actions quiet.
- Reuse the components in `client/src/components/ui/` and `client/src/components/data/`; extend them with `className` instead of forking.
- Keep list rows dense: title, one line of meta, status badge, actions.
- Keep form layouts single column inside modals.

Do not:

- Add gradients, glass effects, large shadows, glows or colored cards.
- Add a second font, uppercase labels, or heavy weights.
- Add emoji or icon-only decoration that carries no meaning.
- Use `danger` for anything that is not destructive.
- Introduce a new color without adding it as a token first.
- Add animation longer than 200ms or motion that ignores the reduced-motion block.
- Hardcode text that belongs in the API or a constant.
