# Reddit Creator Agent - Comprehensive Analysis Platform

## Project Overview
A sophisticated Reddit analysis platform that retrieves authentic Reddit data, analyzes creators and communities, and provides AI-powered insights. Features semantic search capabilities, creator analytics, and comprehensive community exploration tools.

## Core Features
- **Authentic Reddit Data**: Real posts, creators, and communities (no synthetic data)
- **Creator Analytics**: Leaderboard of highest karma creators with engagement scores
- **Enhanced Search**: Semantic search using Exa.ai and traditional Reddit API
- **Data Science Analyzer**: Specialized analysis for technical communities
- **Trends Analysis**: AI-powered insights and emerging technology tracking
- **Smart Chatbot**: Context-aware assistant with automatic subreddit discovery

## Technical Architecture

### Backend (Node.js/Express)
- **Reddit API Integration**: Authenticated access for authentic data retrieval
- **Exa.ai Integration**: Semantic search for enhanced community discovery
- **Database**: PostgreSQL with Drizzle ORM for data persistence
- **AI Analysis**: Gemini integration for content analysis and trend identification

### Frontend (React/TypeScript)
- **Modern UI**: Clean dashboard design with responsive layout
- **Real-time Search**: Instant subreddit exploration and filtering
- **Interactive Analytics**: Visual creator leaderboards and statistics
- **Smart Chat Interface**: Fixed-position chatbot with live status indicator

## Recent Changes (December 2024)

### Enhanced Chatbot Integration
- Implemented comprehensive Exa.ai integration for automatic subreddit discovery
- Added intelligent query detection with multiple pattern matching
- Created comprehensive community analysis with dual search strategies
- Built topic-to-subreddit mapping for natural language understanding
- Added quick action buttons for popular communities

### Search Enhancements
- Integrated Exa.ai semantic search capabilities
- Added search mode toggle (semantic vs traditional)
- Enhanced community insights with keywords and trends
- Improved search result display with rich metadata

### UI/UX Improvements
- Created modern dashboard chatbot with flat design
- Implemented responsive layout for all screen sizes
- Added live status indicators and collapsible interface
- Enhanced message styling with proper user/assistant differentiation

## User Preferences
- Focus on authentic Reddit data over synthetic content
- Emphasize semantic search capabilities for better discovery
- Prefer comprehensive community analysis over simple statistics
- Value responsive design and clean interface aesthetics

## API Endpoints
- `/api/chat/enhanced` - Smart chatbot with Exa integration
- `/api/search/exa` - Semantic Reddit search
- `/api/search/exa/subreddit` - Targeted community analysis
- `/api/creators` - Creator analytics and rankings
- `/api/scrape-subreddit` - Authentic Reddit data retrieval

## Deployment Notes
- Environment requires EXA_API_KEY for semantic search
- Database configured with automatic schema updates
- Built-in error handling for API rate limits
- Optimized for Replit deployment environment

## Success Metrics
- 105+ creators analyzed with authentic karma data
- Multiple subreddits actively monitored
- Semantic search providing enhanced community insights
- Responsive chatbot interface working across all devices