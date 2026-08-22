# Architecture and technical contracts

## 1. Component responsibilities

Keep the main structure small and explicit. Each layer should have one job.

| Layer | Responsibility |
| --- | --- |
| Chat UI | Collect text/attachments, show health and streamed text, expose stop/confirm/cancel controls. |
| Chat controller | Build current app context, choose local deterministic handling or model handling, process returned actions. |
| Provider-neutral client | POST to `/api/ai/generate`, `/api/ai/chat`, or `/api/ai/stream`; parse JSON/NDJSON; expose cancellation. |
| App-server gateway | Authenticate at the app boundary, validate body size, route provider, translate message format, normalize errors. |
| LM Studio adapter | Resolve the model, call `/v1/models` and `/v1/chat/completions`, apply generation/reasoning settings, parse streaming. |
| Application action executor | Validate IDs and parameters, show confirmation, then call the real repositories/services. |
| LM Studio | Serve the selected local model over its OpenAI-compatible local API. |

The model must not own persistence. It can return an action proposal, but only
the application executor can change tasks, schedules, habits, goals, or other
user data.

## 2. End-to-end request flow

```text
sendMessage()
  |
  +-- deterministic read-only pattern? --> localAgentHandler
  |                                           |
  |                                           +--> local response; no model call
  |
  +-- otherwise --> ConversationService
                    |
                    +--> conversation mode or action mode
                    +--> bounded history + current context
                    +--> provider-neutral client
                              |
                              +--> POST /api/ai/chat
                              |       or /api/ai/stream
                              v
                        app-server gateway
                              |
                              +--> Gemini/Ollama/other provider
                              +--> LM Studio adapter
                                        |
                                        +--> GET /v1/models
                                        +--> POST /v1/chat/completions
```

After a response returns:

```text
model text / JSON
      |
      +--> conversation response --> render as plain text
      |
      +--> structured plan
              |
              +--> info_response / clarify --> display only
              +--> mutation --> pending confirmation
                                  |
                                  +--> confirm --> validated executor
                                  +--> cancel  --> discard proposal
```

## 3. Provider-neutral HTTP contract

The browser should only know the app API, not the LM Studio API.

### Health

```http
GET /api/ai/health?provider=local
```

Example response:

```json
{
  "status": "ready",
  "reachable": true,
  "baseUrl": "http://127.0.0.1:1234/v1",
  "model": "google/gemma-4-26b-a4b-qat",
  "modelCount": 1,
  "message": "Ready to use google/gemma-4-26b-a4b-qat."
}
```

Useful statuses are `ready`, `needs_model`, and `offline`. A health check must
not make a generation request or load the model just to prove that the server
is alive.

### Non-streaming generation/chat

```http
POST /api/ai/chat
Content-Type: application/json
```

```json
{
  "provider": "lmstudio",
  "fallbackToGemini": false,
  "systemInstruction": "...",
  "responseFormat": { "type": "json_schema", "json_schema": {} },
  "enableThinking": false,
  "history": [
    { "role": "user", "parts": [{ "text": "Hello" }] },
    { "role": "model", "parts": [{ "text": "Hi" }] }
  ],
  "message": "What is next?",
  "generationConfig": {
    "temperature": 0.5,
    "topP": 0.9,
    "topK": 40,
    "maxOutputTokens": 2048
  }
}
```

The gateway translates the Gemini-shaped history into OpenAI-shaped messages:

```json
{
  "model": "google/gemma-4-26b-a4b-qat",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi" },
    { "role": "user", "content": "What is next?" }
  ],
  "temperature": 0.5,
  "top_p": 0.9,
  "top_k": 40,
  "presence_penalty": 1.5,
  "max_tokens": 2048,
  "stream": false,
  "enable_thinking": false,
  "chat_template_kwargs": {
    "enable_thinking": false,
    "preserve_thinking": false
  },
  "reasoning_effort": "none",
  "reasoning_tokens": 0
}
```

The exact generation defaults belong in the adapter, not scattered across UI
components.

### Streaming

```http
POST /api/ai/stream
Content-Type: application/json
```

The gateway returns newline-delimited JSON, not browser-facing raw SSE:

```text
{"type":"delta","text":"Hello"}
{"type":"delta","text":" world"}
{"type":"usage","usage":{"total_tokens":12}}
{"type":"done"}
```

On failure after headers have been sent:

```text
{"type":"error","error":"LM Studio timed out after 120 seconds."}
```

Use an `AbortController` end-to-end. The browser aborts the fetch, the app
server observes the request abort, and the LM Studio adapter aborts its fetch.
Do not start a second buffered request after a user-initiated stop.

## 4. LM Studio adapter contract

The adapter should provide four operations:

1. `listModels()` — call `${BASE_URL}/models` with a short health timeout.
2. `resolveModel()` — use an explicit environment model first, then a safe
   preferred-model rule, then a single discovered model; fail if selection is
   ambiguous.
3. `complete()` — call `${BASE_URL}/chat/completions` with `stream: false`.
4. `stream()` — call the same endpoint with `stream: true` and parse `data:`
   packets until `[DONE]`.

The reference adapter also:

- validates that the base URL is `http` or `https`;
- clamps request timeouts to 1–600 seconds;
- adds `Authorization: Bearer ...` only when a local API key is configured;
- treats empty final content as an error;
- accepts `reasoning_content` only when a response schema was explicitly
  requested and the value parses as valid JSON;
- never exposes free-form private reasoning as the user-facing answer.

That last rule is important for models that put the answer in a reasoning field
when structured output is enabled. A fallback parser must be narrow, not a
general “show whatever the model returned” path.

## 5. Conversation and action modes

Use two model contracts:

### Conversation mode

- plain text answer;
- streamed when possible;
- no action JSON required;
- app state is included only when the message refers to it;
- accidental JSON is unwrapped into its `info_response`/summary text.

### Action mode

- strict JSON schema;
- no streaming requirement, because complete JSON is easier to validate;
- current app state is included;
- only known action types are accepted;
- mutations are proposals until UI confirmation.

The reference routing rules distinguish a command such as “Add a task to buy
milk tomorrow” from an explanatory question such as “How do I create a task?”
Do not route by keyword alone: interrogative openers and app-context references
must be considered together.

## 6. Structured action contract

Keep the schema small, explicit, and versioned with the application:

```json
{
  "actions": [
    {
      "type": "add_task",
      "params": {
        "title": "Buy milk",
        "deadline": "2026-08-21T18:00:00"
      },
      "explanation": "The user explicitly asked to add this task."
    }
  ],
  "summary": "Prepared one task for confirmation."
}
```

Required top-level fields are `actions` and `summary`; each action requires
`type`, `params`, and `explanation`. `type` must be an enum. Unknown fields at
the action level should be rejected, while `params` may be open inside the
application's own per-action validator.

For schedule-like domains, include complete local date/time values, existing
record IDs for edits/deletes, and an explicit distinction between modifying a
recurring series and overriding one occurrence.

## 7. Attachments

Process files before they reach the provider:

- images: validate type and size, resize to a bounded dimension, convert to a
  predictable MIME type, then send as a multimodal image part;
- PDFs: extract text locally, cap page count and characters, send text rather
  than raw PDF bytes;
- scanned PDFs: reject clearly or add a separately designed OCR path;
- persist metadata only, not base64 image data or extracted document text.

The current reference limits are PNG/JPEG/WebP images up to 6 MB before
processing, 1600 px maximum dimension, PDFs up to 10 MB, 30 pages, and 50,000
extracted characters. Treat these as starting values, not universal constants.
