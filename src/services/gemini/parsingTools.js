import { AI_BACKEND_AVAILABLE, fileToGenerativePart, genAI, MODEL_NAME } from './geminiShared.js';
import { log } from '../../utils/log.js';
import { sanitizeActivitySuggestions, sanitizeParsedTask, sanitizeParsedTasks } from '../../utils/taskParsing.js';

export const parseTaskInput = async (input) => {
    log('parseTaskInput called with input:', input);
    if (!AI_BACKEND_AVAILABLE) {
        console.warn("⚠️ Gemini API Key is missing.");
        return {
            title: input,
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

        log('Current datetime for context:', currentDateTime);

        const prompt = `
            You are an expert task parser. Analyze the following user input and extract task metadata.
            
            Current Date & Time: ${currentDateTime}
            User Input: "${input}"
            
            Extract the following information:
            1. **title**: The cleaned task description (without metadata like due dates, subjects, etc.)
            2. **deadline**: ISO 8601 datetime string (e.g., "2025-11-25T23:59:00") or null. Parse relative dates like "today", "tomorrow", "tonight", and specific times like "11.59", "3pm", etc.
            3. **subject**: The subject/category (e.g., "English", "Math", "Work") or null
            4. **estimatedTime**: Estimated time in minutes (number) or null
            
            Rules:
            - "today" or "tonight" means today at 11:59 PM at Thailand time
            - "tomorrow" means tomorrow at 11:59 PM
            - If time is specified (e.g., "11.59", "3pm"), use it for the deadline
            - If only date is mentioned without time, default to 11:59 PM
            - If input is just a simple task with no metadata, return null for optional fields
            - Clean the title to remove metadata mentions
            
            Reply with ONLY a JSON object in this exact format (no markdown, no extra text):
            {
                "title": "cleaned task title",
                "deadline": "ISO datetime string or null",
                "subject": "subject name or null",
                "estimatedTime": number or null
            }
        `;

        log('Sending request to Gemini API');
        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await modelToUse.generateContent(prompt);
        log('Received response from Gemini');
        const response = await result.response;
        let text = response.text().trim();
        log('Raw response text:', text);

        // Clean up markdown if present
        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            log('Cleaned response text:', text);
        }

        const parsed = JSON.parse(text);
        log('Parsed JSON:', parsed);

        // Validate and sanitize the response
        const result_object = sanitizeParsedTask(parsed, input);

        log('Returning result:', result_object);
        return result_object;

    } catch (error) {
        console.error("❌ Error parsing task input:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        // Fallback to original input with defaults
        return {
            title: input,
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
    log('parseLogInput called with input:', input);

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

        log('Sending request to Gemini API');
        const modelToUse = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await modelToUse.generateContent(prompt);
        log('Received response from Gemini');

        const response = await result.response;
        let text = response.text().trim();
        log('Raw response text:', text);

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(text);
        log('Parsed JSON:', parsed);

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

        return sanitizeActivitySuggestions(JSON.parse(text));
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
            2. **deadline**: ISO 8601 datetime string (e.g., "2025-11-25T23:59:00") or null.
               - Parse relative dates like "today", "tomorrow", "tonight".
               - "today" or "tonight" means today at 11:59 PM.
               - "tomorrow" means tomorrow at 11:59 PM.
            3. **subject**: Category/Subject (e.g., "Work", "Personal", "Study") or null.
            4. **estimatedTime**: Estimated time in minutes (number) or null.

            Reply with a JSON array of objects:
            [
                {
                    "title": "Task Title",
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

        return sanitizeParsedTasks(JSON.parse(text));
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
