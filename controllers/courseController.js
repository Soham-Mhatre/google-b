import Course from '../models/Course.js';
import UserInteraction from '../models/UserInteraction.js';

// Get all courses with filters
export const getCourses = async (req, res) => {
  try {
    const { 
      category, 
      difficulty, 
      search, 
      featured, 
      sort = '-enrollments',
      page = 1,
      limit = 12 
    } = req.query;

    const query = { isActive: true };

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (featured === 'true') query.featured = true;
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const courses = await Course.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments(query);

    res.json({
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Get courses by category
export const getCoursesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { difficulty, sort = '-rating.average', limit = 20 } = req.query;

    const query = { category, isActive: true };
    if (difficulty) query.difficulty = difficulty;

    const courses = await Course.find(query)
      .sort(sort)
      .limit(parseInt(limit));

    res.json({ courses });
  } catch (error) {
    console.error('Error fetching courses by category:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Get course details
export const getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findOne({ courseId, isActive: true });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get related courses
    const relatedCourses = await Course.find({
      category: course.category,
      courseId: { $ne: courseId },
      isActive: true
    })
      .sort('-rating.average')
      .limit(4);

    res.json({ course, relatedCourses });
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
};

// Get all categories with course counts
export const getCategories = async (req, res) => {
  try {
    const categories = await Course.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating.average' }
        } 
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Get featured courses
export const getFeaturedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ featured: true, isActive: true })
      .sort('-rating.average')
      .limit(8);

    res.json({ courses });
  } catch (error) {
    console.error('Error fetching featured courses:', error);
    res.status(500).json({ error: 'Failed to fetch featured courses' });
  }
};

// Get recommended courses for user
export const getRecommendedCourses = async (req, res) => {
  try {
    const userId = req.userId;

    console.log('Generating recommendations for user:', userId);

    // Get user's recent interactions
    const interactions = await UserInteraction.find({ userId })
      .sort('-createdAt')
      .limit(100);

    console.log(`Found ${interactions.length} interactions for user ${userId}`);

    if (interactions.length === 0) {
      // No interactions yet - return featured courses
      const featuredCourses = await Course.find({ featured: true, isActive: true })
        .sort('-rating.average')
        .limit(6);
      
      console.log('No interactions found, returning featured courses');
      return res.json({ courses: featuredCourses, personalized: false });
    }

    // Extract topics and categories from interactions
    const topicFrequency = {};
    interactions.forEach(interaction => {
      const topic = interaction.topic?.toLowerCase() || '';
      if (topic) {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
      }
    });

    console.log('Topic frequency:', topicFrequency);

    // Map topics to course categories with priority
    const categoryScores = {};
    const topicToCategoryMap = {
      'ai': ['Artificial Intelligence', 'Machine Learning'],
      'artificial intelligence': ['Artificial Intelligence', 'Machine Learning'],
      'ml': ['Machine Learning', 'Data Science'],
      'machine learning': ['Machine Learning', 'Data Science'],
      'data': ['Data Science', 'Database'],
      'data science': ['Data Science'],
      'python': ['Programming Languages', 'Data Science'],
      'javascript': ['Web Development', 'Programming Languages'],
      'js': ['Web Development'],
      'react': ['Web Development'],
      'node': ['Web Development'],
      'web': ['Web Development'],
      'game': ['Game Development'],
      'unity': ['Game Development'],
      'security': ['Cybersecurity'],
      'cyber': ['Cybersecurity'],
      'cloud': ['Cloud Computing'],
      'aws': ['Cloud Computing'],
      'azure': ['Cloud Computing'],
      'blockchain': ['Blockchain'],
      'mobile': ['Mobile Development'],
      'android': ['Mobile Development'],
      'ios': ['Mobile Development'],
      'design': ['UI/UX Design'],
      'ui': ['UI/UX Design'],
      'ux': ['UI/UX Design'],
      'database': ['Database'],
      'sql': ['Database'],
      'devops': ['DevOps']
    };

    // Calculate category scores based on interaction frequency
    Object.entries(topicFrequency).forEach(([topic, frequency]) => {
      const topicLower = topic.toLowerCase();
      for (const [key, categories] of Object.entries(topicToCategoryMap)) {
        if (topicLower.includes(key) || key.includes(topicLower)) {
          categories.forEach(category => {
            categoryScores[category] = (categoryScores[category] || 0) + frequency;
          });
        }
      }
    });

    console.log('Category scores:', categoryScores);

    // Get top categories sorted by score
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);

    console.log('Top categories:', sortedCategories);

    let recommendedCourses = [];

    if (sortedCategories.length > 0) {
      // Get courses from top categories, weighted by score
      const topCategories = sortedCategories.slice(0, 5);
      
      const coursesFromCategories = await Course.find({
        category: { $in: topCategories },
        isActive: true
      }).sort('-rating.average');

      console.log(`Found ${coursesFromCategories.length} courses from top categories`);

      // Score each course based on category match strength
      const scoredCourses = coursesFromCategories.map(course => {
        const categoryScore = categoryScores[course.category] || 0;
        const ratingScore = course.rating.average * 2;
        const popularityScore = Math.log10(course.enrollments + 1);
        
        const totalScore = categoryScore * 10 + ratingScore + popularityScore;
        
        return {
          course,
          score: totalScore
        };
      });

      // Sort by score and get top courses
      recommendedCourses = scoredCourses
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(item => item.course);

      console.log('Recommended courses:', recommendedCourses.map(c => ({
        title: c.title,
        category: c.category,
        score: scoredCourses.find(sc => sc.course._id.equals(c._id))?.score
      })));
    }

    // If not enough recommendations, add popular courses
    if (recommendedCourses.length < 6) {
      const existingIds = recommendedCourses.map(c => c.courseId);
      const popularCourses = await Course.find({
        isActive: true,
        courseId: { $nin: existingIds }
      })
        .sort('-enrollments')
        .limit(6 - recommendedCourses.length);

      console.log(`Adding ${popularCourses.length} popular courses to reach minimum`);
      recommendedCourses = [...recommendedCourses, ...popularCourses];
    }

    // Limit to 6 courses for display
    const finalCourses = recommendedCourses.slice(0, 6);
    console.log(`Returning ${finalCourses.length} personalized courses for user ${userId}`);

    res.json({ courses: finalCourses, personalized: true });
  } catch (error) {
    console.error('Error fetching recommended courses:', error);
    res.status(500).json({ error: 'Failed to fetch recommended courses' });
  }
};

// Record course enrollment/view
export const recordCourseInteraction = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, interactionType } = req.body;

    const course = await Course.findOne({ courseId });
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Record interaction
    const interaction = new UserInteraction({
      userId,
      sessionId: req.headers['x-session-id'] || 'default',
      interactionType: interactionType || 'course_view',
      topic: course.category,
      subtopic: course.title,
      difficulty: course.difficulty.toLowerCase(),
      metadata: {
        courseId: course.courseId,
        tags: course.tags
      }
    });

    await interaction.save();

    // Update enrollment count if it's an enrollment
    if (interactionType === 'course_enroll') {
      course.enrollments += 1;
      await course.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording course interaction:', error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
};
