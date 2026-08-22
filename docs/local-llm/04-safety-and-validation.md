# Safety, privacy, and validation

Local inference reduces cloud exposure, but it does not make an application
safe automatically. The app server, browser, LAN, prompts, action executor,
and logs still need explicit boundaries.

## Privacy and network boundary

The intended topology is:

```text
LM Studio: 127.0.0.1 only
App server: 127.0.0.1 by default; 0.0.0.0 only with token-protected LAN mode
Phone: connects to the authenticated app server, never to LM Studio
```

Rules:

- never port-forward LM Studio;
- never put provider API keys in browser-exposed `VITE_` variables;
- keep `.env` out of source control;
- do not log full prompts, attachments, base64 data, or private model output;
- treat LAN HTTP as trusted-Wi-Fi testing, not public deployment;
- use a private VPN or designed HTTPS/authenticated deployment for remote use;
- state clearly which provider is active and whether data is leaving the Mac.

For LAN mode, require a random token of at least 16 characters. Accept it once
as a query parameter, exchange it for an HttpOnly, SameSite=Strict cookie, and
remove it from the address. Scope the cookie to the app host and expire it.

## Model output is untrusted input

Apply two validation layers:

1. **Shape validation** — strict top-level JSON schema, known action enum, and
   required fields.
2. **Domain validation** — IDs exist, dates are valid, values are bounded,
   recurrence rules are legal, and the action is allowed for the current user.

Example:

```js
const plan = parseAgainstAgentPlanSchema(rawText);
for (const action of plan.actions) {
  validateActionForDomain(action, currentAppState);
}
```

Never let a successful JSON parse call a repository directly. A valid object
can still request the wrong record, an out-of-range date, or an unsafe bulk
operation.

## Confirmation boundary

Use an explicit policy table rather than “confirm anything that sounds risky”:

| Category | Example | Default |
| --- | --- | --- |
| Display | `info_response`, `clarify` | Render only. |
| Navigation | `navigate` | Execute only if explicitly requested. |
| Create/update/delete | task, schedule, template, goal | Preview and require confirmation. |
| Bulk planning | `plan_day`, `apply_template` | Preview conflicts and require one confirmation. |
| Small state change | complete habit, remember note | Decide explicitly; do not let a new action silently bypass the policy. |

Before confirmation, show the exact target, fields, date/time, recurrence, and
conflicts. After cancellation, discard the proposal and mark any stale pending
message as cancelled. Never say “saved”, “deleted”, or “completed” before the
executor succeeds.

## Prompt guardrails

Prompts should state the application rules plainly:

- use full local date/time values;
- use existing IDs for edits/deletes;
- preserve unchanged fields when refining a pending proposal;
- ask one clear question when ambiguity blocks safe execution;
- answer read-only data requests with display actions;
- do not navigate unless asked;
- do not claim a mutation happened;
- keep advice concise and include a next step only when advice is requested.

Prompts are not the enforcement layer. They reduce bad proposals; code validates
and confirms them.

## Rendering safety

Do not infer a UI card from generated prose. For example, the word “habit” in a
normal explanation must not turn the message into a habit card. Use explicit
metadata from a deterministic action:

```js
{
  type: 'info_response',
  params: {
    message: '...',
    suggestedTab: 'habits'
  }
}
```

The reference UI stores this as an explicit `renderHint` and defaults to plain
text for missing or unknown hints.

## Failure behavior

Design for these cases:

- LM Studio is offline;
- the server is reachable but the model is absent;
- the model ID is wrong or ambiguous;
- the request times out;
- the model returns empty content;
- streamed content ends with an error;
- the user stops a response;
- action JSON is malformed;
- action JSON is shaped correctly but fails domain validation;
- an attachment exceeds limits or has no extractable text.

Local mode should show a local-model error and stop. It should not silently
fall back to Gemini or Ollama unless the user explicitly chose a fallback
policy and the UI makes that provider change visible.

## Validation strategy

Test the seams, not only the happy-path UI:

### Adapter tests

- base URL validation;
- timeout and unreachable-server errors;
- model discovery and exact model selection;
- request-body generation settings;
- optional local API key header;
- non-streaming content extraction;
- empty-answer rejection;
- schema-constrained JSON recovery from `reasoning_content`;
- streaming deltas, usage, `[DONE]`, timeout, and cancellation.

### Gateway tests

- route/method handling;
- request-size limit;
- Gemini-shaped to OpenAI-shaped message conversion;
- image conversion and PDF rejection at the provider boundary;
- normalized JSON and NDJSON errors.

### Application tests

- local deterministic patterns and exclusions;
- conversation/action mode routing;
- bounded history and summary batching;
- explicit render hints;
- attachment limits and metadata-only persistence;
- confirmation policy and cancellation;
- domain validation for every action type.

### Current reference commands

```bash
npm run test:local-llm
npm run lint
npm run build
git diff --check
```

For a new project, create a focused test script like `test:local-llm` so the
local provider can be validated without waiting for the entire product suite.

## Release checklist

- [ ] LM Studio remains loopback-only.
- [ ] Local mode has no silent cloud fallback.
- [ ] Health distinguishes offline from missing model.
- [ ] Model ID is explicit or safely resolved.
- [ ] Request size and attachment limits are enforced.
- [ ] Conversation context is bounded.
- [ ] Thinking/private reasoning is not exposed accidentally.
- [ ] Plain conversation cannot trigger action cards by wording.
- [ ] Every mutation has a reviewed confirmation policy.
- [ ] Every action has domain validation before persistence.
- [ ] Stop/cancel works without a second hidden request.
- [ ] LAN access requires a secret and uses the app server boundary.
- [ ] `.env` and tokens are not committed or logged.
- [ ] Adapter, gateway, routing, history, attachment, and build checks pass.
- [ ] At least one real offline test and one real local-model smoke test were
      run when the model environment was available.
