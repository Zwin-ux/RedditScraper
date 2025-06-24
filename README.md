# 🔍 Reddit Scraper & Analysis Tool

A powerful TypeScript-based Reddit scraping and analysis tool that provides comprehensive data extraction, user profiling, and subreddit analysis capabilities.

![GitHub](https://img.shields.io/github/license/Zwin-ux/RedditScraper)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)

## ✨ Features

- **User Profile Analysis**: Extract and analyze Reddit user profiles, including karma, account age, and activity patterns
- **Subreddit Monitoring**: Track posts, comments, and trends in any subreddit
- **Advanced Search**: Powerful search capabilities with filtering by time, popularity, and content type
- **Rate Limiting**: Built-in rate limiting to respect Reddit's API guidelines
- **Caching**: Intelligent caching system to minimize redundant API calls
- **Type Safety**: Fully typed with TypeScript for better developer experience
- **Modular Architecture**: Designed for extensibility and maintainability

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Reddit API credentials (optional for public endpoints)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/reddit-scraper.git
cd reddit-scraper

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
```

### Configuration

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Reddit API Configuration (optional)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=your_user_agent

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=30  # 30 requests per window

# Caching
CACHE_TTL_SUBREDDIT=3600  # 1 hour
CACHE_TTL_USER_PROFILE=86400  # 24 hours
```

## 🛠 Usage

### Basic Usage

```typescript
import { redditScraper } from './server/src/services/reddit-scraper';

// Get top posts from a subreddit
const result = await redditScraper.getTopPosts('programming', { limit: 10 });

// Get user profile
const profile = await redditScraper.getUserProfile('username');

// Search posts
const searchResults = await redditScraper.searchPosts('typescript', {
  sort: 'new',
  time: 'month',
  limit: 25
});
```

### Available Methods

- `searchPosts(subreddit, options)`: Search posts in a subreddit
- `getTopPosts(subreddit, options)`: Get top posts from a subreddit
- `getHotPosts(subreddit, options)`: Get hot posts from a subreddit
- `getUserProfile(username, options)`: Get user profile information
- `getUserPosts(username, options)`: Get posts by a specific user

### Running the Demo

```bash
# Start the development server
npm run dev

# Or run the demo script
npm run demo
```

## 🏗 Project Structure

```
reddit-scraper/
├── client/                 # Frontend React application
├── server/                 # Backend server
│   ├── src/
│   │   ├── config/       # Configuration management
│   │   ├── services/      # Core services
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Server entry point
│   └── tsconfig.json      # TypeScript configuration
├── .env.example           # Example environment variables
├── package.json           # Project dependencies
└── README.md              # This file
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter) - your.email@example.com

Project Link: [https://github.com/Zwin-ux/RedditScraper](https://github.com/Zwin-ux/RedditScraper)

## 🙏 Acknowledgments

- [Reddit API](https://www.reddit.com/dev/api/)
- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)
- And all the amazing open-source libraries we depend on!
