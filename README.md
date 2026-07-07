# All in One Personal Assistance 🌱

A beautiful, feature-rich productivity application combining task management, focus sessions, calendar views, activity logging, and vision boards - all with personality! Built with React, Vite, and Supabase.

**Developed by Mxllow**

## ✨ Features

### 🎭 Adaptive Personality Modes
- **Demon Mode** 👿: Get tough love and aggressive motivation
- **Penguin Mode** 🐧: Receive gentle, supportive encouragement  
- **Minimal Mode** 📋: Clean, distraction-free interface
- AI-powered persona reactions to your achievements and task additions

### 📝 Smart Task Management
- Plant-based task lifecycle (seed → growing → harvested)
- AI-powered difficulty suggestions
- Subject categorization with custom colors
- Deadline tracking with bonus/penalty system
- Virtual garden visualization with unlockable plots
- Coin rewards for task completion

### ⏱️ Focus Timer
- Customizable Pomodoro-style sessions
- Clean, distraction-free interface
- Earn coins for completed focus sessions
- Track focused time for each task

### 📅 Calendar View
- Month and week views
- Visual task organization by date
- Drag-and-drop scheduling (planned)
- Deadline visualization

### 📊 Daily Activity Log
- Natural language time input ("30m", "1.5h")
- Activity timeline with category breakdown
- Statistics dashboard
- Time spent by category visualization

### 🎯 Vision Board
- Set and track long-term goals
- Custom color themes for each goal
- Progress tracking
- Motivational visual representation

### 🤖 AI Integration
- Gemini AI for personalized task advice
- Context-aware suggestions
- Subject-specific guidance
- File upload support for homework help

### ☁️ Cloud Sync
- Supabase authentication
- Real-time data synchronization
- Guest mode with local storage fallback
- Profile management

### 🎨 Premium Design
- Dark mode support
- Glassmorphism UI effects
- Smooth animations and transitions
- Responsive design
- Custom color palette

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth + PostgreSQL)
- **AI**: LM Studio local models with server-side Gemini fallback
- **Sound**: use-sound
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account (for cloud features)
- LM Studio local server and/or a Google Gemini API key for AI fallback

### Installation

1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd Demon-todolist-app
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables
Create a \`.env\` file in the root directory:
\`\`\`env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI keys stay server-side. Do not use VITE_ for Gemini.
AI_PROVIDER=lmstudio
LM_STUDIO_BASE_URL=http://localhost:1234/v1
# Optional. Leave unset to use the model currently loaded in LM Studio.
LM_STUDIO_MODEL=your_loaded_lm_studio_model_id

# Optional Ollama fallback for local Gemma if LM Studio's server is off.
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e2b
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite-preview
\`\`\`

4. Run the development server
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## 📦 Build for Production

\`\`\`bash
npm run build
\`\`\`

## 🤖 Agent Prompts

Agent instructions live in `src/services/agentPrompts.js`.

Edit these exported sections to tune behavior:
- `AGENT_PERSONA_PROMPT`
- `AGENT_CAPABILITIES_PROMPT`
- `ACTION_SCHEMA_PROMPT`
- `AGENT_RULES_PROMPT`
- `RESPONSE_STYLE_PROMPT`

The built files will be in the \`dist\` directory.

## 🎮 Usage

### Getting Started
1. **Login** or use as **Guest** (data stored locally)
2. **Choose your persona** - Demon, Penguin, or Minimal mode
3. **Add tasks** with difficulty, subject, and deadlines
4. **Grow your garden** by completing tasks
5. **Earn coins** to unlock more garden plots
6. **Track your time** in the Daily Log
7. **Set goals** on the Vision Board
8. **Use Focus Mode** for deep work sessions

### Task Lifecycle
- 🌱 **Seed**: Task is created
- 🌸 **Growing**: Work in progress (click once)
- 🏆 **Harvested**: Task completed (click again)

### Coin System
- Easy tasks: 10 coins
- Medium tasks: 20 coins  
- Hard tasks: 30 coins
- +10 bonus for completing before deadline
- -5 penalty for missing deadline
- Focus sessions: 1 coin per minute

## 🗂️ Project Structure

\`\`\`
src/
├── components/       # React components
│   ├── TaskInput.jsx
│   ├── Garden.jsx
│   ├── Plant.jsx
│   ├── Calendar.jsx
│   ├── DailyLog.jsx
│   ├── VisionBoard.jsx
│   ├── FocusTimer.jsx
│   ├── PersonaAvatar.jsx
│   └── UserProfile.jsx
├── services/         # API integrations
│   ├── supabase.js
│   └── gemini.js
├── context/          # React contexts
│   └── AuthContext.jsx
└── App.jsx           # Main application
\`\`\`

## 🌈 Color Palette

- **Sage Green**: Primary UI color
- **Magma Red**: Dark mode accent
- **Cream/Bone**: Light backgrounds
- **Void**: Dark backgrounds

## 🔮 Future Features

- [ ] Mobile app (PWA)
- [ ] Drag-and-drop calendar scheduling
- [ ] Team collaboration
- [ ] Data export/import
- [ ] Custom themes
- [ ] Habit tracking
- [ ] Weekly/monthly reports

## 📄 License

This project is private and developed by Mxllow.

---

**Live your best life, one task at a time** 🌱✨
