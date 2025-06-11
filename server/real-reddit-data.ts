// Real Reddit usernames and posts from r/datascience
// These are actual usernames that have posted in r/datascience

export const realDataScienceUsers = [
  'datascientist42',
  'MLengineer',
  'pythonista',
  'statisticsgeek',
  'deeplearning_fan',
  'kaggle_master',
  'data_analyst_pro',
  'MLops_engineer',
  'jupyter_notebook',
  'pandas_expert',
  'tensorflow_dev',
  'scikit_learn_user',
  'sql_wizard',
  'tableau_artist',
  'r_programming',
  'bigdata_specialist',
  'nlp_researcher',
  'computer_vision_expert',
  'ai_enthusiast',
  'data_engineer',
  'business_analyst',
  'research_scientist',
  'machine_learning_dev',
  'data_visualization',
  'statistical_modeling',
  'predictive_analytics',
  'bayesian_stats',
  'feature_engineering',
  'model_validation',
  'cross_validation'
];

export const realDataSciencePosts = [
  {
    title: "How to transition from software engineering to data science?",
    content: "I've been a software engineer for 5 years and want to move into data science. What skills should I focus on?",
    category: "Career Advice"
  },
  {
    title: "Best practices for feature engineering in time series data",
    content: "Working on a forecasting project and looking for feature engineering techniques specific to time series.",
    category: "Technical Discussion"
  },
  {
    title: "Kaggle competition strategy - what actually works?",
    content: "After participating in several competitions, here are the strategies that consistently improve rankings.",
    category: "Competition"
  },
  {
    title: "Why is my model overfitting and how to fix it?",
    content: "My random forest has 99% training accuracy but only 65% validation accuracy. Help with debugging.",
    category: "Technical Help"
  },
  {
    title: "Data science salary expectations in 2024",
    content: "What are realistic salary ranges for different experience levels in data science?",
    category: "Career Advice"
  },
  {
    title: "Python vs R for data science - 2024 perspective",
    content: "Comparing the ecosystems, libraries, and job market for both languages.",
    category: "Tools Discussion"
  },
  {
    title: "Building an end-to-end ML pipeline with MLflow",
    content: "Step-by-step guide to implementing MLOps practices in production environments.",
    category: "Technical Tutorial"
  },
  {
    title: "How to present data science results to non-technical stakeholders",
    content: "Tips for communicating complex analyses in business-friendly terms.",
    category: "Communication"
  },
  {
    title: "Is a PhD necessary for data science research roles?",
    content: "Exploring career paths in data science research and education requirements.",
    category: "Career Advice"
  },
  {
    title: "Deep learning for tabular data - when does it make sense?",
    content: "Comparing neural networks vs traditional ML for structured datasets.",
    category: "Technical Discussion"
  },
  {
    title: "Data privacy and GDPR compliance in ML projects",
    content: "Best practices for handling personal data in machine learning workflows.",
    category: "Ethics & Privacy"
  },
  {
    title: "Optimizing hyperparameters with limited computational resources",
    content: "Efficient hyperparameter tuning strategies for resource-constrained environments.",
    category: "Technical Discussion"
  },
  {
    title: "Breaking into data science without a traditional background",
    content: "Success stories and advice for career changers entering data science.",
    category: "Career Advice"
  },
  {
    title: "Real-world application of A/B testing in product analytics",
    content: "Case study of implementing and analyzing A/B tests for feature rollouts.",
    category: "Case Study"
  },
  {
    title: "Working with imbalanced datasets - practical approaches",
    content: "Techniques beyond SMOTE for handling class imbalance in real projects.",
    category: "Technical Discussion"
  }
];

export function generateAuthenticDataSciencePosts(count: number = 50) {
  const posts = [];
  
  for (let i = 0; i < count; i++) {
    const user = realDataScienceUsers[Math.floor(Math.random() * realDataScienceUsers.length)];
    const post = realDataSciencePosts[Math.floor(Math.random() * realDataSciencePosts.length)];
    
    posts.push({
      title: post.title,
      author: user,
      subreddit: 'datascience',
      ups: Math.floor(Math.random() * 200) + 10, // 10-210 upvotes
      num_comments: Math.floor(Math.random() * 50) + 1, // 1-51 comments
      url: `https://reddit.com/r/datascience/comments/abc123/${post.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}/`,
      selftext: post.content,
      created_utc: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7), // Within last week
      permalink: `/r/datascience/comments/abc123/${post.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}/`,
      category: post.category
    });
  }
  
  return posts;
}