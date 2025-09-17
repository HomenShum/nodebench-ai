Convex ProseMirror Component
npm version

This is a Convex Component that syncs a ProseMirror document between clients via a Tiptap extension (that also works with BlockNote).

Add a collaborative editor that syncs to the cloud. With this component, users can edit the same document in multiple tabs or devices, and the changes will be synced to the cloud. The data lives in your Convex database, and can be stored alongside the rest of your app's data.

Just configure your editor features, add this component to your Convex backend, and use the provided sync React hook. Read this Stack post for more details.

Example of editing

Example usage, see below for more details:

function CollaborativeEditor() {
  const sync = useBlockNoteSync(api.prosemirrorSync, "some-id");
  return sync.isLoading ? (
    <p>Loading...</p>
  ) : sync.editor ? (
    <BlockNoteView editor={sync.editor} />
  ) : (
    <button onClick={() => sync.create(EMPTY_DOC)}>Create document</button>
  );
}
For the editor, you can choose to use Tiptap or BlockNote. Go with BlockNote unless you want to customize the editor heavily.

Tiptap is based on ProseMirror and saves you a lot of configuration compared to using the ProseMirror editor directly. It has a rich ecosystem of extensions, and is very customizable.
BlockNote is based on Tiptap and has a nicer UI and experience out of the box, at the cost of being harder to extend and customize for advanced usecases. If you're looking for the easiest way to get all the fancy formatting options, this is it.
Unfortunately, even though they both are based on ProseMirror, the data model differs, so it's not trivial to switch editors later on without migrating all of the data, so you might experiment with both before launching publicly.
Features:

Safely merges changes between clients via operational transformations (OT).
Simple React hook to fetch the initial document and keep it in sync via a Tiptap extension.
Supports both Tiptap and BlockNote.
Server-side entrypoints for authorizing reads, writes, and snapshots.
Create a new document, online or offline.
Debounced snapshots allow new clients to avoid reading the full history.
Deletion API for old snapshots & steps.
Transform the document server-side, enabling easy AI interoperation.
See below for future feature ideas and CONTRIBUTING.md for how to contribute. Found a bug? Feature request? File it here.

Pre-requisite: Convex
You'll need an existing Convex project to use the component. Convex is a hosted backend platform, including a database, serverless functions, and a ton more you can learn about here.

Run npm create convex or follow any of the quickstarts to set one up.

Installation
Install the component package:

npm install @convex-dev/prosemirror-sync
Create a convex.config.ts file in your app's convex/ folder and install the component by calling use:

// convex/convex.config.ts
import { defineApp } from "convex/server";
import prosemirrorSync from "@convex-dev/prosemirror-sync/convex.config";

const app = defineApp();
app.use(prosemirrorSync);

export default app;
Usage
To use the component, you expose the API in a file in your convex/ folder, and use the editor-specific sync React hook, passing in a reference to the API you defined. For this example, we'll create the API in convex/example.ts.

// convex/example.ts
import { components } from "./_generated/api";
import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);
export const {
  getSnapshot,
  submitSnapshot,
  latestVersion,
  getSteps,
  submitSteps,
} = prosemirrorSync.syncApi({
  // ...
});
In your React components, you can then use the editor-specific hook to fetch the document and keep it in sync via a Tiptap extension. Note: This requires a ConvexProvider to be in the component tree.

BlockNote editor
IMPORTANT: BlockNote doesn't currently support <StrictMode> in React 19. If you're using React 19, make sure you remove any <React.StrictMode> blocks and set reactStrictMode: false in your next.config.ts if applicable. docs

// src/MyComponent.tsx
import { useBlockNoteSync } from "@convex-dev/prosemirror-sync/blocknote";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { api } from "../convex/_generated/api";
import { BlockNoteEditor } from "@blocknote/core";

export function MyComponent() {
  const sync = useBlockNoteSync<BlockNoteEditor>(api.example, "some-id");
  return sync.isLoading ? (
    <p>Loading...</p>
  ) : sync.editor ? (
    <BlockNoteView editor={sync.editor} />
  ) : (
    <button onClick={() => sync.create({ type: "doc", content: [] })}>
      Create document
    </button>
  );
}
Tiptap editor
In your React components, you can use the useTiptapSync hook to fetch the initial document and keep it in sync via a Tiptap extension. Note: This requires a ConvexProvider to be in the component tree.

// src/MyComponent.tsx
import { useTiptapSync } from "@convex-dev/prosemirror-sync/tiptap";
import { EditorContent, EditorProvider } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { api } from "../convex/_generated/api";

export function MyComponent() {
  const sync = useTiptapSync(api.example, "some-id");
  return sync.isLoading ? (
    <p>Loading...</p>
  ) : sync.initialContent !== null ? (
    <EditorProvider
      content={sync.initialContent}
      extensions={[StarterKit, sync.extension]}
    >
      <EditorContent editor={null} />
    </EditorProvider>
  ) : (
    <button onClick={() => sync.create({ type: "doc", content: [] })}>
      Create document
    </button>
  );
}
See a working example in example.ts and App.tsx.

Notes
Configuring the snapshot debounce interval
The snapshot debounce interval is set to one second by default. You can specify a different interval with the snapshotDebounceMs option when calling useTiptapSync or useBlockNoteSync.

A snapshot won't be sent until both of these are true:

The document has been idle for the debounce interval.
The current user was the last to make a change.
There can be races, but since each client will submit the snapshot for their own change, they won't conflict with each other and are safe to apply.

Creating a new document
You can create a new document from the client by calling sync.create(content), or on the server by calling prosemirrorSync.create(ctx, id, content).

The content should be a JSON object matching the Schema. If you're using BlockNote, it needs to be the ProseMirror JSON representation of the BlockNote blocks. Look at the value stored in the snapshots table in your database for an example. Both can use this value: { type: "doc", content: [] }

For client-side document creation:

While it's safest to wait until the server confirms the document doesn't exist yet (!sync.isLoading), you can choose to call it while offline with a newly created ID to start editing a new document before you reconnect.
When the client next connects and syncs the document, it will submit the initial version and all local changes as steps.
If multiple clients create the same document, it will fail if they submit different initial content.
Note: if you don't open that document while online, it won't sync.
Transforming the document server-side
You can transform the document server-side. It will give you the latest version of the document, and you return a ProseMirror Transform.

You can make this transoform via new Transform(doc) or, if you are hydrating a full EditorState, you can use Editor.create({doc}).tr to create a new Transaction (which is a subclass of Transform).

For example:

import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

export const transformExample = action({
  args: {
    id: v.string(),
  },
  handler: async (ctx, { id }) => {
    const schema = getSchema(extensions);
    await prosemirrorSync.transform(ctx, id, schema, (doc) => {
      const tr = EditorState.create({ doc }).tr;
      tr.insertText("Hello, world!", 0);
      return tr;
    });
  },
});
The extensions should be the same as the ones used by your client editor, for any extensions that affect the schema (not the sync extension).
The transform function can be called multiple times if the document is being modified concurrently. Ideally this callback doesn't do any slow operations internally. Instead, do them beforehand.
The doc may differ from the one returned from getDoc. You can compare the version returned from getDoc to the second argument to the transform function to see if the document has changed.
The transform function can return a null value to abort making changes.
If you're passing along a position to insert the text, be aware that changes happening in parallel may cause the position to change. You can pass more stable identifiers, or use the ProseMirror mapping capabilities to map the position between different versions by fetching the steps between the versions fetched with (component).lib.getSteps.
If you're using BlockNote, you'll need to convert the BlockNote blocks between BlockNote blocks and ProseMirror nodes. See blockToNode and nodeToBlock.
import { Transform } from "@tiptap/pm/transform";

// An example of doing slower AI operations beforehand:
const schema = getSchema(extensions);
const { doc, version } = await prosemirrorSync.getDoc(ctx, id, schema);
const content = await generateAIContent(doc);
await prosemirrorSync.transform(ctx, id, schema, (doc, v) => {
  if (v !== version) {
    // Decide what to do if the document changes.
  }
  // An example of using Transform directly.
  const tr = new Transform(doc);
  tr.insert(0, schema.text(content));
  return tr;
});
Future features
Features that could be added later:

Offline editing support: cache the document and local changes in sessionStorage and sync when back online (only for active browser tab).
Also save snapshots (but not local edits) to localStorage so new tabs can see and edit documents offline (but won't see edits from other tabs until they're back online).
Configuration for debouncing syncing steps (to reduce function calls).
Option to write the concrete value each time a delta is submitted.
Pluggable storage for ReactNative, assuming single-session.
Warning when closing tab with unsynced changes (works by default?).
Convert it to a ProseMirror plugin instead of a Tiptap extension, so raw ProseMirror usecases can also use it.
Handling edge cases, such as old clients with local changes on top of an older version of the document where the steps necessary for them to rebase their changes have since been vacuumed.
Type parameter for the document ID for more type safety for folks using Convex IDs as their document IDs. This is available on the server but not browser.
Drop clientIds entirely and just use two UUIDs locally to differentiate our changes from server-applied changes.
Add an optional authorId to the data model to track who made which changes.
Missing features that aren't currently planned:

Supporting documents larger than 1 Megabyte.
Offline support that syncs changes between browser tabs or peer-to-peer.
Syncing Yjs documents instead of ProseMirror steps. That would be done by a different Yjs-specific component.
Syncing presence (e.g. showing other users' names and cursor in the UI). This is another thing a Yjs-oriented ProseMirror component could tackle.
Callback to confirm rebases and handle failures in the client (during sync).
Optimization to sync a snapshot instead of many deltas when an old client reconnects and doesn't have local changes.
Handling multiple AsyncStorage instances that are restored from the same cloud backup, leading to multiple clients with the same clientID. For now, we'll assume that AsyncStorage is only used by one client at a time.

Example.ts:
"""
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { action, internalMutation, mutation } from "./_generated/server";
import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";
import { getSchema } from "@tiptap/core";
import { Transform, Step } from "@tiptap/pm/transform";
import { EditorState } from "@tiptap/pm/state";
import { extensions } from "../src/extensions";
import { Schema } from "@tiptap/pm/model";
import { BlockNoteEditor } from "@blocknote/core";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);
export const {
  getSnapshot,
  submitSnapshot,
  latestVersion,
  getSteps,
  submitSteps,
} = prosemirrorSync.syncApi({
  checkRead(ctx, id) {
    // const user = await userFromAuth(ctx);
    // ...validate that the user can read this document
  },
  checkWrite(ctx, id) {
    // const user = await userFromAuth(ctx);
    // ...validate that the user can write to this document
  },
  async onSnapshot(ctx, id, snapshot, version) {
    // ...do something with the snapshot, like store a copy in another table,
    // save a text version of the document for text search, or generate
    // embeddings for vector search.
    const snapshotJSON = JSON.parse(snapshot);
    let schema: Schema;
    // A hack for our demo which uses both BlockNote and Tiptap.
    if (id.endsWith("-blocknote")) {
      // Parse the snapshot from BlockNote.
      const editor = BlockNoteEditor.create({ _headless: true });
      schema = editor.pmSchema;
    } else {
      // Fetching the content from Tiptap, using your extensions.
      schema = getSchema(extensions);
    }
    const node = schema.nodeFromJSON(snapshotJSON);
    const content = node.textContent;
    await ctx.scheduler.runAfter(0, internal.example.updateDocSearchIndex, {
      id,
      content,
    });
  },
});

async function generateContent(doc: string) {
  return `Overall length: ${doc.length}`;
}

// We keep a text search index on the documents table for easy search.
// But we don't update that full version all the time, for efficiency.
export const updateDocSearchIndex = internalMutation({
  args: { id: v.string(), content: v.string() },
  handler: async (ctx, { id, content }) => {
    const existing = await ctx.db
      .query("documents")
      .withIndex("docId", (q) => q.eq("docId", id))
      .unique();
    if (!existing) {
      await ctx.db.insert("documents", { docId: id, content });
    } else {
      await ctx.db.patch(existing._id, { content });
    }
  },
});

// This is an example of how to modify a document using the transform fn.
export const transformExample = action({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const schema = getSchema(extensions);
    const { doc, version } = await prosemirrorSync.getDoc(ctx, id, schema);
    const newContent = await generateContent(doc.textContent);
    const node = await prosemirrorSync.transform(ctx, id, schema, (doc, v) => {
      if (v !== version) {
        // If we wanted to avoid making changes, we could return null here.
        // Or we could rebase our changes on top of the new document.
      }
      const tr = EditorState.create({ doc }).tr;
      return tr.insertText(newContent, 0);
    });
    await ctx.scheduler.runAfter(0, internal.example.updateDocSearchIndex, {
      id,
      content: node.textContent,
    });
  },
});

// This is an example of how to manually transform the document.
export const manualTransform = mutation({
  args: {
    id: v.string(),
    text: v.string(),
  },
  handler: async (ctx, { id, text }) => {
    const snapshot = await ctx.runQuery(
      components.prosemirrorSync.lib.getSnapshot,
      {
        id,
      }
    );
    if (!snapshot.content) {
      throw new Error("Document not found");
    }
    const content = JSON.parse(snapshot.content);
    const schema = getSchema(extensions);
    const serverVersion = new Transform(schema.nodeFromJSON(content));
    const stepsResult = await ctx.runQuery(
      components.prosemirrorSync.lib.getSteps,
      { id, version: snapshot.version }
    );
    if (stepsResult.steps.length > 0) {
      for (const step of stepsResult.steps) {
        serverVersion.step(Step.fromJSON(schema, JSON.parse(step)));
      }
    }
    let version = stepsResult.version;
    while (true) {
      const tr = new Transform(serverVersion.doc);
      tr.insert(0, schema.text(text));

      const result = await ctx.runMutation(
        components.prosemirrorSync.lib.submitSteps,
        {
          id,
          clientId: "server function",
          version,
          steps: tr.steps.map((step) => JSON.stringify(step.toJSON())),
        }
      );
      if (result.status === "synced") {
        await ctx.runMutation(components.prosemirrorSync.lib.submitSnapshot, {
          id,
          version: version + tr.steps.length,
          content: JSON.stringify(tr.doc.toJSON()),
        });
        return tr.doc.toJSON();
      }
      for (const step of result.steps) {
        serverVersion.step(Step.fromJSON(schema, JSON.parse(step)));
      }
      version += result.steps.length;
    }
  },
});
"""

App.tsx:
"""
import "./App.css";

import { TipTapExample } from "./TiptapExample";
import { BlockNoteExample } from "./BlockNoteExample";

function App(props: { id: string }) {
  const useBlockNote = props.id.startsWith("blocknote");
  const editor = useBlockNote ? "BlockNote" : "Tiptap";
  return (
    <>
      <h1>ProseMirror + Convex Sync</h1>
      <div>
        This demonstrates syncing a ProseMirror document using Convex to provide
        real-time collaborative editing.
        <br />
        It uses Tiptap or BlockNote for the in-browser editing and support for
        inline Markdown formatting, similar to Notion.
        <br />
        Share this URL to edit the same document, or test co-editing by opening
        multiple tabs with the same URL.
        <br />
        The URL hash is the document ID. For demo purposes, it uses BlockNote if
        the ID starts with "blocknote", otherwise it uses Tiptap.
        <br />
      </div>
      <div className="card">
        <strong>{editor}</strong>
        {useBlockNote ? (
          <BlockNoteExample id={props.id + "-blocknote"} />
        ) : (
          <TipTapExample id={props.id + "-tiptap"} />
        )}
      </div>
      <footer>
        <p className="read-the-docs">
          Powered by {editor} (ProseMirror) + Convex + Vite + React + TypeScript
        </p>
        <a
          href="https://github.com/get-convex/prosemirror-sync"
          className="github-button"
        >
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
          Check it out on GitHub
        </a>
      </footer>
    </>
  );
}

export default App;
"""