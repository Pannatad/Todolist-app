import { AI_BACKEND_AVAILABLE, fileToGenerativePart, genAI, MODEL_NAME } from './geminiShared';

export const generateDailySchedule = async (tasks) => {
    if (!AI_BACKEND_AVAILABLE) {
        console.warn("Gemini API Key is missing.");
        return [];
    }

    try {
        const tasksList = tasks.map(t => `- ${t.title} (Due: ${t.deadline || 'None'}, Est: ${t.estimatedTime || 'Unknown'}m)`).join('\n');
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const prompt = `
            You are an expert time management coach.
            Current Time: ${now}
            
            User's Tasks:
            ${tasksList}
            
            Create a realistic, optimized schedule for the rest of the day to help the user be productive.
            Rules:
            1. Prioritize overdue tasks and the nearest deadlines.
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
 * @returns {Promise<Object>} - { title, deadline, subject, estimatedTime }
 */
