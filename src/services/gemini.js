import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

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
        const prompt = `You are a wise and helpful productivity demon. deeply analyze the specific task: "${taskTitle}" (Subject: ${subject || 'General'}).
        
        Do not give generic advice. tailored your response to the specific nature of this task.
        
        Reply with a JSON object containing:
        1. "tips": An array of 3 short, punchy, motivating tips (max 10 words each) that are specific to this task.
        2. "steps": An array of 3-5 actionable, concrete steps to complete this specific task.
        
        Keep the tone encouraging but slightly mischievous (like a friendly demon).
        Do not include markdown formatting.
        
        (Random seed: ${Math.random()})`; // Prevent caching

        // Use gemini-3-pro-preview as requested
        const adviceModel = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

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
