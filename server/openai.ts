import OpenAI from "openai";

/*
Follow these instructions when using this blueprint:
1. Note that the newest OpenAI model is "gpt-4o", not "gpt-4". gpt-4o was released after your knowledge cutoff. Always prefer using gpt-4o as it is the latest model. When copying code from this blueprint, ensure you also mention this information verbatim as a comment so that you don't revert it to "gpt-4": `// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user`
2. Use the response_format: { type: "json_object" } option
3. Request output in JSON format in the prompt
*/

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.API_KEY 
});

export interface CreatorAnalysis {
  tags: string[];
  summary: string;
  confidence: number;
}

export async function analyzeCreatorContent(
  posts: Array<{ title: string; content?: string; upvotes: number }>,
  comments: Array<{ content: string; upvotes: number }>
): Promise<CreatorAnalysis> {
  try {
    const contentSample = [
      ...posts.slice(0, 5).map(p => `POST: ${p.title} ${p.content || ''} (${p.upvotes} upvotes)`),
      ...comments.slice(0, 10).map(c => `COMMENT: ${c.content} (${c.upvotes} upvotes)`)
    ].join('\n\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI content analyst specializing in identifying AI/ML creators on Reddit. 
          Analyze the content and classify the creator into relevant tags. 
          
          Available tags: "Prompt Engineer", "AI Tools Builder", "Research Explainer", "Opinion Leader", "Open Source", "Python Developer", "LLM Expert", "Computer Vision", "Data Scientist", "ML Engineer", "AI Researcher", "Tech Influencer"
          
          Respond with JSON in this format: 
          {
            "tags": ["tag1", "tag2", "tag3"],
            "summary": "Brief summary of creator's focus and expertise",
            "confidence": 0.85
          }
          
          Confidence should be between 0.0 and 1.0 based on how clear the creator's specialization is from their content.`
        },
        {
          role: "user",
          content: `Analyze this Reddit creator's content and provide classification:

${contentSample}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
      summary: result.summary || "No summary available",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
    };
  } catch (error) {
    console.error("Failed to analyze creator content:", error);
    return {
      tags: ["AI Enthusiast"],
      summary: "Content analysis unavailable",
      confidence: 0.1
    };
  }
}

export async function analyzePostRelevance(title: string, content?: string): Promise<{
  isRelevant: boolean;
  topics?: string[];
  category?: string;
  keywords: string[];
  confidence: number;
}> {
  try {
    const text = `Title: ${title}\nContent: ${content || ''}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert data science content analyzer for r/datascience posts.
          
          Analyze posts and categorize them by topic, content type, and extract key insights.
          
          Focus on: data science, machine learning, statistics, analytics, Python, R, SQL, career advice, tools (pandas, scikit-learn, etc.), visualization, big data, cloud platforms, business intelligence, research methods.
          
          Respond with JSON:
          {
            "isRelevant": true/false,
            "topics": ["specific topics"],
            "category": "career|technical|tools|discussion|project|education|industry|question|resource",
            "keywords": ["keyword1", "keyword2"],
            "confidence": 0.85
          }`
        },
        {
          role: "user",
          content: `Analyze this r/datascience post: ${text}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      isRelevant: result.isRelevant !== false,
      topics: Array.isArray(result.topics) ? result.topics : [],
      category: result.category || 'general',
      keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 10) : [],
      confidence: Math.max(0, Math.min(1, result.confidence || 0.8))
    };
  } catch (error) {
    console.error("Failed to analyze post relevance:", error);
    return {
      isRelevant: true,
      topics: [],
      category: 'general',
      keywords: [],
      confidence: 0.5
    };
  }
}

export async function analyzeDataScienceTrends(posts: Array<{title: string, content?: string}>): Promise<{
  emergingTopics: string[];
  skillDemands: string[];
  industryInsights: string[];
  careerTrends: string[];
  toolsAndTechnologies: string[];
}> {
  try {
    const postsText = posts.slice(0, 30).map(p => `${p.title}\n${p.content || ''}`).join('\n\n---\n\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a data science industry analyst. Analyze r/datascience posts to identify trends, emerging topics, skill demands, and career insights.
          
          Focus on current industry developments, popular tools, career advice patterns, and technical discussions.`
        },
        {
          role: "user",
          content: `Analyze these r/datascience posts and identify key trends. Respond with JSON:
          {
            "emergingTopics": ["new concepts, methodologies, or focus areas"],
            "skillDemands": ["technical skills and tools in high demand"],
            "industryInsights": ["market trends, company practices, industry changes"],
            "careerTrends": ["career advice, job market insights, salary discussions"],
            "toolsAndTechnologies": ["popular tools, libraries, platforms being discussed"]
          }
          
          Posts: ${postsText}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      emergingTopics: result.emergingTopics || [],
      skillDemands: result.skillDemands || [],
      industryInsights: result.industryInsights || [],
      careerTrends: result.careerTrends || [],
      toolsAndTechnologies: result.toolsAndTechnologies || []
    };
  } catch (error) {
    console.error('Failed to analyze data science trends:', error);
    return {
      emergingTopics: [],
      skillDemands: [],
      industryInsights: [],
      careerTrends: [],
      toolsAndTechnologies: []
    };
  }
}
