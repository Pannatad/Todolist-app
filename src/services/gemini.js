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
        const prompt = `You are a wise and helpful productivity assistant. Deeply analyze the specific task: "${taskTitle}" (Subject: ${subject || 'General'}).
        
        Provide:
        1. Tips: 3-4 specific, actionable tips for completing this task efficiently.
        2. Steps: A clear, numbered breakdown (3-5 steps) to accomplish the task.
        
        Reply in JSON format: { "tips": ["...", "..."], "steps": ["...", "..."] }
        
        Keep the tone encouraging and professional.
        Do not include markdown formatting in JSON output.
        `;

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
            visionModel = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });
        } catch (e) {
            console.warn("gemini-3-pro-image not available, falling back to gemini-1.5-pro");
            visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
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
                const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
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
        const modelName = "gemini-3-pro-preview"; // Use the requested model
        try {
            modelToUse = genAI.getGenerativeModel({ model: modelName });
        } catch (e) {
            console.warn(`${modelName} not available, falling back to gemini-1.5-pro`);
            modelToUse = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
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
