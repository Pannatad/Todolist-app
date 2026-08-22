# Operations, setup, and troubleshooting

The commands and values below describe the current Todolist reference setup.
For another project, keep the sequence but change the model ID, scripts, and
port as needed.

## One-time LM Studio setup

1. Open LM Studio.
2. Download the model used by the project. The current reference uses
   `google/gemma-4-26b-a4b-qat`.
3. Load the model.
4. In **Developer → Local Server**, turn the server on.
5. Keep the server at `http://127.0.0.1:1234` and keep **Serve on Local
   Network** off.
6. Start with a 16K–32K context window. Increase it only when memory allows.

Verify the LM Studio endpoint directly:

```bash
curl http://127.0.0.1:1234/v1/models
```

The response must contain a usable model ID. A running server with no loaded
model is not the same as a ready application.

## Environment configuration

Copy `.env.example` to `.env`; never commit `.env` or place server secrets in a
`VITE_` variable.

```env
AI_PROVIDER=lmstudio
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
LM_STUDIO_MODEL=google/gemma-4-26b-a4b-qat
LM_STUDIO_REQUEST_TIMEOUT_MS=120000

# Keep false for Mac-only use.
APP_LAN_ACCESS=false
APP_PORT=4173

# Only needed when APP_LAN_ACCESS=true.
APP_ACCESS_TOKEN=

# Only if LM Studio authentication is enabled.
LM_STUDIO_API_KEY=
```

Important details:

- `LM_STUDIO_BASE_URL` includes `/v1`; the adapter appends `/models` and
  `/chat/completions`.
- `LM_STUDIO_MODEL` must match the model ID returned by LM Studio exactly.
- Local mode must set `fallbackToGemini=false` (or the equivalent in the new
  provider layer). Offline local inference should be visible, not silently
  switched to a cloud provider.
- The request timeout is bounded by the adapter. The current implementation
  accepts 1–600 seconds and defaults to 120 seconds.

## Run on the Mac

Development:

```bash
npm run dev
```

The Vite development server is loopback-only by default. For the current
project, it also mounts the AI gateway as middleware.

Production-style local run:

```bash
npm run deploy:local
```

Open:

```text
http://127.0.0.1:4173/
```

In the app, select **Gemma Local** and wait for the health state to become
**Ready**. The first request may be slower while the model initializes.

Check the app gateway separately:

```bash
curl http://127.0.0.1:4173/api/ai/health?provider=local
```

## Run on a phone on trusted Wi-Fi

Use the production-style server. Do not expose the Vite development server or
LM Studio directly.

1. Generate a token:

   ```bash
   openssl rand -hex 24
   ```

2. Set:

   ```env
   APP_LAN_ACCESS=true
   APP_ACCESS_TOKEN=<random-token>
   APP_PORT=4173
   ```

3. Keep the Mac awake, keep LM Studio running with the model loaded, and run
   `npm run deploy:local`.
4. Open the printed phone URL once with `?token=<APP_ACCESS_TOKEN>`.
5. The server exchanges the query token for an HttpOnly, SameSite=Strict cookie
   valid for one day and redirects to the clean URL.
6. Bookmark the clean address, not the token-bearing URL.

The current server binds to `0.0.0.0` only when LAN mode is enabled and checks a
constant-time hash of the token. The Mac and phone must be on the same trusted
private network, and macOS may need permission for Node to accept private LAN
connections.

Set `APP_LAN_ACCESS=false` when phone access is no longer needed. Plain HTTP on
LAN is not a public deployment strategy: do not port-forward it or LM Studio.

## Performance rules that worked

- Load the model before the first user request.
- Keep one parallel request for best single-user latency; raise parallelism only
  when concurrency matters more than response speed.
- Start with 16K–32K context and reduce it when unified memory is pressured.
- Keep thinking disabled for ordinary requests; enable it only for genuinely
  difficult reasoning.
- Close memory-heavy applications and watch thermal throttling.
- Use streaming for perceived responsiveness. It improves time-to-visible-text,
  not model initialization or time-to-first-token.
- Keep current app state selective; sending every task, schedule item, and
  profile field on every turn wastes context.

## Attachment limits in the reference app

| Type | Limit | Processing |
| --- | --- | --- |
| PNG/JPEG/WebP | 6 MB before processing | Resize to max 1600 px and send as JPEG multimodal input. |
| PDF | 10 MB | Extract text locally, max 30 pages and 50,000 characters. |
| Scanned PDF | Not supported | Reject with an OCR-specific message. |

The gateway also rejects JSON request bodies larger than 10 MB. Keep these
limits aligned; base64 increases image payload size.

## Troubleshooting matrix

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Local health is `offline` | LM Studio server is off, wrong URL, or app server is down | Start Developer → Local Server; verify `/v1/models`; verify `LM_STUDIO_BASE_URL`. |
| Health is `needs_model` | LM Studio is reachable but no preferred model is available | Download/load the configured model or set `LM_STUDIO_MODEL` to an exact returned ID. |
| Wrong model responds | Model ID was omitted or mismatched | Set `LM_STUDIO_MODEL` explicitly and restart the app server. |
| First request times out | Model loading, Metal initialization, KV-cache allocation, or prompt prefill | Pre-load the model, reduce context/parallelism, and increase timeout up to the adapter limit. |
| Empty answer | Separate reasoning output or model template behavior | Disable thinking/reasoning; only accept structured JSON from a reasoning field when schema validation succeeds. |
| Stop button sends another answer later | Abort was not propagated or fallback ran after abort | Pass one `AbortSignal` through client, gateway, and adapter; treat `AbortError` as a user stop. |
| Phone gets `401` | Missing/expired token cookie or IP changed | Open the printed `?token=...` URL once again; use the Mac's current LAN IP. |
| Phone cannot connect | Different Wi-Fi, client isolation, firewall, or wrong host | Use the printed non-loopback address, check private-network firewall permission, and disable Wi-Fi client isolation. |
| Scanned PDF fails | No extractable text | OCR the document first or implement a separate local OCR pipeline. |
| App shows a card from ordinary prose | UI inferred a card type from answer wording | Require explicit deterministic `renderHint` metadata. |

Do not hide these states behind a generic “try again” message during
development. The user needs to know whether the model is offline, unloaded,
misconfigured, or simply generated an invalid answer.
