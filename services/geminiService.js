import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const askGemini = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in askGemini:', error);
    throw new Error('Failed to get response from Gemini API');
  }
};

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