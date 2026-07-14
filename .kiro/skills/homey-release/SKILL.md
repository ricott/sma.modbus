---
name: Homey App Release
description: >-
  Cut and publish a new release of the SMA Energy Homey app. Use when the user
  asks to make a new release, bump the version and publish, or ship the app to
  the Homey App Store. Covers version bump, bilingual changelog, validation
  gate, git commit + tag, and the interactive `homey app publish` handoff.
---

# Homey App Release

Release procedure for `sma.modbus`. Follow the steps in order. Do NOT run
`homey app publish` automatically — prepare everything, then hand off (see step 5).

## Inputs to gather first
- **Bump**: `patch` | `minor` | `major` | explicit `X.Y.Z`.
  - `patch` = fixes / performance / reliability, no new user-facing capability
  - `minor` = new capability / device / flow card
  - `major` = breaking change
- **Changelog** text in English *and* Swedish (one or two user-facing sentences).
  Ask the user for both if not given; keep the existing bilingual `en`/`sv`
  pattern. Describe user-visible impact, not internal refactors.

## Step 1 — Pre-flight gate (must pass before bumping)
```
npm test
npm run lint
```
Fix failures before continuing. Lint *warnings* are acceptable; *errors* are not.
Optionally run `npm run test:integration` if the device is reachable.

## Step 2 — Bump version + changelog
Bump the version in the two tracked files: `.homeycompose/app.json` (source of
truth) and `package.json`. `app.json` is **generated and gitignored** — it is
regenerated from `.homeycompose/app.json` by validate/build, so never edit or
commit it.

Preferred — let the CLI handle the manifests + changelog:
```
homey app version <patch|minor|major|X.Y.Z> \
  --changelog.en "<ENGLISH>" \
  --changelog.sv "<SWEDISH>"
```
This updates `.homeycompose/app.json` and regenerates `app.json`. **Caveat:** the
CLI does *not* prepend the changelog entry — it **appends the new `X.Y.Z` block
at the bottom of `.homeychangelog.json` and reformats the file to 2-space
indent**, but this changelog is **newest-first**. After running the command,
move the new entry to the top (right after the opening `{`) and verify with
`node -e "console.log(Object.keys(require('./.homeychangelog.json'))[0])"` (should
print the new version). It also does **not** manage `package.json`, so set its
`version` to the same value manually. Confirm the result with `git diff`.

(If editing by hand instead: bump the version in `.homeycompose/app.json` and
`package.json`, and add the newest-first `{ "en": ..., "sv": ... }` entry to
`.homeychangelog.json`.)

## Step 3 — Validate for publish
```
homey app validate --level publish
```
Must end with: `validated successfully against level 'publish'`.
This also regenerates `app.json` from `.homeycompose/app.json`.

## Step 4 — Commit + tag
Tag convention is **v-prefixed** (e.g. `v2.9.12`). Use an **annotated** tag
(`git tag -a`): a lightweight tag (`git tag <name>`) is NOT carried by
`git push --follow-tags` and would have to be pushed separately. The default
branch is **`master`**.

Review `git status` first, then stage the release files explicitly (avoid blind
`git add -A`; do NOT stage `app.json` — it is gitignored):
```
git add .homeycompose/app.json package.json .homeychangelog.json
# add any remaining source files that belong to this release
git commit -m "chore(release): v<X.Y.Z>"
git tag -a v<X.Y.Z> -m "v<X.Y.Z>"
git push origin master --follow-tags
```
Then confirm the tag reached the remote:
```
git ls-remote --tags origin | grep v<X.Y.Z>
```
If it is missing (e.g. a lightweight tag was created by mistake), push it
explicitly with `git push origin v<X.Y.Z>`.

Shortcut: `homey app version <next> --changelog.* --commit` does the bump +
changelog + commit + tag in one step, but it runs *before* validation and does
not touch `package.json`, so the explicit flow above is preferred.

## Step 5 — Publish (interactive; user runs this)
`homey app publish` has **no flags** to skip its prompts (CLI v4.4.0), and an
automated shell cannot answer them. Do not attempt to run it non-interactively.
Tell the user to run it in their terminal:
```
homey app publish
```
Expected prompts:
- "Update version?" → **No** (already bumped in step 2).
- Verify/confirm the changelog.
- Final confirmation to upload → **Yes**.
Requires `homey login`. Publishing submits the build for store certification —
treat it as a high-impact action and only proceed on the user's explicit go-ahead.

## Notes
- `test/` and `eslint.config.js` are excluded from the published bundle via
  `.homeyignore`.
- Releases before `v2.9.12` were not git-tagged; annotated tagging starts at
  `v2.9.12`.
