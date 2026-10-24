# Prompt 09 - Bonus points (run only after 08 is green and deployed)

Read prompts/hcm/00-SPEC.md (sections 4.2, 5, 7), knowledge.md and docs/ARCHITECTURE.md. Do the three parts in order and stop after each if time is short. Follow section 0 of the spec. Commit state before starting.

## Part A: camera attendance on the web (face detection + location)
1. In client/ npm install @vladmandic/face-api. Add scripts/copy-face-models.mjs (runs in postinstall and before build) that copies only the tiny face detector model files and their manifest from node_modules/@vladmandic/face-api/model into client/public/models. Do not commit duplicates of the models if the script can recreate them (add client/public/models to .gitignore only if the build runs the copy script on Vercel; otherwise commit them).
2. Component CameraCheckIn (modal opened from CheckInPanel with a "Check in with camera" button next to the normal button): ask for camera permission (front camera, video element, muted, playsInline), load the tiny face detector once, run detection about 5 times per second, show a framed live preview and a status line ("Looking for your face", "One face detected", "More than one face", "No face"); get the location with navigator.geolocation.getCurrentPosition (high accuracy, 10 s timeout) in parallel and show accuracy; the Confirm button enables only after one face has been seen steadily for 1 second and a location is available. On confirm send POST /attendance/check-in with { source: "camera", faceCount: 1, lat, lng, accuracy }; show the server's 422 reasons in plain words (outside the office area with the distance, accuracy too low, office location not set, face not detected). Always stop all camera tracks when the modal closes or the component unmounts. Show a one-line privacy note: "Only the result of the check is saved, no photo." The normal Check in button keeps working for people without a camera or location.
3. The attendance calendar and board show a small camera mark text label "Camera" in the source column or tooltip (no emoji).
4. Verify: build passes; with the browser's fake media device flags or a stubbed detector run the flow; check that denial of the camera or location shows a clear message and falls back to the normal check-in; the server rejects faceCount 2, accuracy 150, a location outside the radius and a missing office location (use the API directly); distance and source are stored.

## Part B: absence anomaly flags
Add analyticsService.absenceFlags(range, departmentId) returning employees with (a) three or more absent days in the range, or (b) an absence directly before or after a weekend or holiday at least twice, each with the reason text. Show it on the HR dashboard as "Attention list" (name, department, reason, count) and add it to the dashboard payload (spec section 5, hr) and to the AI tool get_attendance_summary output as absenceFlags. Unit test the pure rule and check the numbers against a scripted dataset.

## Part C: dark mode
Follow prompts/dark-mode.md if it exists in the repo; otherwise: Tailwind darkMode "class", a second set of CSS variable tokens under .dark with contrast of at least 4.5:1, an inline script in index.html that applies the saved or system choice before first paint, a ThemeToggle in the top bar, replace any hardcoded colors with tokens, and check charts, tables, modals, toasts and the assistant panel in both themes at 375 px and 1280 px.

## Report
What was finished, checks run, known issues. Update README bonus table and docs.
