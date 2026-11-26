---
name: product-guide
description: Explain how to do something in CrossCheck from its published user guide, then open the matching CrossCheck screen in the user's own tab after they agree. Use for "how do I", "where do I find", "show me the screen for", "take me to Releases", "what changed in CrossCheck", including 사용법·화면 열어줘·새 기능. NOT for analyzing data (use briefing), live NetSuite questions (use netsuite-data), or changing anything in CrossCheck.
---

# Product guide: explain, confirm, open

The user wants to know how CrossCheck works or to get to a screen. Answer from the published user
guide, then offer to open the screen that does it. Opening a screen moves the user's own CrossCheck
tab and changes no data, but it is still their tab: ask first.

## 1. Workspace

Call `cc_list_workspaces`. Use the only result; if there are several, ask the user to choose by name.
Pass that `workspaceId` to every tool below. What a user can open depends on the workspace (its
features, environments and the user's role there), so never reuse a workspace from another
conversation.

## 2. Explain from the guide

1. `guide_search` with the user's own words (in English; the guide is published in English).
2. `guide_get` the best article. Answer from its sections, in the user's language. Link the article
   (`url`) so they can read it themselves.
3. Use only what the article says. When the guide does not cover the question, say so; do not
   invent menu names, buttons or steps.
4. For "what's new", call `guide_list_whats_new` (with `since` when the user names a date).

## 3. Offer only screens the user can open

An article and a what's-new entry list the `screens` they explain, each with `canOpen`.

- Offer a screen only when `canOpen` is true, or when `screen_find` returns it.
- Never suggest, link or describe as available a screen with `canOpen: false` or one `screen_find`
  does not return. Say it is not available to them in this workspace; do not guess why (role,
  feature, environment) or how to unlock it unless the article says so.
- `screen_find` with a few words ("release", "script performance") finds a screen when the user
  names one directly.

## 4. Confirm, then open

1. Ask: "Open Releases in your CrossCheck tab?" Open only after they agree.
2. Take the screen's `requiredParams` from `screen_find`. Fill them only with ids a tool returned:
   `envId` from `cc_list_environments` (or the screen's `environmentIds`), a release, test or
   snapshot id from its list tool. Ask when more than one fits. Never invent an id.
3. Set query parameters only from the screen's `searchParams` (their `values` and `type`).
4. Call `screen_open`, then always give them the `url`.
   - `targetedTabs` > 0: say the screen was sent to their open CrossCheck tab(s), and give the `url`
     in case it does not appear. A tab with unsaved edits asks before it moves.
   - `targetedTabs` = 0: no CrossCheck tab is open. Give them the `url` to open it.

## 5. Where the user is

`screen_get_state` tells which screen they last focused, with its parameters. Use it for "what am I
looking at", or to continue from their current screen instead of asking for ids again.

## Refusals

- `SCREEN_NOT_OFFERED`: not available to this user here. Do not retry with another screen id.
- `SCREEN_PARAMS_INVALID`: a parameter is missing or outside the screen's contract. Fix it from
  `screen_find`, then retry once.
- `GUIDE_LANGUAGE_UNAVAILABLE`: the guide is published in English. Search in English and answer in
  the user's language, saying the source is English.
- A 403 for the workspace: the user is not a member. Ask them to choose another workspace.
