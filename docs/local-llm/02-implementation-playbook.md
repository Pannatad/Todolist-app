# Implementation playbook for a new project

This is the practical order for adding local LLM support while keeping the
system easy to refine. Build the main structure first; add product-specific
actions and visual polish after the provider path is proven.

## Phase 0 — write the boundary before code

Decide and record:

- where the app server runs;
- where LM Studio runs;
- whether the client can be reached from another device;
- what data may leave the machine (for local mode, ideally none);
- which operations are read-only and which mutate user data;
- what the model is allowed to return;
- what must happen when the model is offline.

The baseline decision should be:

```text
client -> app server -> loopback LM Studio
```

Avoid a browser-to-LM-Studio design. It breaks on phones, exposes a model
endpoint unnecessarily, and makes it harder to enforce application policy.

## Phase 1 — define a provider-neutral client

Create one browser-side interface that can later point at local or cloud
providers:

```js
const model = createGenerativeModel({
  provider: 'lmstudio',
  fallbackToGemini: false,
  systemInstruction,
  responseFormat,
  enableThinking: false,
});

const chat = model.startChat({ history, generationConfig });
const result = await chat.sendMessage(message);
const text = result.response.text();
```

The UI should not know whether the provider uses Gemini-shaped, OpenAI-shaped,
or another wire format. It should only know the app's stable client contract.

Minimum client operations:

- `generateContent(contents)`;
- `startChat({ history, generationConfig })`;
- `sendMessage(message)`;
- `sendMessageStream(message, { onText, signal })`;
- `getAIHealth(provider)`.

## Phase 2 — build the app-server gateway

Add a single gateway with these routes:

```text
GET  /api/ai/health
POST /api/ai/generate
POST /api/ai/chat
POST /api/ai/stream
```

The gateway should:

1. reject unsupported paths and methods;
2. parse JSON with a hard body-size limit;
3. choose the provider from the request/environment;
4. translate the provider-neutral request into the selected provider's format;
5. return one normalized error shape;
6. stream only through the streaming route;
7. propagate request cancellation.

Keep provider-specific code in separate adapters. In this project,
`server/aiGateway.js` owns routing/translation and `server/lmStudioClient.js`
owns LM Studio behavior.

## Phase 3 — make LM Studio health observable

Implement health before chat UI:

```js
const health = await getAIHealth('local');

// Render one of:
// ready       -> model can be used
// needs_model -> server responds but a usable model is absent
// offline     -> server/model endpoint is unreachable
```

Health should list models using `/v1/models`, prefer an explicit
`LM_STUDIO_MODEL`, and fail with a useful message if multiple models exist but
none is selected. Do not silently choose the first unrelated model.

## Phase 4 — add the smallest working chat path

Start with one plain-text request:

1. load a model in LM Studio;
2. call `/api/ai/health`;
3. send one message through `/api/ai/chat`;
4. display the returned text;
5. show an offline error when LM Studio is stopped;
6. verify no request is sent to a cloud provider in local mode.

Only after this path works should you add conversation memory, structured
actions, attachments, or LAN access.

## Phase 5 — add bounded conversation context

Do not send an unbounded transcript on every turn. Use a fixed recent window
and summarize older turns in batches:

```js
const RECENT_MESSAGES_WINDOW = 20;
const SUMMARY_BATCH_SIZE = 10;

// 0–29 messages: keep them verbatim.
// 30 messages: summarize the oldest 10; send the newest 20 verbatim.
// Further growth: add another 10-message batch to the summary.
```

The summary prompt should retain decisions, user facts, unresolved questions,
and preferences, with a hard length target. Cache the summary per conversation
and provider; reset it when the first message or provider changes.

Do not duplicate the entire conversation inside the current state prompt. Send
history as history and app state as current state.

## Phase 6 — split local deterministic handling from model reasoning

Before calling the model, handle predictable read-only queries in code:

```js
const pattern = canHandleLocally(text);
const plan = pattern
  ? generateLocalResponse(pattern, currentContext)
  : await sendChatMessage(text, messages, currentContext, provider);
```

Good local candidates are exact display requests such as “show my schedule” or
“how many pending tasks?”. Do not use local regexes for advice, planning,
recommendations, explanations, or ambiguous language. Those require model
reasoning or clarification.

Local responses and model action responses should share the same plan shape so
the UI has one downstream processing path.

## Phase 7 — add structured actions and routing

Create an action enum and JSON schema before writing executor code. Then define
the routing rule:

```js
const actionMode = shouldUseAgentActionMode(text, {
  hasPendingAction,
  scheduleIntent,
});
```

Use action mode for explicit app commands and pending-action refinements. Keep
questions such as “What should I add?” or “How do I create a task?” in
conversation mode even though they contain action words.

Prompt rules should enforce:

- existing IDs for edits/deletes;
- complete dates/times in the user's timezone;
- one clarifying question for ambiguity;
- no claim that a proposal was already saved;
- direct `info_response` for read-only data questions;
- a smaller `plan_day`/batch action instead of many individual writes when the
  domain benefits from it.

## Phase 8 — put confirmation between model and persistence

The controller should separate display-only actions from executable actions:

```js
const displayOnly = ['info_response', 'clarify'];
const executable = actions.filter((action) => !displayOnly.includes(action.type));

if (executable.some(requiresConfirmation)) {
  setPendingActions(executable);
} else {
  await executeValidatedActions(executable);
}
```

For a safety-first application, use an explicit confirmation allowlist for all
database-changing actions. Validate again at execution time; never trust that
the model's JSON is safe merely because it matched the outer schema.

The current reference confirmation list covers task, schedule, template, day
plan, and goal writes. When porting it, review every new action type—especially
actions that look small but still mutate data, such as completing a habit or
remembering a note.

## Phase 9 — add streaming and cancellation

Stream only plain conversation responses unless you have a reliable partial
JSON strategy. Update the UI from accumulated text:

```js
onText(fullText) {
  setMessages((current) => replaceStreamingMessage(current, fullText));
}
```

On stop:

- abort the fetch;
- preserve the partial text as a stopped assistant message;
- do not call a buffered fallback request;
- clear the active request reference in `finally`.

## Phase 10 — add attachments and LAN access last

Attachments add size, parsing, privacy, and model capability concerns. LAN
access adds authentication and network trust concerns. Add them only after
plain local chat is stable.

For LAN access, expose the app server—not LM Studio—and require a random token.
Keep the token out of source control and remove it from the URL after the first
request by exchanging it for an HttpOnly cookie.

## Suggested project shape

```text
server/
  aiGateway.js
  lmStudioClient.js
  appServer.js
src/services/
  aiProvider.js
  generativeClient.js
  ConversationService.js
  conversationHistory.js
  agentResponseSchema.js
  agentPrompts.js
  localAgentHandler.js
src/context/chat/
  useChatActions.js
tests/
  lmStudioClient.test.mjs
  aiProvider.test.mjs
  conversationHistory.test.mjs
  localAgentHandler.test.mjs
```

Names can change; keeping the boundaries is the important part.
