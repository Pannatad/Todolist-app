# Local LLM with LM Studio

Reusable notes for adding a local language model to a web application. These
docs are extracted from the working Todolist implementation, but the design is
intended to be copied into another project and adapted at the application
boundary.

## High-level understanding

The browser does not talk to LM Studio directly. The browser talks to the
application's own `/api/ai` gateway, and the gateway talks to LM Studio on the
same Mac:

```text
Browser / phone
      |
      v
Application server: auth, provider routing, request limits, streaming
      |
      v
LM Studio: http://127.0.0.1:1234/v1/chat/completions
      |
      v
Local model: Gemma 4 26B A4B QAT (current reference default)
```

This boundary solves three problems at once:

- the client does not need to know the local model's address or protocol;
- a phone can use the model through the Mac without treating phone
  `localhost` as the Mac;
- authentication, limits, error handling, provider selection, and action
  safety stay in application code.

## Intuition

Think of LM Studio as a private inference appliance. The app server is the
front desk: it decides whether a request is local, translates the request into
the model's protocol, streams the answer back, and refuses unsafe or malformed
requests. The model should generate a proposal or answer; application code
should decide what is actually saved.

## Documentation map

- [Architecture and contracts](./01-architecture.md) — components, request
  flow, provider adapter, history, streaming, and action schema.
- [Implementation playbook](./02-implementation-playbook.md) — a staged
  process for adding the system to a new project.
- [Operations and troubleshooting](./03-operations.md) — LM Studio setup,
  environment variables, local/LAN startup, performance, and failures.
- [Safety and validation](./04-safety-and-validation.md) — privacy boundary,
  confirmation rules, test strategy, and release checklist.
- [Current project quick start](../LOCAL_LLM_PHASE_1.md) — the short setup note
  for this repository.

## The reusable sequence

1. Decide the trust boundary and keep the model server loopback-only.
2. Define one provider-neutral client contract.
3. Add an app-server gateway and a dedicated LM Studio adapter.
4. Add health checks and explicit offline errors before adding chat UI.
5. Add conversation history with bounded context.
6. Separate plain conversation from structured app actions.
7. Make every mutation an explicit, validated proposal that the UI confirms.
8. Add streaming, cancellation, attachments, and LAN access one at a time.
9. Test the provider adapter, gateway, routing, history, and confirmation
   boundary independently.

## Reference implementation locations

These are the source files from which the reusable design was derived:

| Concern | Reference file |
| --- | --- |
| LM Studio HTTP client | `server/lmStudioClient.js` |
| Provider gateway and protocol translation | `server/aiGateway.js` |
| Local app server and optional LAN auth | `server/appServer.js` |
| Browser-side provider adapter | `src/services/generativeClient.js` |
| Provider names and options | `src/services/aiProvider.js` |
| Conversation window and summaries | `src/services/ConversationService.js`, `src/services/conversationHistory.js` |
| Deterministic local replies | `src/services/localAgentHandler.js` |
| Action schema and action/conversation routing | `src/services/agentResponseSchema.js` |
| Prompt guardrails | `src/services/agentPrompts.js` |
| Confirmation and execution boundary | `src/context/chat/useChatActions.js` |
| Provider/adapter tests | `tests/lmStudioClient.test.mjs`, `tests/aiProvider.test.mjs` |

## What must be adapted per project

Do not copy these values blindly:

- model ID and context length;
- app state included in prompts;
- supported action types and their parameter schemas;
- which actions require confirmation;
- attachment support and limits;
- authentication and network topology;
- test commands and deployment script names.

The architecture and safety boundaries are reusable. The model, prompts,
actions, persistence calls, and UI are application-specific.
