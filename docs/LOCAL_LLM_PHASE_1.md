# Local LLM workflow: LM Studio + Gemma 4 26B A4B QAT

## Architecture

The Agent can use `Gemma Local` instead of Gemini. The browser and phone never
connect to LM Studio directly:

```text
Browser / phone -> app server on this Mac -> /api/ai gateway -> LM Studio on 127.0.0.1:1234
                                                   |
                                                   -> confirmed app action
```

The current workflow supports:

- multi-turn conversation with bounded older-conversation summaries;
- token streaming and user cancellation;
- optional thinking mode, off by default;
- PNG, JPEG and WebP vision input;
- text extraction from PDFs;
- simple app actions that remain behind confirm/cancel.

## One-time Mac setup

1. Open LM Studio.
2. Download `google/gemma-4-26b-a4b-qat`.
3. Load the model. A 16K-32K context is a practical starting range; larger
   contexts use more unified memory.
4. In **Developer -> Local Server**, turn **Status** on.
5. Keep LM Studio at `http://127.0.0.1:1234` and keep LM Studio's own
   **Serve on Local Network** setting off.
6. Copy `.env.example` to `.env` and adjust it if necessary.

Verify LM Studio:

```bash
curl http://127.0.0.1:1234/api/v1/models
```

## Run on this Mac

Development:

```bash
npm run dev
```

Production-style local deployment:

```bash
npm run deploy:local
```

Open `http://127.0.0.1:4173/`, select **Gemma Local**, and wait for the green
Ready status. The first request can be slower while LM Studio loads the model.

## Run on a phone on the same Wi-Fi

Use the production server rather than exposing the Vite development server.

1. Generate a private token:

   ```bash
   openssl rand -hex 24
   ```

2. Put it in `.env` and enable LAN access:

   ```env
   APP_LAN_ACCESS=true
   APP_ACCESS_TOKEN=paste-the-generated-token-here
   APP_PORT=4173
   ```

3. Keep the Mac awake, start LM Studio, load Gemma, and run:

   ```bash
   npm run deploy:local
   ```

4. The terminal prints a phone URL such as
   `http://192.168.1.40:4173/?token=YOUR_APP_ACCESS_TOKEN`. Replace the
   placeholder with the token from `.env`, then open that address once on the
   phone. The server removes the token from the address and stores it in an
   HttpOnly, same-site cookie for one day.

5. Bookmark the clean address, such as `http://192.168.1.40:4173/`.

The Mac and phone must remain on the same trusted private network. macOS may ask
whether Node can accept incoming connections; allow it for private networks.
Set `APP_LAN_ACCESS=false` again when phone access is no longer needed.

## Conversation and performance behavior

- The newest 20 messages stay verbatim. Older turns are summarized in batches
  of 10, so request size stays bounded instead of growing forever.
- Generic questions do not include tasks, schedule, habits, profile and other
  app state unless the question needs that information.
- Local conversation responses stream as they are generated. **Stop response**
  cancels the request and preserves the partial answer.
- Repeated follow-up prompts are not response-cached; each turn receives the
  current conversation context.
- Thinking mode is off by default for lower latency. Turn it on only when a
  difficult request benefits from extra reasoning.
- Images are resized to at most 1600 pixels before being sent to Gemma.
- PDF parsing code is loaded only when a PDF is selected.

For best latency, load the model before using the app, close memory-heavy apps,
and start LM Studio with one parallel request. Increase parallelism only when
multiple simultaneous users are more important than single-request speed.

## Attachment limits

- Images: PNG, JPEG or WebP, maximum 6 MB before resizing.
- PDFs: maximum 10 MB, 30 extracted pages and 50,000 characters.
- PDFs are converted to text in the browser; the original PDF is not sent to
  LM Studio.
- Scanned/image-only PDFs need OCR and are rejected because OCR is not enabled.
- Attachment history stores only file metadata, not base64 image data or the
  extracted document text.

## Safety and privacy

- LM Studio remains loopback-only even when the app is available to the phone.
- LAN mode refuses to start without an access token of at least 16 characters.
- The production server protects the app and all `/api/ai` routes with the same
  token cookie.
- Vite stays loopback-only unless the separate, unauthenticated
  `APP_DEV_LAN_ACCESS=true` debugging option is explicitly enabled.
- Local mode never silently falls back to Gemini or Ollama.
- Free-form reasoning is never shown as the answer. Schema-constrained JSON is
  recovered from `reasoning_content` only when it parses as the requested JSON.
- Every data-changing app action still requires confirmation.

The LAN server uses ordinary HTTP, so use it only on Wi-Fi you trust. Do not
port-forward LM Studio or this server to the public internet. Access away from
home needs a private VPN such as Tailscale or a separately designed HTTPS,
authenticated deployment.

## Current constraints

- Closing the MacBook lid normally suspends the server.
- The app is unavailable if the Mac sleeps, LM Studio stops, or the model is
  unloaded.
- Local inference speed and context size are limited by the Mac's unified
  memory and thermal state.
- Model quality is not identical to Gemini, especially for complex multi-step
  app actions.
- Plain LAN HTTP is suitable for trusted Wi-Fi testing, not public deployment.
- Physical phone behavior still depends on the phone browser, Wi-Fi isolation
  settings and the macOS firewall.

## Troubleshooting

- **Gemma offline:** Open LM Studio, start Developer -> Local Server, and load
  `google/gemma-4-26b-a4b-qat`.
- **Wrong model:** Set `LM_STUDIO_MODEL` to the exact LM Studio model key, then
  restart the app server.
- **First request times out:** Load Gemma before sending the request or raise
  `LM_STUDIO_REQUEST_TIMEOUT_MS` up to 600000.
- **Empty answer:** Keep thinking disabled. The gateway already handles known
  LM Studio schema output in `reasoning_content`.
- **Mac is memory constrained:** Reduce context length and parallelism, and
  close other memory-heavy applications.
- **Phone gets 401:** Open the URL with `?token=...` once; cookies are scoped to
  the exact IP address, so repeat this if the Mac's Wi-Fi IP changes.
- **Phone cannot connect:** Confirm both devices use the same Wi-Fi, client
  isolation is off, Node is allowed through the firewall, and use the printed
  IP address instead of `localhost`.
- **Scanned PDF fails:** Convert it with OCR first; OCR is not part of this phase.
