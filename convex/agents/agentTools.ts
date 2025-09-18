// convex/agents/agentTools.ts
// Unified catalog of agent tools for OpenAI Chat Completions
// Each tool follows the OpenAI "tools" format: { type: "function", function: { name, description, parameters, strict } }

export const agentToolsOpenAI = [
  // Multi‑step planning (generic)
  {
    type: "function",
    function: {
      name: "execute_multi_step_research_plan",
      description:
        "Preferred for multi-step requests. Decompose the user request into tasks and call once with the full plan.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            description: "Sequential tasks to execute",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["person_research", "company_research", "note_organization"] },
                query: { type: "string" },
                details: { type: "object", properties: {}, additionalProperties: false, nullable: true },
              },
              required: ["type", "query", "details"],
              additionalProperties: false,
            },
          },
        },
        required: ["tasks"],
        additionalProperties: false,
      },
      strict: true,
    },
  },

  // Document tools (mapped from prior agent capabilities)
  {
    type: "function",
    function: {
      name: "create_document",
      description: "Create a new document with optional title and content.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the document" },
          content: { type: "string", description: "Initial markdown or text content", nullable: true },
        },
        required: ["title"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "open_document",
      description: "Open a document by ID or exact title.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "Document ID", nullable: true },
          title: { type: "string", description: "Exact document title (used if id not provided)", nullable: true },
        },
        required: [],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "edit_doc",
      description: "Insert provided markdown as a new block in a document (by id or title).",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", nullable: true },
          title: { type: "string", nullable: true },
          markdown: { type: "string" },
          parent_node_id: { type: "string", nullable: true },
        },
        required: ["markdown"],
        additionalProperties: false,
      },
      strict: true,
    },
  },

  // CSV Lead Workflow (migrated from backend action to agent tool interface)
  {
    type: "function",
    function: {
      name: "run_csv_lead_workflow",
      description:
        "Run the CSV AI lead scoring workflow on a specific CSV file. Produces a scored CSV and outreach messages.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "string", description: "The CSV fileId to process" },
          max_rows: { type: "integer", description: "Optional cap on processed rows (default 50)", nullable: true },
        },
        required: ["file_id"],
        additionalProperties: false,
      },
      strict: true,
    },
  },

  // AAPL model quick generator (kept as a tool; previously a Convex action)
  {
    type: "function",
    function: {
      name: "compile_aapl_model",
      description: "Generate a 5-year AAPL model as CSV and a memo (markdown).",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      strict: true,
    },
  },

  // Direct answer tool (lightweight)
  {
    type: "function",
    function: {
      name: "execute_direct_request",
      description: "Execute a direct, concise response to the user's query under the current node.",
      parameters: {
        type: "object",
        properties: {
          user_query: { type: "string" },
          parent_node_id: { type: "string" },
        },
        required: ["user_query", "parent_node_id"],
        additionalProperties: false,
      },
      strict: true,
    },
  },

  // Summarize document
  {
    type: "function",
    function: {
      name: "summarize_document",
      description: "Summarize a document (by id or title) into bullets or an abstract.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", nullable: true },
          title: { type: "string", nullable: true },
          style: { type: "string", enum: ["bullets", "abstract"], nullable: true },
          max_words: { type: "integer", nullable: true },
        },
        required: [],
        additionalProperties: false,
      },
      strict: true,
    },
  },

  // Node/document management
  {
    type: "function",
    function: {
      name: "update_node",
      description: "Update a node's markdown by node_id.",
      parameters: {
        type: "object",
        properties: { node_id: { type: "string" }, markdown: { type: "string" } },
        required: ["node_id", "markdown"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "archive_node",
      description: "Archive a node by id.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "update_document",
      description: "Update a document's title (by id or title).",
      parameters: {
        type: "object",
        properties: { document_id: { type: "string", nullable: true }, title: { type: "string", nullable: true } },
        required: [],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "archive_document",
      description: "Archive a document by id.",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
      strict: true,
    },
  },

  // Discovery
  {
    type: "function",
    function: {
      name: "find_documents",
      description: "Search for documents by a query string.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
      strict: true,
    },
  },

  // RAG operations
  {
    type: "function",
    function: {
      name: "rag_ask",
      description: "Ask a question against the RAG index/context.",
      parameters: { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "rag_add_context",
      description: "Add context text into the RAG index with a title.",
      parameters: { type: "object", properties: { title: { type: "string" }, text: { type: "string" } }, required: ["title", "text"], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "rag_ingest_document",
      description: "Ingest a document into the RAG system by id or title.",
      parameters: { type: "object", properties: { document_id: { type: "string", nullable: true }, title: { type: "string", nullable: true } }, required: [], additionalProperties: false },
      strict: true,
    },
  },

  // Utilities
  {
    type: "function",
    function: {
      name: "apply_spreadsheet_ops",
      description: "Apply structured operations to a spreadsheet by sheet_id.",
      parameters: {
        type: "object",
        properties: {
          sheet_id: { type: "string" },
          operations: { type: "array", items: { type: "object", properties: {}, additionalProperties: true } },
        },
        required: ["sheet_id", "operations"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email with subject and body.",
      parameters: {
        type: "object",
        properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } },
        required: ["to", "subject", "body"],
        additionalProperties: false,
      },
      strict: true,
    },
  },

  // Structured editing primitives
  {
    type: "function",
    function: {
      name: "update_at_position",
      description: "Apply a markdown update at a tree position.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", nullable: true },
          title: { type: "string", nullable: true },
          root_id: { type: "string" },
          path: { type: "array", items: { type: "integer" }, nullable: true },
          markdown: { type: "string", nullable: true },
        },
        required: ["root_id"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "propose_update_at_position",
      description: "Draft a proposed update at a position without immediate commit.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", nullable: true },
          title: { type: "string", nullable: true },
          root_id: { type: "string" },
          path: { type: "array", items: { type: "integer" }, nullable: true },
          markdown: { type: "string", nullable: true },
        },
        required: ["root_id"],
        additionalProperties: false,
      },
      strict: true,
    },
  },

  // Streaming-friendly readers
  {
    type: "function",
    function: {
      name: "read_first_chunk",
      description: "Read the first chunk of a document for streaming consumption.",
      parameters: { type: "object", properties: { document_id: { type: "string", nullable: true }, title: { type: "string", nullable: true }, max_chars: { type: "integer", nullable: true } }, required: [], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "read_next_chunk",
      description: "Read the next chunk after a cursor.",
      parameters: { type: "object", properties: { document_id: { type: "string", nullable: true }, title: { type: "string", nullable: true }, cursor: { type: "string" }, max_chars: { type: "integer", nullable: true } }, required: ["cursor"], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "read_previous_chunk",
      description: "Read the previous chunk before a cursor.",
      parameters: { type: "object", properties: { document_id: { type: "string", nullable: true }, title: { type: "string", nullable: true }, cursor: { type: "string" }, max_chars: { type: "integer", nullable: true } }, required: ["cursor"], additionalProperties: false },
      strict: true,
    },
  },

  // Diff + replace helpers
  {
    type: "function",
    function: {
      name: "apply_diff",
      description: "Apply a list of diffs to a document.",
      parameters: { type: "object", properties: { document_id: { type: "string", nullable: true }, title: { type: "string", nullable: true }, diffs: { type: "array", items: { type: "object", properties: {}, additionalProperties: true } } }, required: ["diffs"], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "replace_document",
      description: "Replace the full content of a document.",
      parameters: { type: "object", properties: { document_id: { type: "string", nullable: true }, title: { type: "string", nullable: true }, content: { type: "string" } }, required: ["content"], additionalProperties: false },
      strict: true,
    },
  },

  // Planning and session tools
  {
    type: "function",
    function: {
      name: "plan",
      description: "Provide a short, executable plan (array of steps).",
      parameters: { type: "object", properties: { steps: { type: "array", items: { type: "string" } } }, required: ["steps"], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "ask_user",
      description: "Ask the user a clarifying question and wait for input.",
      parameters: { type: "object", properties: { question: { type: "string" } }, required: ["question"], additionalProperties: false },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "finish_with_summary",
      description: "Must be called to end the session with a final summary.",
      parameters: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"], additionalProperties: false },
      strict: true,
    },
  },
] as const;

