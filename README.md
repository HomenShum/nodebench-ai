# Collaborative Text Editor with Notion-like Features

[![Watch the demo](https://img.youtube.com/vi/XRYUUDNh4GQ/hqdefault.jpg)](https://www.youtube.com/watch?v=XRYUUDNh4GQ)

This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.

This project is connected to the Convex deployment named [`formal-shepherd-851`](https://dashboard.convex.dev/d/formal-shepherd-851).

## Project structure

The frontend code is in the `src` directory and is built with [Vite](https://vitejs.dev/) and React.

The backend code is in the `convex` directory.

`npm run dev` will start the frontend and backend servers.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.


## Changelog (preview)

- 2025-09-18 — Chat input now supports multi-line entry and preserves list/nested list structure on paste; Convex agent fixes: remove write conflicts on appendRunEvent, await streaming event writes, fix propose_pm_ops schema (array items), and require kind in streamed plan steps. No new dependencies added.
- 2025-09-17 — Analyze with Gemini → Quick notes; header tags (AI-generated, colored by kind, inline rename, ghost add pill); new backend tag mutations. See full details and screenshots in the [CHANGELOG](./CHANGELOG.md).

Optional thumbnail preview:

![AI analysis → Quick note + AI-tagged header](./updated_screenshot/091725_ai_file_analysis_quick_note_ai_tagged.png)
