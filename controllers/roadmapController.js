import { getRoadmapFromGeminiAPI } from '../services/geminiService.js';
import Roadmap from '../models/Roadmap.js';

function parseRoadmapContent(content) {
  const weeks = content.split(/\*\*Week \d+/).filter(week => week.trim() !== '');
  return weeks.map((week, index) => {
    const lines = week.split('\n').filter(line => line.trim() !== '');
    const topic = lines[0].replace(':', '').trim();
    const learningObjectives = [];
    const resources = [];
    const practiceExercises = [];
    
    let currentSection = '';
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Learning Objectives:')) {
        currentSection = 'objectives';
      } else if (line.startsWith('Resources:')) {
        currentSection = 'resources';
      } else if (line.startsWith('Practice Exercises:')) {
        currentSection = 'exercises';
      } else {
        switch (currentSection) {
          case 'objectives':
            learningObjectives.push(line);
            break;
          case 'resources':
            resources.push(line);
            break;
          case 'exercises':
            practiceExercises.push(line);
            break;
        }
      }
    }

    return {
      weekNumber: index + 1,
      topic,
      learningObjectives,
      resources,
      practiceExercises
    };
  });
}

export const generateRoadmap = async (req, res) => {
  const { topic, weeks } = req.body;
  const userId = req.user.id;

  try {
    const roadmapContent = await getRoadmapFromGeminiAPI(topic, weeks);

    // Parse the roadmapContent
    const parsedRoadmap = parseRoadmapContent(roadmapContent);

    const roadmap = new Roadmap({
      userId,
      topic,
      duration: weeks,  // Changed from 'weeks' to 'duration' to match the model
      content: roadmapContent,
    });
    await roadmap.save();

    res.status(200).json({ roadmap: parsedRoadmap });
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
};

export const getRoadmapHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const history = await Roadmap.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roadmap history' });
  }
};