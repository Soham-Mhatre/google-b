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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
  const prompt = `Create a comprehensive ${weeks}-week learning roadmap for "${topic}". Make it detailed, professional, and well-structured like ChatGPT would provide.

**FORMATTING REQUIREMENTS:**
- Use ## for week headers (e.g., ## Week 1: Introduction to ${topic})
- Use ### for subsection headers (Learning Objectives, Key Topics, Resources, etc.)
- Use bullet points (-) for lists
- Use **bold** for important terms and concepts
- Use *italics* for emphasis
- Include real, clickable URLs in markdown format: [Link Text](https://example.com)
- Add brief descriptions for each resource explaining why it's valuable
- Make each week substantial with 4-6 learning objectives
- Include both free and premium resources when relevant
- Add estimated time commitments for each activity

**STRUCTURE FOR EACH WEEK:**
For each of the ${weeks} weeks, include these sections:

### Learning Objectives
- 4-6 specific, measurable learning goals
- Progress from basic to advanced concepts

### Key Topics Covered
- Detailed breakdown of main concepts
- Sub-topics and their relationships
- Real-world applications and examples

### Essential Resources
- **Free Resources:** Include YouTube channels, documentation, tutorials with actual URLs
- **Books/Courses:** Recommend specific titles with brief descriptions
- **Tools/Software:** List practical tools to install and use
- **Practice Platforms:** Coding challenges, simulators, etc.

### Hands-On Projects
- 2-3 practical exercises or mini-projects
- Clear instructions and expected outcomes
- Difficulty progression throughout the weeks

### Assessment & Milestones
- Self-assessment questions or quizzes
- Key skills to master before moving forward
- Portfolio pieces to complete

**CONTENT GUIDELINES:**
- Make it comprehensive and industry-relevant
- Include current trends and best practices
- Provide alternative learning paths for different skill levels
- Add troubleshooting tips and common pitfalls
- Include community resources (forums, Discord servers, etc.)
- Suggest networking opportunities (meetups, conferences)

**EXAMPLE FORMAT:**
## Week 1: Introduction to [Subtopic]

### Learning Objectives
- Understand fundamental concepts of [specific concept]
- Set up development environment and essential tools
- Complete first hands-on project demonstrating basic skills
- Identify key terminology and industry standards

### Key Topics Covered
**Core Concepts:**
- [Detailed explanation of concept 1]
- [Detailed explanation of concept 2]

**Practical Applications:**
- How this applies in real-world scenarios
- Industry use cases and examples

### Essential Resources

**Free Learning Materials:**
- [Resource Name](https://example.com) - Comprehensive tutorial covering basics (Est. time: 3 hours)
- [YouTube Channel](https://youtube.com/channel) - Visual learners will benefit from these step-by-step videos
- [Documentation](https://docs.example.com) - Official reference guide for advanced topics

**Recommended Books:**
- **"Book Title"** by Author - Perfect for deep theoretical understanding
- **"Practical Guide"** by Author - Hands-on approach with real projects

**Tools & Software:**
- [Tool Name](https://tool.com) - Essential for [specific purpose]
- [Platform](https://platform.com) - Industry-standard development environment

### Hands-On Projects
1. **Project 1:** [Brief description and learning outcome]
2. **Project 2:** [Brief description and learning outcome]
3. **Challenge:** [Optional advanced exercise]

### Assessment & Milestones
- [ ] Can explain [concept] in simple terms
- [ ] Successfully completed setup of development environment
- [ ] Built and deployed first project
- [ ] Familiar with basic terminology and tools

---

Now generate this format for ALL ${weeks} weeks of the "${topic}" roadmap. Make each week build upon the previous one, with increasing complexity and depth. Include real URLs where possible, and make the content actionable and practical.`;

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
