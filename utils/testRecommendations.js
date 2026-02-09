import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import UserInteraction from '../models/UserInteraction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// Sample user IDs (replace with actual user IDs from your database)
const user1Id = '68dc2cee1444d0805c3fdaa7'; // Current logged-in user - Web Development enthusiast
const user2Id = '68dc2cee1444d0805c3fdaa8'; // AI/ML enthusiast
const user3Id = '68dc2cee1444d0805c3fdaa9'; // Game Development enthusiast

const sessionId1 = `session_${Date.now()}_1`;
const sessionId2 = `session_${Date.now()}_2`;
const sessionId3 = `session_${Date.now()}_3`;

// Create sample interactions for testing
const sampleInteractions = [
  // User 1: Web Development focus
  { userId: user1Id, sessionId: sessionId1, topic: 'Web Development', interactionType: 'course_view', metadata: { tags: ['react', 'javascript', 'frontend'] } },
  { userId: user1Id, sessionId: sessionId1, topic: 'React', interactionType: 'course_enroll', metadata: { tags: ['react', 'frontend'] } },
  { userId: user1Id, sessionId: sessionId1, topic: 'JavaScript', interactionType: 'course_view', metadata: { tags: ['javascript', 'programming'] } },
  { userId: user1Id, sessionId: sessionId1, topic: 'Node.js', interactionType: 'course_view', metadata: { tags: ['nodejs', 'backend'] } },
  { userId: user1Id, sessionId: sessionId1, topic: 'Web Development', interactionType: 'course_complete', metadata: { tags: ['fullstack'] } },
  { userId: user1Id, sessionId: sessionId1, topic: 'Frontend', interactionType: 'course_view', metadata: { tags: ['css', 'html'] } },
  { userId: user1Id, sessionId: sessionId1, topic: 'React', interactionType: 'course_view', metadata: { tags: ['react', 'hooks'] } },
  { userId: user1Id, sessionId: sessionId1, topic: 'JavaScript', interactionType: 'course_view', metadata: { tags: ['es6', 'async'] } },

  // User 2: AI/ML focus
  { userId: user2Id, sessionId: sessionId2, topic: 'Machine Learning', interactionType: 'course_view', metadata: { tags: ['ml', 'python'] } },
  { userId: user2Id, sessionId: sessionId2, topic: 'AI', interactionType: 'course_enroll', metadata: { tags: ['ai', 'neural networks'] } },
  { userId: user2Id, sessionId: sessionId2, topic: 'Data Science', interactionType: 'course_view', metadata: { tags: ['data', 'analytics'] } },
  { userId: user2Id, sessionId: sessionId2, topic: 'Python', interactionType: 'course_view', metadata: { tags: ['python', 'programming'] } },
  { userId: user2Id, sessionId: sessionId2, topic: 'Machine Learning', interactionType: 'course_complete', metadata: { tags: ['ml', 'algorithms'] } },
  { userId: user2Id, sessionId: sessionId2, topic: 'Deep Learning', interactionType: 'course_view', metadata: { tags: ['deep learning', 'tensorflow'] } },
  { userId: user2Id, sessionId: sessionId2, topic: 'AI', interactionType: 'course_view', metadata: { tags: ['ai', 'nlp'] } },
  { userId: user2Id, sessionId: sessionId2, topic: 'Data Science', interactionType: 'course_view', metadata: { tags: ['pandas', 'numpy'] } },

  // User 3: Game Development focus
  { userId: user3Id, sessionId: sessionId3, topic: 'Game Development', interactionType: 'course_view', metadata: { tags: ['unity', 'game'] } },
  { userId: user3Id, sessionId: sessionId3, topic: 'Unity', interactionType: 'course_enroll', metadata: { tags: ['unity', '3d'] } },
  { userId: user3Id, sessionId: sessionId3, topic: 'Game Development', interactionType: 'course_view', metadata: { tags: ['game design'] } },
  { userId: user3Id, sessionId: sessionId3, topic: 'C#', interactionType: 'course_view', metadata: { tags: ['csharp', 'programming'] } },
  { userId: user3Id, sessionId: sessionId3, topic: 'Game Development', interactionType: 'course_complete', metadata: { tags: ['unity', 'game'] } },
  { userId: user3Id, sessionId: sessionId3, topic: 'Unity', interactionType: 'course_view', metadata: { tags: ['unity', '2d'] } },
  { userId: user3Id, sessionId: sessionId3, topic: 'Game Engine', interactionType: 'course_view', metadata: { tags: ['unreal', 'engine'] } },
  { userId: user3Id, sessionId: sessionId3, topic: 'Game Development', interactionType: 'course_view', metadata: { tags: ['game mechanics'] } },
];

async function seedTestInteractions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing test interactions (optional)
    console.log('Clearing existing test interactions...');
    await UserInteraction.deleteMany({
      userId: { $in: [user1Id, user2Id, user3Id] }
    });

    // Insert sample interactions
    console.log('Seeding sample interactions...');
    const result = await UserInteraction.insertMany(sampleInteractions);
    console.log(`Successfully seeded ${result.length} interactions`);

    // Print summary
    console.log('\n=== Interaction Summary ===');
    const user1Count = await UserInteraction.countDocuments({ userId: user1Id });
    const user2Count = await UserInteraction.countDocuments({ userId: user2Id });
    const user3Count = await UserInteraction.countDocuments({ userId: user3Id });
    
    console.log(`User 1 (Web Dev): ${user1Count} interactions`);
    console.log(`User 2 (AI/ML): ${user2Count} interactions`);
    console.log(`User 3 (Game Dev): ${user3Count} interactions`);
    console.log('==========================\n');

    console.log('Test data seeded successfully!');
    console.log('You can now test the recommendation endpoints:');
    console.log(`- GET /api/courses/recommended/me (with user 1, 2, or 3 JWT token)`);
    console.log(`- GET /api/federated/interactions/me (to verify interactions)`);

  } catch (error) {
    console.error('Error seeding test interactions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seeding function
seedTestInteractions();
