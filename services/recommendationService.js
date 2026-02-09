import federatedLearningService from './federatedLearningService.js';
import UserInteraction from '../models/UserInteraction.js';
import UserRecommendation from '../models/UserRecommendation.js';
import * as tf from '@tensorflow/tfjs';

class RecommendationService {
  constructor() {
    this.topicDatabase = this.initializeTopicDatabase();
    this.resourceDatabase = this.initializeResourceDatabase();
  }

  /**
   * Initialize topic database with educational content
   */
  initializeTopicDatabase() {
    return [
      {
        id: 'js_basics',
        title: 'JavaScript Basics',
        description: 'Learn fundamental JavaScript concepts',
        difficulty: 'beginner',
        estimatedTime: 120,
        topics: ['variables', 'functions', 'arrays', 'objects'],
        prerequisites: []
      },
      {
        id: 'react_intro',
        title: 'Introduction to React',
        description: 'Get started with React library',
        difficulty: 'intermediate',
        estimatedTime: 180,
        topics: ['components', 'props', 'state', 'hooks'],
        prerequisites: ['js_basics']
      },
      {
        id: 'node_basics',
        title: 'Node.js Fundamentals',
        description: 'Server-side JavaScript with Node.js',
        difficulty: 'intermediate',
        estimatedTime: 150,
        topics: ['modules', 'npm', 'express', 'async'],
        prerequisites: ['js_basics']
      },
      {
        id: 'python_basics',
        title: 'Python Programming',
        description: 'Learn Python from scratch',
        difficulty: 'beginner',
        estimatedTime: 140,
        topics: ['syntax', 'data_types', 'functions', 'classes'],
        prerequisites: []
      },
      {
        id: 'data_structures',
        title: 'Data Structures',
        description: 'Essential data structures and algorithms',
        difficulty: 'intermediate',
        estimatedTime: 200,
        topics: ['arrays', 'linked_lists', 'trees', 'graphs'],
        prerequisites: ['python_basics']
      },
      {
        id: 'machine_learning',
        title: 'Machine Learning Basics',
        description: 'Introduction to ML concepts',
        difficulty: 'advanced',
        estimatedTime: 300,
        topics: ['supervised_learning', 'neural_networks', 'tensorflow'],
        prerequisites: ['python_basics', 'data_structures']
      },
      {
        id: 'web_dev',
        title: 'Web Development',
        description: 'Full-stack web development',
        difficulty: 'intermediate',
        estimatedTime: 250,
        topics: ['html', 'css', 'javascript', 'backend'],
        prerequisites: ['js_basics']
      },
      {
        id: 'databases',
        title: 'Database Management',
        description: 'SQL and NoSQL databases',
        difficulty: 'intermediate',
        estimatedTime: 160,
        topics: ['sql', 'mongodb', 'queries', 'design'],
        prerequisites: []
      }
    ];
  }

  /**
   * Initialize resource database
   */
  initializeResourceDatabase() {
    return [
      {
        id: 'res_1',
        type: 'video',
        title: 'JavaScript Tutorial for Beginners',
        topic: 'js_basics',
        difficulty: 'beginner',
        url: 'https://example.com/js-tutorial',
        duration: 120
      },
      {
        id: 'res_2',
        type: 'article',
        title: 'React Hooks Explained',
        topic: 'react_intro',
        difficulty: 'intermediate',
        url: 'https://example.com/react-hooks',
        duration: 30
      },
      {
        id: 'res_3',
        type: 'exercise',
        title: 'Python Coding Challenges',
        topic: 'python_basics',
        difficulty: 'beginner',
        url: 'https://example.com/python-challenges',
        duration: 60
      }
    ];
  }

  /**
   * Generate personalized recommendations for a user
   */
  async generateRecommendations(userId) {
    try {
      console.log(`Generating recommendations for user ${userId}`);

      // Get user's interaction history
      const interactions = await UserInteraction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(100);

      if (interactions.length === 0) {
        // New user - provide beginner recommendations
        return this.generateBeginnerRecommendations(userId);
      }

      // Analyze user's learning profile
      const userProfile = this.analyzeUserProfile(interactions);

      // Get federated model predictions
      const modelPredictions = await this.getPredictionsFromModel(userId, userProfile);

      // Combine predictions with content-based filtering
      const recommendations = await this.combineRecommendations(
        userProfile,
        modelPredictions
      );

      // Generate learning path
      const learningPath = this.generateLearningPath(userProfile, recommendations);

      // Generate personalized insights
      const insights = this.generateInsights(userProfile, interactions);

      // Save recommendations
      const userRecommendation = new UserRecommendation({
        userId,
        modelId: modelPredictions.modelId,
        modelVersion: modelPredictions.version,
        recommendations,
        learningPath,
        personalizedInsights: insights
      });

      await userRecommendation.save();

      console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
      return userRecommendation;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Analyze user's learning profile from interactions
   */
  analyzeUserProfile(interactions) {
    const profile = {
      topicFrequency: {},
      difficultyDistribution: { beginner: 0, intermediate: 0, advanced: 0 },
      interactionTypes: {},
      averageTimeSpent: 0,
      completionRate: 0,
      preferredTopics: [],
      weakAreas: [],
      totalInteractions: interactions.length
    };

    let totalTime = 0;
    let completedCount = 0;

    interactions.forEach(interaction => {
      // Topic frequency
      if (interaction.topic) {
        profile.topicFrequency[interaction.topic] = 
          (profile.topicFrequency[interaction.topic] || 0) + 1;
      }

      // Difficulty distribution
      if (interaction.difficulty) {
        profile.difficultyDistribution[interaction.difficulty]++;
      }

      // Interaction types
      profile.interactionTypes[interaction.interactionType] = 
        (profile.interactionTypes[interaction.interactionType] || 0) + 1;

      // Time and completion
      totalTime += interaction.timeSpent || 0;
      if (interaction.completed) completedCount++;
    });

    // Calculate averages
    profile.averageTimeSpent = totalTime / interactions.length;
    profile.completionRate = completedCount / interactions.length;

    // Identify preferred topics (top 3)
    profile.preferredTopics = Object.entries(profile.topicFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    // Identify weak areas (low completion rate topics)
    const topicCompletions = {};
    interactions.forEach(interaction => {
      if (!topicCompletions[interaction.topic]) {
        topicCompletions[interaction.topic] = { total: 0, completed: 0 };
      }
      topicCompletions[interaction.topic].total++;
      if (interaction.completed) {
        topicCompletions[interaction.topic].completed++;
      }
    });

    profile.weakAreas = Object.entries(topicCompletions)
      .filter(([topic, stats]) => stats.total >= 3 && stats.completed / stats.total < 0.5)
      .map(([topic]) => topic);

    return profile;
  }

  /**
   * Get predictions from federated learning model
   */
  async getPredictionsFromModel(userId, userProfile) {
    try {
      // Get the latest recommendation model
      const modelData = await federatedLearningService.getLatestModel('recommendation');

      // Prepare input features
      const inputFeatures = this.prepareInputFeatures(userProfile);

      // Generate predictions
      const predictions = await federatedLearningService.generatePredictions(
        userId,
        'recommendation',
        inputFeatures
      );

      return {
        modelId: modelData.modelId,
        version: modelData.version,
        scores: predictions
      };
    } catch (error) {
      console.log('Federated model not available, using fallback recommendations');
      // Return default scores if model is not ready
      return {
        modelId: 'fallback',
        version: 0,
        scores: Array(this.topicDatabase.length).fill(0.5)
      };
    }
  }

  /**
   * Prepare input features for the model
   */
  prepareInputFeatures(userProfile) {
    // Create a feature vector
    const features = [
      // Difficulty preferences (normalized)
      userProfile.difficultyDistribution.beginner / userProfile.totalInteractions,
      userProfile.difficultyDistribution.intermediate / userProfile.totalInteractions,
      userProfile.difficultyDistribution.advanced / userProfile.totalInteractions,
      
      // Completion rate
      userProfile.completionRate,
      
      // Average time spent (normalized to 0-1)
      Math.min(userProfile.averageTimeSpent / 3600, 1),
      
      // Topic diversity (number of unique topics)
      Object.keys(userProfile.topicFrequency).length / 10,
      
      // Interaction type distribution
      (userProfile.interactionTypes.chatbot || 0) / userProfile.totalInteractions,
      (profile.interactionTypes.roadmap || 0) / userProfile.totalInteractions,
      (userProfile.interactionTypes.checklist || 0) / userProfile.totalInteractions,
      
      // Total activity level (normalized)
      Math.min(userProfile.totalInteractions / 100, 1)
    ];

    return features;
  }

  /**
   * Combine model predictions with content-based filtering
   */
  async combineRecommendations(userProfile, modelPredictions) {
    const recommendations = [];

    // Score each topic in the database
    this.topicDatabase.forEach((topic, index) => {
      let score = modelPredictions.scores[index] || 0.5;

      // Adjust score based on user profile
      
      // Boost topics related to user's preferred topics
      if (userProfile.preferredTopics.some(pref => topic.topics.includes(pref))) {
        score *= 1.2;
      }

      // Boost topics that match user's difficulty level
      const userDiffLevel = this.getUserDifficultyLevel(userProfile);
      if (topic.difficulty === userDiffLevel) {
        score *= 1.15;
      }

      // Penalize if prerequisites not met
      const hasPrerequisites = topic.prerequisites.every(prereq =>
        userProfile.topicFrequency[prereq] > 0
      );
      if (!hasPrerequisites && topic.prerequisites.length > 0) {
        score *= 0.5;
      }

      // Penalize already mastered topics (high frequency and completion)
      if (userProfile.topicFrequency[topic.id] > 5) {
        score *= 0.7;
      }

      recommendations.push({
        type: 'topic',
        item: {
          id: topic.id,
          title: topic.title,
          description: topic.description,
          metadata: {
            topics: topic.topics,
            prerequisites: topic.prerequisites
          }
        },
        score: Math.min(score, 1),
        reasoning: this.generateReasoning(topic, userProfile, score),
        difficulty: topic.difficulty,
        estimatedTime: topic.estimatedTime,
        prerequisites: topic.prerequisites
      });
    });

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Determine user's current difficulty level
   */
  getUserDifficultyLevel(userProfile) {
    const dist = userProfile.difficultyDistribution;
    const total = dist.beginner + dist.intermediate + dist.advanced;

    if (total === 0) return 'beginner';

    const advancedRatio = dist.advanced / total;
    const intermediateRatio = dist.intermediate / total;

    if (advancedRatio > 0.4) return 'advanced';
    if (intermediateRatio > 0.4) return 'intermediate';
    return 'beginner';
  }

  /**
   * Generate reasoning for a recommendation
   */
  generateReasoning(topic, userProfile, score) {
    const reasons = [];

    if (userProfile.preferredTopics.some(pref => topic.topics.includes(pref))) {
      reasons.push('matches your interests');
    }

    if (topic.difficulty === this.getUserDifficultyLevel(userProfile)) {
      reasons.push('suitable for your level');
    }

    if (userProfile.weakAreas.includes(topic.id)) {
      reasons.push('helps strengthen weak areas');
    }

    if (score > 0.8) {
      reasons.push('highly recommended by our AI');
    }

    return reasons.length > 0 
      ? `Recommended because it ${reasons.join(' and ')}.`
      : 'Suggested based on your learning pattern.';
  }

  /**
   * Generate a structured learning path
   */
  generateLearningPath(userProfile, recommendations) {
    const path = [];
    const userLevel = this.getUserDifficultyLevel(userProfile);

    // Start with current level topics
    const currentLevelTopics = recommendations.filter(
      rec => rec.difficulty === userLevel
    ).slice(0, 3);

    currentLevelTopics.forEach((rec, index) => {
      const topic = this.topicDatabase.find(t => t.id === rec.item.id);
      if (topic) {
        path.push({
          sequence: index + 1,
          topic: topic.title,
          subtopics: topic.topics,
          resources: this.resourceDatabase
            .filter(r => r.topic === topic.id)
            .map(r => r.id),
          estimatedDuration: Math.ceil(topic.estimatedTime / 60) // hours
        });
      }
    });

    // Add progression topics
    const nextLevel = userLevel === 'beginner' ? 'intermediate' : 'advanced';
    const progressionTopics = recommendations.filter(
      rec => rec.difficulty === nextLevel
    ).slice(0, 2);

    progressionTopics.forEach((rec, index) => {
      const topic = this.topicDatabase.find(t => t.id === rec.item.id);
      if (topic) {
        path.push({
          sequence: currentLevelTopics.length + index + 1,
          topic: topic.title,
          subtopics: topic.topics,
          resources: this.resourceDatabase
            .filter(r => r.topic === topic.id)
            .map(r => r.id),
          estimatedDuration: Math.ceil(topic.estimatedTime / 60)
        });
      }
    });

    return path;
  }

  /**
   * Generate personalized insights
   */
  generateInsights(userProfile, interactions) {
    const insights = {
      strongAreas: [],
      improvementAreas: [],
      suggestedFocus: '',
      learningStyle: '',
      progressPrediction: 0
    };

    // Identify strong areas (high completion rate)
    const topicStats = {};
    interactions.forEach(interaction => {
      if (!topicStats[interaction.topic]) {
        topicStats[interaction.topic] = { total: 0, completed: 0, avgScore: 0, scores: [] };
      }
      topicStats[interaction.topic].total++;
      if (interaction.completed) topicStats[interaction.topic].completed++;
      if (interaction.score) topicStats[interaction.topic].scores.push(interaction.score);
    });

    Object.entries(topicStats).forEach(([topic, stats]) => {
      const completionRate = stats.completed / stats.total;
      const avgScore = stats.scores.length > 0
        ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
        : 0;

      if (completionRate > 0.7 && avgScore > 75) {
        insights.strongAreas.push(topic);
      } else if (completionRate < 0.4 || avgScore < 50) {
        insights.improvementAreas.push(topic);
      }
    });

    // Determine learning style
    const interactionTypes = userProfile.interactionTypes;
    const totalInteractions = Object.values(interactionTypes).reduce((a, b) => a + b, 0);
    
    if (interactionTypes.video_watch / totalInteractions > 0.5) {
      insights.learningStyle = 'visual';
    } else if (interactionTypes.quiz / totalInteractions > 0.4) {
      insights.learningStyle = 'practice-oriented';
    } else if (interactionTypes.chatbot / totalInteractions > 0.4) {
      insights.learningStyle = 'interactive';
    } else {
      insights.learningStyle = 'balanced';
    }

    // Suggest focus area
    if (insights.improvementAreas.length > 0) {
      insights.suggestedFocus = `Focus on improving: ${insights.improvementAreas[0]}`;
    } else if (userProfile.preferredTopics.length > 0) {
      insights.suggestedFocus = `Continue advancing in: ${userProfile.preferredTopics[0]}`;
    } else {
      insights.suggestedFocus = 'Explore new topics to broaden your knowledge';
    }

    // Predict progress (simple heuristic)
    const recentCompletionRate = interactions.slice(0, 20)
      .filter(i => i.completed).length / Math.min(20, interactions.length);
    insights.progressPrediction = Math.min(recentCompletionRate * 100, 95);

    return insights;
  }

  /**
   * Generate beginner recommendations for new users
   */
  async generateBeginnerRecommendations(userId) {
    const beginnerTopics = this.topicDatabase.filter(
      topic => topic.difficulty === 'beginner' && topic.prerequisites.length === 0
    );

    const recommendations = beginnerTopics.map(topic => ({
      type: 'topic',
      item: {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        metadata: { topics: topic.topics }
      },
      score: 0.8,
      reasoning: 'Great starting point for beginners',
      difficulty: topic.difficulty,
      estimatedTime: topic.estimatedTime,
      prerequisites: []
    }));

    const learningPath = beginnerTopics.slice(0, 3).map((topic, index) => ({
      sequence: index + 1,
      topic: topic.title,
      subtopics: topic.topics,
      resources: [],
      estimatedDuration: Math.ceil(topic.estimatedTime / 60)
    }));

    const userRecommendation = new UserRecommendation({
      userId,
      modelId: 'default',
      modelVersion: 0,
      recommendations,
      learningPath,
      personalizedInsights: {
        strongAreas: [],
        improvementAreas: [],
        suggestedFocus: 'Start with the basics and build a strong foundation',
        learningStyle: 'exploratory',
        progressPrediction: 80
      }
    });

    await userRecommendation.save();
    return userRecommendation;
  }

  /**
   * Get latest recommendations for a user
   */
  async getLatestRecommendations(userId) {
    return UserRecommendation.findOne({ userId })
      .sort({ createdAt: -1 })
      .limit(1);
  }

  /**
   * Record user feedback on recommendations
   */
  async recordFeedback(userId, recommendationId, feedback) {
    try {
      const recommendation = await UserRecommendation.findById(recommendationId);
      
      if (!recommendation || recommendation.userId.toString() !== userId.toString()) {
        throw new Error('Recommendation not found');
      }

      recommendation.userFeedback = {
        ...recommendation.userFeedback,
        ...feedback,
        timestamp: new Date()
      };

      await recommendation.save();
      return recommendation;
    } catch (error) {
      console.error('Error recording feedback:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new RecommendationService();
