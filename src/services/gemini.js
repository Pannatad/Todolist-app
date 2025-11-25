import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });
const model_easy = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Suggests a difficulty level for a given task.
 * @param {string} taskTitle - The title of the task.
 * @returns {Promise<string>} - 'easy', 'medium', or 'hard'.
 */
export const suggestDifficulty = async (taskTitle) => {
    console.log("Suggesting difficulty for:", taskTitle);
    console.log("API Key present:", !!API_KEY, API_KEY ? `Length: ${API_KEY.length}` : "N/A");

    if (!API_KEY) {
        console.warn("Gemini API Key is missing.");
        return 'easy';
    }

    try {
        const prompt = `Analyze the difficulty of this task: "${taskTitle}". 
        Reply with ONLY one word: "easy", "medium", or "hard". 
        Consider time, effort, and complexity.`;

        console.log("Sending prompt to Gemini...");
        const result = await model_easy.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim().toLowerCase();
        console.log("Gemini response:", text);

        if (['easy', 'medium', 'hard'].includes(text)) {
            return text;
        }
        return 'medium'; // Default fallback
    } catch (error) {
        console.error("Error suggesting difficulty:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return 'easy'; // Fallback on error
    }
};

/**
 * Breaks down a complex task into subtasks.
 * @param {string} taskTitle - The main task title.
 * @returns {Promise<string[]>} - An array of subtask strings.
 */
export const breakDownTask = async (taskTitle) => {
    if (!API_KEY) {
        console.warn("Gemini API Key is missing.");
        return [];
    }

    try {
        const prompt = `Break down the task "${taskTitle}" into 3-5 smaller, actionable subtasks.
        Reply with a JSON array of strings, e.g., ["Step 1", "Step 2"].
        Do not include any markdown formatting or extra text. Also use the task name as the context
        to generate helpful subtasks. Don't use general suggestions for everything`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Clean up potential markdown code blocks
        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error breaking down task:", error);
        return [];
    }
};

/**
 * Generates helpful tips and a step-by-step plan for a task.
 * @param {string} taskTitle - The task title.
 * @param {string} subject - The task subject.
 * @returns {Promise<{tips: string[], steps: string[]}>} - Structured advice.
 */
export const getTaskTips = async (taskTitle, subject) => {
    if (!API_KEY) {
        console.warn("Gemini API Key is missing.");
        return { tips: ["Focus on one thing at a time.", "Take breaks."], steps: ["Start", "Finish"] };
    }

    try {
        const prompt = `You are a wise and helpful productivity assistant. Deeply analyze the specific task: "${taskTitle}" (Subject: ${subject || 'General'}).
        
        Provide:
        1. Tips: 3-4 specific, actionable tips for completing this task efficiently.
        2. Steps: A clear, numbered breakdown (3-5 steps) to accomplish the task.
        
        Reply in JSON format: { "tips": ["...", "..."], "steps": ["...", "..."] }
        
        Keep the tone encouraging and professional.
        Do not include markdown formatting in JSON output.
        `;

        // Use gemini-3-pro-preview as requested
        const adviceModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await adviceModel.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Clean up potential markdown code blocks
        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error getting task tips:", error);
        return {
            tips: [`Error: ${error.message || "Unknown error"}`, "Try checking API key", "Reverting to 1.5 Pro"],
            steps: ["Check Console", "Verify Model ID", "Retry"]
        };
    }
};

/**
 * Converts a File object to a GoogleGenerativeAI.Part object.
 * @param {File} file - The file to convert.
 * @returns {Promise<Object>} - The part object for the API.
 */
async function fileToGenerativePart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Analyzes a file (image or PDF) with user instructions.
 * @param {File} file - The file to analyze.
 * @param {string} instructions - User's instructions or question about the file.
 * @returns {Promise<string>} - The analysis result.
 */
export const analyzeFile = async (file, instructions) => {
    if (!API_KEY) {
        console.warn("Gemini API Key is missing.");
        return "Error: API Key is missing. Please check your .env file.";
    }

    try {
        // Try the requested model first
        let visionModel;
        try {
            visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        } catch (e) {
            console.warn("gemini-3-pro-image not available, falling back to gemini-2.5-flash");
            visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        }

        // Fallback logic if the first model instantiation doesn't throw but the request fails
        // (handled in the catch block below)

        const imagePart = await fileToGenerativePart(file);
        const prompt = instructions || "Analyze this file.";

        console.log(`Sending file analysis request to Gemini (${file.type})...`);

        const result = await visionModel.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        console.log("Gemini analysis response:", text);
        return text;

    } catch (error) {
        console.error("Error analyzing file:", error);

        // If the specific model failed, try the standard 1.5 pro as a fallback
        if (error.message.includes('model') || error.message.includes('not found') || error.status === 404) {
            console.log("Attempting fallback to gemini-1.5-pro...");
            try {
                const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const imagePart = await fileToGenerativePart(file);
                const prompt = instructions || "Analyze this file.";
                const result = await fallbackModel.generateContent([prompt, imagePart]);
                const response = await result.response;
                return response.text();
            } catch (fallbackError) {
                console.error("Fallback also failed:", fallbackError);
                return `Error: Failed to analyze file. ${fallbackError.message}`;
            }
        }

        return `Error: ${error.message || "Unknown error occurred during analysis."}`;
    }
};

/**
 * Generates personalized advice based on task, instructions, and optional file.
 * @param {string} taskTitle - The task title.
 * @param {string} subject - The task subject.
 * @param {string} instructions - User's specific instructions.
 * @param {File} [file] - Optional file to analyze.
 * @returns {Promise<{analysis: string, steps: string[]}>} - Structured advice.
 */
export const getPersonalizedAdvice = async (taskTitle, subject, instructions, file) => {
    if (!API_KEY) {
        console.warn("Gemini API Key is missing.");
        return {
            analysis: "I can't help you without my powers (API Key missing).",
            steps: ["Check .env file", "Restart server"]
        };
    }

    try {
        // Select model
        let modelToUse;
        const modelName = "gemini-2.5-flash"; // Use the requested model
        try {
            modelToUse = genAI.getGenerativeModel({ model: modelName });
        } catch (e) {
            console.warn(`${modelName} not available, falling back to gemini-2.5-flash`);
            modelToUse = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        }

        // Construct Prompt
        const prompt = `
            You are an expert productivity consultant and technical advisor.
            Task: "${taskTitle}" (Subject: ${subject || 'General'}).
            User Instructions: "${instructions || 'Please provide a structured analysis and actionable steps.'}"
            
            Analyze the situation (and the file if provided) with a professional, practical, and highly structured approach.
            Avoid flowery language or "cute" personas. Focus on clarity, efficiency, and results.
            
            Reply with a JSON object containing:
            1. "analysis": A structured analysis of the task or file. Use clear headings and bullet points if necessary (using standard text, not markdown).
            2. "steps": An array of 3-5 concrete, highly actionable, and specific steps to complete the task.
            
            Do not include markdown formatting in the JSON output.
        `;

        const parts = [prompt];
        if (file) {
            const imagePart = await fileToGenerativePart(file);
            parts.push(imagePart);
        }

        console.log("Sending personalized advice request...");
        const result = await modelToUse.generateContent(parts);
        const response = await result.response;
        let text = response.text().trim();

        // Clean up markdown
        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(text);

    } catch (error) {
        console.error("Error getting personalized advice:", error);

        // Fallback for JSON parsing errors or API errors
        return {
            analysis: `I tried to summon wisdom, but something went wrong. (${error.message})`,
            steps: ["Try again", "Rephrase instructions", "Check file format"]
        };
    }
};

/**
 * Generates a short, personality-driven reaction to a user action.
 * @param {string} action - 'add', 'complete', 'delete', 'idle'.
 * @param {string} taskTitle - The task title (if applicable).
 * @param {string} mode - 'demon' | 'penguin'.
 * @returns {Promise<string>} - The reaction text.
 */
export const getPersonaReaction = async (action, taskTitle, mode) => {
    if (!API_KEY) return mode === 'penguin' ? "Waddle waddle! (No API Key)" : "The void is silent... (No API Key)";

    try {
        const modelToUse = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let systemPrompt = "";
        if (mode === 'penguin') {
            systemPrompt = `You are a cute, cheerful, fish-obsessed penguin. 
            You love productivity and ice. You are very supportive but slightly chaotic.
            Keep it short (max 15 words). Use emojis like 🐟, 🧊, 🐧.`;
        } else {
            systemPrompt = `You are a sarcastic, void-dwelling demon. 
            You view human tasks as trivial but necessary for "soul harvesting".
            You are demanding, slightly mean, but secretly want the user to succeed so you can feed.
            Keep it short (max 15 words). Use emojis like 👿, 🔥, 💀.`;
        }

        const prompt = `
            ${systemPrompt}
            User Action: ${action}
            Task: "${taskTitle || 'General'}"
            
            React to this action in character.
        `;

        const result = await modelToUse.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();

    } catch (error) {
        console.error("Error getting persona reaction:", error);
        return mode === 'penguin' ? "Squeak? (Error)" : "The void glitches... (Error)";
    }
};
/**
 * Generates a daily schedule based on existing tasks.
 * @param {Array} tasks - List of task objects.
 * @returns {Promise<Array>} - Array of schedule objects { activity, duration, category, reason }.
 */
export const generateDailySchedule = async (tasks) => {
    if (!API_KEY) {
        console.warn("Gemini API Key is missing.");
        return [];
    }

    try {
        const tasksList = tasks.map(t => `- ${t.title} (Diff: ${t.difficulty}, Due: ${t.deadline || 'None'}, Est: ${t.estimatedTime || 'Unknown'}m)`).join('\n');
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const prompt = `
            You are an expert time management coach.
            Current Time: ${now}
            
            User's Tasks:
            ${tasksList}
            
            Create a realistic, optimized schedule for the rest of the day to help the user be productive.
            Rules:
            1. Prioritize tasks with deadlines and high difficulty.
            2. Mix deep work with quick wins.
            3. Include breaks.
            4. If tasks have estimated times, use them. Otherwise, estimate reasonable durations (30-90 mins).
            5. Suggest specific start times.
            
            Reply with a JSON array of objects:
            [
                { 
                    "activity": "Task Name or Break", 
                    "duration": 60, // in minutes
                    "category": "Work" | "Health" | "Break" | "Study",
                    "reason": "Why this task now?"
                }
            ]
            
            Do not include markdown formatting in the JSON output.
        `;

        const modelToUse = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await modelToUse.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(text);

    } catch (error) {
        console.error("Error generating schedule:", error);
        return [];
    }
};

/**
 * Parses natural language task input and extracts metadata.
 * @param {string} input - Raw user input (e.g., "English task, due at today 11.59, estimate 20 mins to do").
 * @returns {Promise<Object>} - { title, difficulty, deadline, subject, estimatedTime }
 */
export const parseTaskInput = async (input) => {
    console.log("🚀 parseTaskInput called with input:", input);
    if (!API_KEY) {
        console.warn("⚠️ Gemini API Key is missing.");
        return {
            title: input,
            difficulty: 'easy',
            deadline: null,
            subject: null,
            estimatedTime: null
        };
    }

    try {
        // Get current date and time for context
        const now = new Date();
        const currentDateTime = now.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        console.log("📅 Current DateTime for context:", currentDateTime);

        const prompt = `
            You are an expert task parser. Analyze the following user input and extract task metadata.
            
            Current Date & Time: ${currentDateTime}
            User Input: "${input}"
            
            Extract the following information:
            1. **title**: The cleaned task description (without metadata like due dates, subjects, etc.)
            2. **difficulty**: 'easy', 'medium', or 'hard' (infer from context, default to 'easy' if unclear)
            3. **deadline**: ISO 8601 datetime string (e.g., "2025-11-25T23:59:00") or null. Parse relative dates like "today", "tomorrow", "tonight", and specific times like "11.59", "3pm", etc.
            4. **subject**: The subject/category (e.g., "English", "Math", "Work") or null
            5. **estimatedTime**: Estimated time in minutes (number) or null
            
            Rules:
            - "today" or "tonight" means today at 11:59 PM
            - "tomorrow" means tomorrow at 11:59 PM
            - If time is specified (e.g., "11.59", "3pm"), use it for the deadline
            - If only date is mentioned without time, default to 11:59 PM
            - If input is just a simple task with no metadata, return defaults (difficulty='easy', everything else null)
            - Clean the title to remove metadata mentions
            
            Reply with ONLY a JSON object in this exact format (no markdown, no extra text):
            {
                "title": "cleaned task title",
                "difficulty": "easy|medium|hard",
                "deadline": "ISO datetime string or null",
                "subject": "subject name or null",
                "estimatedTime": number or null
            }
        `;

        console.log("📤 Sending request to Gemini API...");
        const modelToUse = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await modelToUse.generateContent(prompt);
        console.log("📥 Received response from Gemini");
        const response = await result.response;
        let text = response.text().trim();
        console.log("📄 Raw response text:", text);

        // Clean up markdown if present
        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            console.log("🧹 Cleaned response text:", text);
        }

        const parsed = JSON.parse(text);
        console.log("✅ Parsed JSON:", parsed);

        // Validate and sanitize the response
        const result_object = {
            title: parsed.title || input,
            difficulty: ['easy', 'medium', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : 'easy',
            deadline: parsed.deadline || null,
            subject: parsed.subject || null,
            estimatedTime: parsed.estimatedTime ? parseInt(parsed.estimatedTime) : null
        };

        console.log("🎁 Returning result:", result_object);
        return result_object;

    } catch (error) {
        console.error("❌ Error parsing task input:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        // Fallback to original input with defaults
        return {
            title: input,
            difficulty: 'easy',
            deadline: null,
            subject: null,
            estimatedTime: null
        };
    }
};

/**
 * Parses natural language daily log input.
 * @param {string} input - Raw user input (e.g., "Gym for 1 hour", "Coding react app 2h 30m").
 * @param {string[]} categories - List of available categories.
 * @returns {Promise<Object>} - { activity, duration, category }
 */
export const parseLogInput = async (input, categories) => {
    console.log("🚀 parseLogInput called with input:", input);

    if (!API_KEY) {
        console.warn("⚠️ Gemini API Key is missing.");
        return {
            activity: input,
            duration: 0,
            category: 'Other'
        };
    }

    try {
        const prompt = `
            You are an expert activity logger. Analyze the following user input and extract log details.
            
            User Input: "${input}"
            Available Categories: ${categories.join(', ')}
            
            Extract:
            1. **activity**: Cleaned activity description (remove duration info).
            2. **duration**: Duration in minutes (number). If not specified, estimate a reasonable duration based on the activity.
            3. **category**: The best matching category from the available list. Default to 'Other' if unclear.
            
            Rules:
            - Convert hours/minutes to total minutes (e.g., "1h 30m" -> 90).
            - If no duration is mentioned, infer a typical duration (e.g., "Gym" -> 60, "Lunch" -> 30).
            - Strictly use one of the provided categories.
            
            Reply with ONLY a JSON object:
            {
                "activity": "cleaned activity name",
                "duration": number,
                "category": "CategoryName"
            }
        `;

        console.log("📤 Sending request to Gemini API...");
        const modelToUse = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await modelToUse.generateContent(prompt);
        console.log("📥 Received response from Gemini");

        const response = await result.response;
        let text = response.text().trim();
        console.log("📄 Raw response text:", text);

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(text);
        console.log("✅ Parsed JSON:", parsed);

        return {
            activity: parsed.activity || input,
            duration: parsed.duration || 0,
            category: categories.includes(parsed.category) ? parsed.category : 'Other'
        };

    } catch (error) {
        console.error("❌ Error parsing log input:", error);
        return {
            activity: input,
            duration: 0,
            category: 'Other'
        };
    }
};
