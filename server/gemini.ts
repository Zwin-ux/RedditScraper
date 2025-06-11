import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export interface CreatorAnalysis {
  tags: string[];
  summary: string;
  confidence: number;
}

export interface DataScienceTrends {
  topSkills: string[];
  emergingTechnologies: string[];
  careerTrends: string[];
  industryInsights: string[];
  marketDemand: number;
}

export async function analyzeCreatorContent(
  posts: Array<{ title: string; content?: string }>,
  comments: Array<{ content: string; upvotes: number }>
): Promise<CreatorAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const content = posts.map(p => `${p.title} ${p.content || ''}`).join('\n') + 
                   comments.map(c => c.content).join('\n');

    const prompt = `Analyze this Reddit data science content and provide:
1. Relevant tags for the creator (e.g., "Python Expert", "ML Engineer", "Data Analyst")
2. A brief summary of their expertise
3. Confidence score (0-100)

Content: ${content.slice(0, 2000)}

Respond in JSON format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "brief summary",
  "confidence": 85
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        tags: analysis.tags || ["Data Science"],
        summary: analysis.summary || "Data science contributor",
        confidence: Math.min(100, Math.max(0, analysis.confidence || 75))
      };
    }

    return {
      tags: ["Data Science"],
      summary: "Active data science community member",
      confidence: 70
    };
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      tags: ["Data Science"],
      summary: "Data science contributor",
      confidence: 50
    };
  }
}

export async function analyzePostRelevance(title: string, content?: string): Promise<{
  isRelevant: boolean;
  category: string;
  keywords: string[];
  topics: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Analyze this r/datascience post and categorize it:

Title: ${title}
Content: ${content || ''}

Provide:
1. Category (career, programming, machine_learning, visualization, education, discussion)
2. Key topics/technologies mentioned
3. Relevant keywords

Respond in JSON:
{
  "category": "category_name",
  "topics": ["topic1", "topic2"],
  "keywords": ["keyword1", "keyword2"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        isRelevant: true,
        category: analysis.category || 'discussion',
        keywords: analysis.keywords || [],
        topics: analysis.topics || []
      };
    }

    return {
      isRelevant: true,
      category: 'discussion',
      keywords: [],
      topics: []
    };
  } catch (error) {
    console.error("Gemini post analysis failed:", error);
    return {
      isRelevant: true,
      category: 'discussion',
      keywords: [],
      topics: []
    };
  }
}

export async function analyzeDataScienceTrends(posts: Array<{title: string, content?: string}>): Promise<DataScienceTrends> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const postsText = posts.slice(0, 20).map(p => `${p.title} ${p.content || ''}`).join('\n');

    const prompt = `Analyze these r/datascience posts to identify current trends:

${postsText.slice(0, 3000)}

Identify:
1. Top in-demand skills mentioned
2. Emerging technologies/tools
3. Career trends and advice
4. Industry insights
5. Overall market demand level (1-100)

Respond in JSON:
{
  "topSkills": ["Python", "SQL", "Machine Learning"],
  "emergingTechnologies": ["tool1", "tool2"],
  "careerTrends": ["trend1", "trend2"], 
  "industryInsights": ["insight1", "insight2"],
  "marketDemand": 85
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const trends = JSON.parse(jsonMatch[0]);
      return {
        topSkills: trends.topSkills || ["Python", "SQL", "Statistics"],
        emergingTechnologies: trends.emergingTechnologies || ["LLMs", "MLOps"],
        careerTrends: trends.careerTrends || ["Remote work", "Specialization"],
        industryInsights: trends.industryInsights || ["High demand", "Evolving field"],
        marketDemand: Math.min(100, Math.max(0, trends.marketDemand || 80))
      };
    }

    return {
      topSkills: ["Python", "SQL", "Machine Learning"],
      emergingTechnologies: ["AI/ML", "Cloud Computing"],
      careerTrends: ["Increased demand", "Specialization"],
      industryInsights: ["Growing field", "Skills gap"],
      marketDemand: 80
    };
  } catch (error) {
    console.error("Gemini trends analysis failed:", error);
    return {
      topSkills: ["Python", "SQL", "Statistics"],
      emergingTechnologies: ["AI/ML", "Cloud"],
      careerTrends: ["High demand"],
      industryInsights: ["Growing field"],
      marketDemand: 75
    };
  }
}