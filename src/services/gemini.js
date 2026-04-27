import { createGenerativeModel } from './generativeClient';
import { buildRouteAgentPrompt } from './agentPrompts';
import { isTaskActive } from '../utils/taskState';

const MODEL_NAME = import.meta.env.VITE_AI_MODEL || 'gemini-3.1-flash-lite-preview';
const AI_BACKEND_AVAILABLE = true; // AI credentials now live behind the dev-server API proxy.
const genAI = {
    getGenerativeModel: createGenerativeModel
};

const model = genAI.getGenerativeModel({ model: MODEL_NAME });

/**
 * Suggests a difficulty level for a given task.
 * @param {string} taskTitle - The title of the task.
 * @returns {Promise<string>} - 'easy', 'medium', or 'hard'.
 */
export const suggestDifficulty = async (taskTitle) => {
    console.log("Suggesting difficulty for:", taskTitle);

    try {
        const prompt = `Analyze the difficulty of this task: "${taskTitle}". 
        Reply with ONLY one word: "easy", "medium", or "hard". 
        Consider time, effort, and complexity.`;

        console.log("Sending prompt to Gemini...");
        const result = await model.generateContent(prompt);
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
        const adviceModel = genAI.getGenerativeModel({ model: MODEL_NAME });

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
    try {
        // Try the requested model first
        let visionModel;
        try {
            visionModel = genAI.getGenerativeModel({ model: MODEL_NAME });
        } catch {
            console.warn("gemini-3-pro-image not available, falling back to gemini-3.1-flash-lite-preview");
            visionModel = genAI.getGenerativeModel({ model: MODEL_NAME });
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
                const fallbackModel = genAI.getGenerativeModel({ model: MODEL_NAME });
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
    try {
        // Select model
        let modelToUse;
        const modelName = MODEL_NAME; // Use the configured model
        try {
            modelToUse = genAI.getGenerativeModel({ model: modelName });
        } catch {
            console.warn(`${modelName} not available, falling back to gemini-3.1-flash-lite-preview`);
            modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
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

// getPersonaReaction function removed to save API tokens (demon/penguin pet feature)
/**
 * Generates a daily schedule based on existing tasks.
 * @param {Array} tasks - List of task objects.
 * @returns {Promise<Array>} - Array of schedule objects { activity, duration, category, reason }.
 */
export const generateDailySchedule = async (tasks) => {
    if (!AI_BACKEND_AVAILABLE) {
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

        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
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
 * Parses a schedule image into a list of activities.
 * @param {File} file - The image file.
 * @returns {Promise<Array>} - Array of schedule objects.
 */
export const parseScheduleImage = async (file) => {
    if (!AI_BACKEND_AVAILABLE) {
        console.warn("Gemini API Key is missing.");
        return [];
    }

    try {
        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
        const imagePart = await fileToGenerativePart(file);

        const prompt = `
            Analyze this image of a schedule (handwritten or digital).
            Extract the time blocks and activities.
            
            Reply with a JSON array of objects:
            [
                {
                    "activity": "Activity Name",
                    "duration": 60, // duration in minutes (estimate if not explicit)
                    "category": "Work" | "Study" | "Health" | "Chore" | "Other", // Infer category
                    "startTime": "HH:MM" // 24h format, e.g. "14:00"
                }
            ]
            
            Rules:
            - Infer the duration from the start/end times if visible.
            - If only start time is shown, estimate duration based on context (e.g. "Lunch" = 60m).
            - Do not include markdown formatting.
        `;

        const result = await modelToUse.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error parsing schedule image:", error);
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
    if (!AI_BACKEND_AVAILABLE) {
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
            - "today" or "tonight" means today at 11:59 PM at Thailand time
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
        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
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

    if (!AI_BACKEND_AVAILABLE) {
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
        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
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

/**
 * Generates smart activity suggestions based on tasks and time of day.
 * @param {Array} tasks - List of user tasks.
 * @param {string} timeOfDay - 'Morning', 'Afternoon', 'Evening', 'Night'.
 * @returns {Promise<Array>} - Array of suggestion objects.
 */
export const getSmartSuggestions = async (tasks, timeOfDay) => {
    if (!AI_BACKEND_AVAILABLE) {
        return [
            { activity: "Check API Key", duration: 5, category: "Other" },
            { activity: "Manual Planning", duration: 15, category: "Study" }
        ];
    }

    try {
        const tasksList = tasks.slice(0, 10).map(t => `- ${t.title} (Due: ${t.deadline || 'None'})`).join('\n');

        const prompt = `
            You are a productivity assistant.
            Time of Day: ${timeOfDay}
            User's Current Tasks:
            ${tasksList}

            Suggest 3 specific, actionable activities for right now.
            1. If the user has urgent tasks, suggest working on them.
            2. If it's Morning, suggest focus work or exercise.
            3. If it's Evening, suggest winding down or preparation.
            4. Mix of work and health.

            Reply with a JSON array of objects:
            [
                {
                    "activity": "Activity Name",
                    "duration": 30, // minutes
                    "category": "Work" | "Study" | "Exercise" | "Health" | "Chore" | "Other"
                }
            ]
            
            Do not include markdown.
        `;

        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await modelToUse.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error getting smart suggestions:", error);
        return [];
    }
};

/**
 * Parses a task image into a list of tasks.
 * @param {File} file - The image file.
 * @returns {Promise<Array>} - Array of task objects.
 */
export const parseTaskImage = async (file) => {
    if (!AI_BACKEND_AVAILABLE) {
        console.warn("Gemini API Key is missing.");
        return [];
    }

    try {
        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
        const imagePart = await fileToGenerativePart(file);

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

        const prompt = `
            Analyze this image to extract tasks. It could be a handwritten list, a screenshot, or a photo of a sticky note.
            Current Date & Time: ${currentDateTime}

            Extract all tasks found in the image.
            For each task, extract:
            1. **title**: The task description.
            2. **difficulty**: 'easy', 'medium', or 'hard' (infer from context/complexity).
            3. **deadline**: ISO 8601 datetime string (e.g., "2025-11-25T23:59:00") or null. 
               - Parse relative dates like "today", "tomorrow", "tonight".
               - "today" or "tonight" means today at 11:59 PM.
               - "tomorrow" means tomorrow at 11:59 PM.
            4. **subject**: Category/Subject (e.g., "Work", "Personal", "Study") or null.
            5. **estimatedTime**: Estimated time in minutes (number) or null.

            Reply with a JSON array of objects:
            [
                {
                    "title": "Task Title",
                    "difficulty": "easy",
                    "deadline": "2025-12-01T12:00:00",
                    "subject": "Personal",
                    "estimatedTime": 30
                }
            ]

            Rules:
            - If multiple tasks are listed, extract all of them.
            - If it's a single task, return an array with one object.
            - Do not include markdown formatting.
        `;

        const result = await modelToUse.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error parsing task image:", error);
        return [];
    }
};

/**
 * Parses a natural language voice command into a schedule event.
 * @param {string} transcript - The spoken command.
 * @returns {Promise<Object>} - { title, startTime, duration, category }
 */
export const parseScheduleCommand = async (transcript) => {
    if (!AI_BACKEND_AVAILABLE) {
        console.warn("Gemini API Key is missing.");
        return null;
    }

    try {
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

        const prompt = `
            You are a smart scheduling assistant.
            Current Date & Time: ${currentDateTime}
            User Voice Command: "${transcript}"

            Extract the following details to create a schedule event:
            1. **title**: The event name.
            2. **startTime**: ISO 8601 datetime string (e.g., "2025-12-05T14:00:00").
               - Handle relative times like "tomorrow at 2pm", "in 30 minutes", "next Monday".
               - If no time is specified, default to the next logical hour (e.g., if it's 10:15, suggest 11:00).
            3. **duration**: Duration in minutes (number). Default to 60 if not specified.
            4. **category**: "Work", "Personal", "Study", "Health", "Other". Infer from context.

            Reply with ONLY a JSON object:
            {
                "title": "Event Title",
                "startTime": "2025-12-05T14:00:00",
                "duration": 60,
                "category": "Work"
            }
            
            Do not include markdown.
        `;

        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await modelToUse.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error parsing schedule command:", error);
        return null;
    }
};

/**
 * Routes a natural language command to structured actions for the AI Agent.
 * @param {string} input - User's natural language command.
 * @param {Object} context - Optional context about current state (tasks, schedule, user profile).
 * @returns {Promise<Object>} - { actions: [...], summary: "..." }
 */
export const routeAgentCommand = async (input, context = {}) => {
    console.log("🤖 routeAgentCommand called with input:", input);

    if (!AI_BACKEND_AVAILABLE) {
        console.warn("⚠️ Gemini API Key is missing.");
        return {
            actions: [],
            summary: "I'm unable to process your request (API Key missing)."
        };
    }

    try {
        const prompt = buildRouteAgentPrompt(input, context);

        console.log("📤 Sending agent routing request to Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        console.log("📄 Raw agent response:", text);

        // Clean up markdown if present
        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(text);
        console.log("✅ Parsed agent plan:", parsed);

        // Validate the response structure
        return {
            actions: Array.isArray(parsed.actions) ? parsed.actions : [],
            summary: parsed.summary || "I'll help you with that."
        };

    } catch (error) {
        console.error("❌ Error routing agent command:", error);
        return {
            actions: [{
                type: 'analyze',
                params: {
                    analysisType: 'error',
                    message: `I had trouble understanding that. Could you rephrase? (${error.message})`
                },
                explanation: "Error processing request"
            }],
            summary: "I encountered an issue processing your request."
        };
    }
};

/**
 * Generates a personalized morning briefing for the Start Day flow.
 * @param {object} context - User context including tasks, schedule, profile, memory
 * @returns {Promise<object>} - Morning briefing with greeting, priorities, tips
 */
export const generateMorningBriefing = async (context) => {
    if (!AI_BACKEND_AVAILABLE) {
        return {
            greeting: "Good morning! Let's make today great.",
            priorities: ["Focus on your most important task", "Take breaks when needed"],
            tip: "Start with the hardest task when your energy is highest.",
            suggestedSchedule: []
        };
    }

    try {
        const { profile, tasks, schedule, memory, currentTime } = context;
        const pendingTasks = tasks?.filter(isTaskActive) || [];
        const todaySchedule = schedule || [];

        const prompt = `
            You are a supportive productivity coach. Generate a personalized morning briefing.
            
            CURRENT TIME: ${currentTime || new Date().toLocaleString()}
            
            USER PROFILE:
            - Name: ${profile?.nickname || profile?.name || 'Friend'}
            - Role: ${profile?.role || 'Not specified'}
            - Focus Style: ${profile?.focusStyle || 'flexible'}
            - Working Hours: ${typeof profile?.workingHours === 'object'
                ? `${profile.workingHours.start} to ${profile.workingHours.end}`
                : profile?.workingHours || '9am-5pm'}
            
            PENDING TASKS (${pendingTasks.length}):
            ${pendingTasks.slice(0, 5).map(t => `- "${t.title}" (${t.difficulty || 'medium'}${t.deadline ? ', due: ' + new Date(t.deadline).toLocaleDateString() : ''})`).join('\n') || 'No tasks'}
            
            TODAY'S SCHEDULE:
            ${todaySchedule.slice(0, 5).map(s => `- ${s.title} at ${new Date(s.startTime || s.start_time).toLocaleTimeString()}`).join('\n') || 'Nothing scheduled'}
            
            RECENT MEMORY:
            ${memory?.slice(0, 3).map(m => m.summary || m.command).join(', ') || 'No recent activity'}
            
            Generate a morning briefing with:
            1. A warm, personalized greeting (use their name if available)
            2. 2-3 key priorities for today based on tasks and schedule
            3. One motivational tip tailored to their focus style
            4. Optional: suggested time blocks if their schedule has gaps
            
            Reply in JSON format:
            {
                "greeting": "Good morning, [Name]! ...",
                "priorities": ["Priority 1", "Priority 2", "Priority 3"],
                "tip": "One actionable tip...",
                "suggestedSchedule": [{"title": "Focus block", "suggestedTime": "9:00 AM", "duration": 60}]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error generating morning briefing:", error);
        return {
            greeting: "Good morning! Ready to tackle the day?",
            priorities: ["Review your task list", "Plan your key focus blocks"],
            tip: "Start with a quick win to build momentum!",
            suggestedSchedule: []
        };
    }
};

/**
 * Generates an intelligent evening summary for the End Day flow.
 * @param {object} context - User context including completed tasks, reflections, memory
 * @returns {Promise<object>} - Evening summary with accomplishments, insights, tomorrow suggestions
 */
export const generateEveningSummary = async (context) => {
    if (!AI_BACKEND_AVAILABLE) {
        return {
            summary: "Great work today! Take time to rest.",
            accomplishments: ["You showed up and did your best"],
            insights: "Every day is progress, no matter how small.",
            tomorrowSuggestions: ["Continue where you left off"],
            moodAnalysis: "positive"
        };
    }

    try {
        const { profile, tasksCompleted, tasksRemaining, habitsCompleted, reflection, memory } = context;

        const prompt = `
            You are a supportive productivity coach. Generate an evening summary and reflection.
            
            USER: ${profile?.nickname || profile?.name || 'Friend'}
            
            TODAY'S ACCOMPLISHMENTS:
            - Tasks completed: ${tasksCompleted?.length || 0}
            ${tasksCompleted?.slice(0, 5).map(t => `  - "${t.title}"`).join('\n') || '  - No tasks completed'}
            
            - Habits completed: ${habitsCompleted?.length || 0}
            ${habitsCompleted?.slice(0, 3).map(h => `  - ${h.name}`).join('\n') || '  - No habits tracked'}
            
            TASKS REMAINING: ${tasksRemaining?.length || 0}
            
            USER'S REFLECTION (if provided):
            ${reflection || 'Not provided'}
            
            RECENT PATTERNS FROM MEMORY:
            ${memory?.slice(0, 3).map(m => m.summary || m.command).join(', ') || 'No patterns detected'}
            
            Generate an evening summary with:
            1. A warm summary of the day (2-3 sentences)
            2. 2-3 specific accomplishments to celebrate
            3. One insight or pattern you noticed
            4. 1-2 suggestions for tomorrow
            5. Overall mood analysis: 'positive', 'neutral', or 'needs_support'
            
            Reply in JSON format:
            {
                "summary": "Great job today, [Name]! ...",
                "accomplishments": ["Accomplishment 1", "Accomplishment 2"],
                "insights": "I noticed that...",
                "tomorrowSuggestions": ["Suggestion 1", "Suggestion 2"],
                "moodAnalysis": "positive"
            }
            
            Be encouraging and supportive, even if not much was accomplished.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error generating evening summary:", error);
        return {
            summary: "Another day complete! Rest well and recharge.",
            accomplishments: ["You made it through the day"],
            insights: "Consistency is more important than perfection.",
            tomorrowSuggestions: ["Start fresh with your top priority"],
            moodAnalysis: "neutral"
        };
    }
};

/**
 * Generates learning topics from a text description.
 * @param {string} description - Learning goal or topic description.
 * @param {string} pathName - Name of the learning path for context.
 * @returns {Promise<Array>} - Array of { title, description, difficulty }
 */
export const generateTopicsFromDescription = async (description, pathName = '') => {
    if (!AI_BACKEND_AVAILABLE) {
        console.warn("Gemini API Key is missing.");
        return [];
    }

    try {
        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });

        const prompt = `
            You are an expert curriculum designer. A user wants to learn about the following topic.
            
            Learning Path: "${pathName}"
            User's Description: "${description}"
            
            Create a structured, ordered list of learning topics that would help someone master this subject.
            Order them from fundamental/beginner concepts to advanced topics — like a course syllabus.
            
            Rules:
            - Generate 5-15 topics depending on the scope of the subject.
            - Each topic should be a specific, focused concept (not too broad, not too narrow).
            - Assign difficulty: 'beginner', 'intermediate', or 'advanced'.
            - Keep titles concise (3-8 words).
            - Descriptions should be 1 sentence explaining what the topic covers.
            - Order matters: foundational topics first, advanced topics last.
            
            Reply with ONLY a JSON array (no markdown):
            [
                {
                    "title": "Topic Title",
                    "description": "Brief description of what this covers",
                    "difficulty": "beginner|intermediate|advanced"
                }
            ]
        `;

        const result = await modelToUse.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error generating topics from description:", error);
        return [];
    }
};

/**
 * Generates learning topics from an image (course outline, TOC, screenshot).
 * @param {File} file - Image file to analyze.
 * @param {string} pathName - Name of the learning path for context.
 * @returns {Promise<Array>} - Array of { title, description, difficulty }
 */
export const generateTopicsFromImage = async (file, pathName = '') => {
    if (!AI_BACKEND_AVAILABLE) {
        console.warn("Gemini API Key is missing.");
        return [];
    }

    try {
        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
        const imagePart = await fileToGenerativePart(file);

        const prompt = `
            Analyze this image to extract learning topics. It could be:
            - A course outline or syllabus
            - A textbook table of contents
            - A screenshot of a curriculum or roadmap
            - A mind map or diagram of concepts
            - Any image showing topics to learn
            
            Learning Path context: "${pathName}"
            
            Extract all the learning topics visible in the image and organize them logically.
            
            Rules:
            - Extract topics in order from basic to advanced.
            - If the image shows a clear order, preserve it.
            - Assign difficulty: 'beginner', 'intermediate', or 'advanced'.
            - Keep titles concise (3-8 words).
            - Add a brief 1-sentence description for each topic.
            - Generate 3-20 topics depending on what's in the image.
            
            Reply with ONLY a JSON array (no markdown):
            [
                {
                    "title": "Topic Title",
                    "description": "Brief description of what this covers",
                    "difficulty": "beginner|intermediate|advanced"
                }
            ]
        `;

        const result = await modelToUse.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Error generating topics from image:", error);
        return [];
    }
};
