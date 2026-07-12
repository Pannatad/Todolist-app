import { getAIProviderRequestOptions } from '../aiProvider';
import { buildRouteAgentPrompt } from '../agentPrompts';
import { isTaskActive } from '../../utils/taskState';
import { log } from '../../utils/log.js';
import { AI_BACKEND_AVAILABLE, fileToGenerativePart, genAI, MODEL_NAME, model } from './geminiShared';

export const routeAgentCommand = async (input, context = {}, aiProvider = undefined) => {
    log('routeAgentCommand called with input:', input);

    if (!AI_BACKEND_AVAILABLE) {
        console.warn("⚠️ Gemini API Key is missing.");
        return {
            actions: [],
            summary: "I'm unable to process your request (API Key missing)."
        };
    }

    try {
        const prompt = buildRouteAgentPrompt(input, context);
        const routingModel = genAI.getGenerativeModel(getAIProviderRequestOptions(aiProvider));

        log('Sending agent routing request');
        const result = await routingModel.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        log('Raw agent response:', text);

        // Clean up markdown if present
        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(text);
        log('Parsed agent plan:', parsed);

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

