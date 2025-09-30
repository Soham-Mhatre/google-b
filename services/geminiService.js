import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Google Generative AI client with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * askGemini: Send a prompt to the Gemini model and return the generated text.
 * @param {string} prompt - The prompt to send to Gemini.
 * @returns {Promise<string>} - The model's generated response text.
 */
export const askGemini = async (prompt) => {
  try {
    // Use the correct, up-to-date model name
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Enhanced prompt for better formatting
    const enhancedPrompt = `${prompt}

Please format your response like ChatGPT with:

**Structure Guidelines:**
- Use clear section headers with ## for main topics
- Break content into digestible paragraphs (2-3 sentences max)
- Use bullet points and numbered lists for better readability
- Add **bold text** for key concepts and important terms
- Use *italics* for emphasis
- Include code examples in \`backticks\` or code blocks when relevant
- Add horizontal lines (---) to separate major sections
- Use blockquotes (>) for important notes or tips

**Content Style:**
- Keep explanations clear and conversational
- Start with a brief overview, then dive into details
- Use examples and analogies to explain complex concepts
- End sections with key takeaways when appropriate
- Structure long responses with a logical flow

**Visual Organization:**
- Leave blank lines between sections
- Use consistent formatting throughout
- Group related information together
- Make the response scannable with good visual hierarchy

Format the response to be visually appealing and easy to read, similar to how ChatGPT presents information in cards and well-structured sections.`;

    // Generate content
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in askGemini:', error);
    throw new Error('Failed to get response from Gemini API');
  }
};

/**
 * getRoadmapFromGeminiAPI: Build a learning roadmap for a given topic.
 * @param {string} topic - The subject/topic for the roadmap.
 * @param {number} weeks - Number of weeks to plan.
 * @returns {Promise<string>} - The formatted roadmap text.
 */
export const getRoadmapFromGeminiAPI = async (topic, weeks) => {
  const prompt = `Generate a ${weeks}-week learning roadmap for the topic: "${topic}". For each week, include the following sections: Learning Objectives, Resources, and Practice Exercises. Format the roadmap as follows:

**Week 1: [Topic]**
Learning Objectives:
- [Objective 1]
- [Objective 2]
Resources:
- [Resource 1]
- [Resource 2]
Practice Exercises:
- [Exercise 1]
- [Exercise 2]

**Week 2: [Topic]**
...`;

  try {
    const response = await askGemini(prompt);
    return response;
  } catch (error) {
    console.error('Error generating roadmap:', error);
    throw new Error('Failed to generate roadmap from Gemini API');
  }
};

// Optional helper to debug available models
// (uncomment to list models your API key can access)
// async function listAvailableModels() {
//   const models = await genAI.listModels();
//   console.log('Available models:', models);
// }
// listAvailableModels();
