import { askGemini, getRoadmapFromGeminiAPI } from './services/geminiService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAskGemini() {
  try {
    const response = await askGemini('What is the capital of France?');
    console.log(response);
  } catch (error) {
    console.error('Error in askGemini:', error);
  }
}

async function testGetRoadmap() {
  try {
    const roadmap = await getRoadmapFromGeminiAPI('Build a web application', '4');
    console.log(roadmap);
  } catch (error) {
    console.error('Error in getRoadmapFromGeminiAPI:', error);
  }
}

testAskGemini();
testGetRoadmap();