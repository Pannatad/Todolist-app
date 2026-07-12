import { fileToGenerativePart, genAI, MODEL_NAME, model } from './geminiShared';
import { log } from '../../utils/log.js';

export const suggestDifficulty = async (taskTitle) => {
    log('Suggesting difficulty for:', taskTitle);

    try {
        const prompt = `Analyze the difficulty of this task: "${taskTitle}". 
        Reply with ONLY one word: "easy", "medium", or "hard". 
        Consider time, effort, and complexity.`;

        log('Sending prompt to Gemini');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim().toLowerCase();
        log('Gemini response:', text);

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

        log(`Sending file analysis request to Gemini (${file.type})`);

        const result = await visionModel.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        log('Gemini analysis response:', text);
        return text;

    } catch (error) {
        console.error("Error analyzing file:", error);

        // If the specific model failed, try the standard 1.5 pro as a fallback
        if (error.message.includes('model') || error.message.includes('not found') || error.status === 404) {
            log('Attempting Gemini fallback');
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
            Avoid flowery or cute language. Focus on clarity, efficiency, and results.
            
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

        log('Sending personalized advice request');
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
 * Generates a daily schedule based on existing tasks.
 * @param {Array} tasks - List of task objects.
 * @returns {Promise<Array>} - Array of schedule objects { activity, duration, category, reason }.
 */
