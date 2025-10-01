import { askGemini } from '../services/geminiService.js';
import Placement from '../models/Placement.js';

export const generatePlacementContent = async (req, res) => {
  const { companyName, role } = req.body;
  const userId = req.user ? req.user.id : null;

  // Debug logging
  console.log('=== Placement Content Generation ===');
  console.log('Company Name:', companyName);
  console.log('Role:', role);
  console.log('User ID:', userId);

  try {
    if (!companyName || !companyName.trim()) {
      console.log('Error: Company name is missing');
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (!role || !role.trim()) {
      console.log('Error: Role is missing');
      return res.status(400).json({ error: 'Role is required' });
    }

    // Generate questions
    const questionsPrompt = `Generate 10 multiple-choice questions that are commonly asked in ${companyName} interviews for the ${role} position. 

Format the response as a JSON array with this exact structure:
[
  {
    "question": "What is the time complexity of binary search?",
    "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    "correctAnswer": 1,
    "explanation": "Binary search has O(log n) time complexity because it eliminates half of the search space in each iteration."
  }
]

Focus on:
- Technical concepts relevant to ${role} at ${companyName}
- Role-specific skills and knowledge areas
- Data structures and algorithms (if applicable to ${role})
- System design concepts (if applicable to ${role})
- Programming fundamentals (if applicable to ${role})
- Domain-specific knowledge for ${role}
- Company-specific technologies they use for ${role}

Make sure the questions are:
- Realistic and commonly asked for ${role} position
- Appropriate difficulty level for ${role}
- Cover diverse topics relevant to ${role}
- Have clear correct answers
- Include helpful explanations
- Mix technical and behavioral questions as appropriate for ${role}

Return ONLY the JSON array, no additional text or formatting.`;

    // Generate concepts
    const conceptsPrompt = `Create a comprehensive study guide for ${companyName} ${role} position placement preparation. Include the most important concepts, topics, and areas to focus on specifically for the ${role} role.

**FORMATTING REQUIREMENTS:**
- Use ## for main section headers
- Use ### for subsection headers  
- Use bullet points (-) for lists
- Use **bold** for important terms
- Use *italics* for emphasis
- Include code examples in \`backticks\` when relevant
- Structure it like a professional study guide

**SECTIONS TO INCLUDE:**

## Technical Skills Required for ${role}
### Programming Languages
- List the main programming languages ${companyName} uses for ${role} positions
- Mention proficiency levels expected for ${role}

### Role-Specific Technical Skills
- Key technical skills specific to ${role}
- Tools and technologies commonly used by ${role} at ${companyName}
- Industry standards and best practices for ${role}

### Data Structures & Algorithms (if applicable to ${role})
- Key data structures to master for ${role}
- Important algorithms and their applications in ${role}
- Common problem patterns relevant to ${role}

### System Design (if applicable to ${role})
- System design concepts relevant to ${role}
- Scalability considerations for ${role}
- Architecture patterns used in ${role}

## Company-Specific Information
### About ${companyName}
- Brief company overview
- Core products/services relevant to ${role}
- Engineering/team culture and values
- How ${role} fits into ${companyName}'s organization

### Interview Process for ${role}
- Typical interview rounds for ${role} position
- What to expect in each round for ${role}
- Role-specific interview formats and assessments
- Tips for success in ${role} interviews

## Key Topics to Study
### Core Computer Science
- Important CS fundamentals
- Operating systems concepts
- Database management
- Networking basics

### Advanced Topics
- Distributed systems
- Cloud computing (if relevant)
- Microservices architecture
- Security considerations

## Preparation Strategy
### Timeline
- Recommended preparation duration
- Week-by-week study plan
- Practice schedule

### Resources
- Recommended books and courses
- Online platforms for practice
- Mock interview resources

## Common Interview Questions Categories
### Technical Questions
- Most frequently asked topics
- Coding problem patterns
- System design scenarios

### Behavioral Questions
- Leadership and teamwork
- Problem-solving approach
- Company fit questions

## Tips for Success
### Technical Interview Tips
- Code optimization strategies
- Communication during coding
- Testing and debugging approach

### General Interview Tips
- How to research the company
- Questions to ask interviewers
- Follow-up best practices

Make it comprehensive, actionable, and specifically tailored to ${companyName}'s ${role} interview process and requirements.`;

    // Get questions and concepts in parallel
    console.log('Sending prompts to Gemini for:', companyName, 'and role:', role);
    const [questionsResponse, conceptsResponse] = await Promise.all([
      askGemini(questionsPrompt),
      askGemini(conceptsPrompt)
    ]);
    console.log('Received responses from Gemini');

    // Parse questions JSON
    let questions;
    try {
      // Clean the response to extract JSON
      const cleanedQuestionsResponse = questionsResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      questions = JSON.parse(cleanedQuestionsResponse);
      
      // Validate questions format
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format');
      }

      // Validate each question has required fields
      questions.forEach((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
          throw new Error(`Invalid question format at index ${index}`);
        }
      });

    } catch (parseError) {
      console.error('Error parsing questions JSON:', parseError);
      // Fallback questions if parsing fails
      questions = [
        {
          question: `What is a key technical skill required for ${companyName}?`,
          options: ["Data Structures", "Algorithms", "System Design", "All of the above"],
          correctAnswer: 3,
          explanation: "All of these skills are typically important for technical interviews."
        }
      ];
    }

    // Save to database if user is authenticated
    if (userId) {
      try {
        const placement = new Placement({
          userId,
          companyName: companyName.trim(),
          role: role.trim(),
          questions,
          concepts: conceptsResponse
        });
        await placement.save();
      } catch (saveError) {
        console.error('Error saving placement data:', saveError);
        // Don't fail the request if saving fails
      }
    }

    res.status(200).json({
      questions,
      concepts: conceptsResponse,
      companyName: companyName.trim(),
      role: role.trim()
    });

  } catch (error) {
    console.error('Error generating placement content:', error);
    res.status(500).json({ error: 'Failed to generate placement content' });
  }
};

export const getPlacementHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to access placement history' });
    }

    const history = await Placement.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ history });
  } catch (error) {
    console.error('Error fetching placement history:', error);
    res.status(500).json({ error: 'Failed to fetch placement history' });
  }
};