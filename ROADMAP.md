# Roadmap: From To-Do List to Personal Assistant

You have proposed 4 major features to elevate the application. Here is the technical feasibility and implementation strategy for each.

## 1. Notifications
**Feasibility:** ✅ **High** (Easy to Medium)
**Practicality:** Essential for a personal assistant.

*   **Level 1 (Browser Notifications):**
    *   *How:* Use the standard Web `Notification` API.
    *   *Pros:* Easy to implement, works when the tab is open or in background (if allowed).
    *   *Cons:* Won't work if the browser is completely closed (on desktop) or on mobile web (limited).
*   **Level 2 (Push Notifications):**
    *   *How:* Service Workers + Web Push API + Supabase Edge Functions (to trigger them).
    *   *Pros:* Works even if the tab is closed.
    *   *Cons:* More complex setup (VAPID keys, service worker registration).

**Recommendation:** Start with **Level 1** for immediate value (reminders for tasks/focus timer).

## 2. Connect to Gmail/Outlook
**Feasibility:** ⚠️ **Medium/Hard** (High Complexity)
**Practicality:** High Value, but high friction setup.

*   **The Challenge:**
    *   Requires setting up Google Cloud Console / Microsoft Azure projects.
    *   **OAuth2 Scopes:** Reading emails requires "Sensitive Scopes" verification from Google if you plan to release this to others. For personal use (Test Users), it's fine.
    *   **Security:** You need to securely manage access tokens.
*   **Implementation Strategy:**
    *   Use Supabase Auth for "Sign in with Google" and request additional scopes (`https://www.googleapis.com/auth/gmail.readonly`).
    *   Store the `provider_token` in the user's session (handled by Supabase).
    *   Call Gmail API directly from the client or via a proxy function.

**Recommendation:** Do this **last**. It has the highest technical overhead (API consoles, verification, token management).

## 3. Agent with RAG (Retrieval-Augmented Generation)
**Feasibility:** ✅ **High** (Medium Effort)
**Practicality:** **Game Changer**. This makes it a "Brain", not just a list.

*   **How it works:**
    *   **Memory:** We store your tasks, daily logs, and goals in Supabase.
    *   **Vector Database:** We enable `pgvector` on your Supabase instance.
    *   **Embeddings:** When you add a task/log, we use Gemini to turn it into a mathematical vector and save it.
    *   **Retrieval:** When you ask "What did I do last week?", we search the database for relevant vectors and feed them to Gemini to answer you.
*   **Why it's practical:** You already have Supabase and Gemini. This is the natural next step.

**Recommendation:** **High Priority**. This aligns perfectly with the "Personal Assistant" goal.

## 4. "Start the Day" Animation Flow
**Feasibility:** ✅ **High** (Pure UI/UX)
**Practicality:** High for user engagement.

*   **Concept:** A "Wizard" style modal or full-screen overlay that guides you:
    1.  **Wake Up:** Greeting + Weather (optional) + Quote.
    2.  **Reflect:** Show yesterday's uncompleted tasks -> Decide to move to today or delete.
    3.  **Plan:** Show today's habits/goals -> Quick add tasks.
    4.  **Schedule:** Time-block the day (using the Schedule logic we have).
    5.  **Launch:** "Let's kill it" animation -> Dashboard.
*   **Tech:** React + Framer Motion (already installed).

**Recommendation:** **Start Here**. It's the most visual "wow" factor and ties all existing features together.

---

## Suggested Order of Execution

1.  **"Start the Day" Flow**: Immediate visual impact, improves the daily loop.
2.  **RAG / Agent Memory**: Makes the assistant "smart" and aware of your history.
3.  **Notifications**: Basic reminders to keep you on track.
4.  **Gmail Integration**: The final boss feature.
