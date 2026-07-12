import { createGenerativeModel } from '../generativeClient';
import { DEFAULT_GEMINI_MODEL } from '../aiProvider';

const MODEL_NAME = import.meta.env.VITE_AI_MODEL || DEFAULT_GEMINI_MODEL;
const AI_BACKEND_AVAILABLE = true; // AI credentials now live behind the dev-server API proxy.
const genAI = {
    getGenerativeModel: createGenerativeModel
};

const model = genAI.getGenerativeModel({ model: MODEL_NAME });

/**
 * Converts a File object to a GoogleGenerativeAI.Part object.
 * @param {File} file - The file to convert.
 * @returns {Promise<Object>} - The part object for the API.
 */
export async function fileToGenerativePart(file) {
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

export { AI_BACKEND_AVAILABLE, genAI, MODEL_NAME, model };
