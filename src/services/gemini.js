import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

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
        Do not include any markdown formatting or extra text.`;

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
