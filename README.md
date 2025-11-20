# Lead Processing Agent

AI-powered lead validation, enrichment, and scoring with real-time workflow tracking. Built with Next.js, AI SDK, and TypeScript.

## Features

- **Modern Chat Interface**: Production-quality chat UI inspired by AI SDK Elements with avatars, improved styling, and better UX
- **AI Agent with Tools**: Agent can submit, validate, enrich, score, and process leads
- **Manual Workflow Refresh**: Click-to-refresh workflow status (no automatic polling)
- **Multiple Workflows**:
  - **Submit**: Add new leads to the system
  - **Validate**: Check email format and domain validity
  - **Enrich**: Add company information and data enrichment
  - **Score**: Calculate lead score and determine qualification
  - **Process**: Run complete workflow (validate + enrich + score)
- **Multi-Provider LLM Support**: Use OpenAI or OpenRouter with free models
- **Enhanced Settings**: Improved settings panel with environment variable support for `OPENROUTER_API_KEY`
- **Free Models Only**: OpenRouter integration shows only free models to avoid unexpected costs
- **Persistent Settings**: Configure via environment variables for deployment persistence
- **TypeScript**: Full type safety throughout the application
- **Testing**: Unit tests with Jest and E2E tests with Playwright
- **Modern UI**: Responsive design with Tailwind CSS and dark mode support

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rothnic/nextjs-agentic-workflow.git
cd nextjs-agentic-workflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and configure your preferred LLM provider:

#### Option 1: OpenAI (Default)
```env
OPENAI_API_KEY=your_openai_api_key_here
LLM_PROVIDER=openai
```

#### Option 2: OpenRouter
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=your_preferred_model_id
LLM_PROVIDER=openrouter
```

**Note**: You can also configure the LLM provider through the Settings UI (⚙️ button in the top-right corner) instead of using environment variables. Client-side settings take precedence over server-side configuration.

### Required Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Yes (if using OpenAI) | - |
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes (if using OpenRouter) | - |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL | No | `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL` | Model ID to use with OpenRouter | Yes (if using OpenRouter) | - |
| `LLM_PROVIDER` | Provider selection: `openai` or `openrouter` | No | `openai` |
| `REDIS_URL` | Redis connection URL for persistent workflow tracking | Yes (for production) | - |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Bypass token for Vercel deployment protection | Yes (for Vercel deployments with protection) | - |

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

### Deployment

For deploying to Vercel or other platforms, see the [Deployment Guide](./DEPLOYMENT.md) for important information about:
- Setting up Redis for persistent workflow tracking
- Setting up Vercel deployment protection bypass
- Configuring environment variables for production
- Troubleshooting 401 authentication errors

## UI Components and Design

This application features a modern chat interface inspired by [AI SDK Elements](https://ai-sdk.dev/elements). For detailed information about the UI implementation and design patterns, see the [AI Elements Usage Guide](./AI_ELEMENTS_GUIDE.md).

Key UI improvements include:
- Message avatars for better visual hierarchy
- Enhanced tool invocation displays
- Modern input area with improved styling
- Better loading states and animations
- Production-quality settings panel

## Usage

### LLM Configuration

The application supports two ways to configure your LLM provider:

#### 1. Environment Variables (Server-side)
Configure in `.env.local` as described in the installation section. This is recommended for production deployments.

#### 2. Settings UI (Client-side)
Click the **Settings** button in the top-right corner to:
- Switch between OpenAI and OpenRouter
- Enter your API key (stored securely in browser localStorage)
- For OpenRouter: Browse and select from available **free models only**
- View free models sorted by popularity at [OpenRouter Models](https://openrouter.ai/models?fmt=cards&max_price=0&order=top-weekly)

**💡 Server Configuration**: The API route can use `OPENROUTER_API_KEY` from your server environment variables (`.env.local` or deployment settings). This avoids the need to enter it in the UI each time.

**Priority**: Client-side settings override server-side environment variables. For persistent settings across deployments, configure environment variables on your hosting platform (e.g., Vercel, Railway).

### Chat Commands

The AI agent understands natural language. Here are some example commands:

- "Submit new lead: john@example.com, John Doe, Acme Corp"
- "Validate lead: john@example.com, John Doe, Acme Corp"
- "Enrich lead: jane@techcorp.com, Jane Smith, TechCorp"
- "Score lead: bob@startup.io, Bob Johnson, Startup Inc, +1234567890"
- "Process lead: alice@company.com, Alice Brown, Company LLC"

The agent will automatically:
1. Parse the lead information
2. Execute the appropriate action or workflow
3. Trigger automatic refresh of the workflow status panel
4. Return results and insights

### Workflow Status Panel

The right panel shows:
- Recent workflow executions (last 5)
- Step-by-step progress with status indicators
- Execution time for each step
- Overall workflow duration
- Success/failure states

**Refresh Behavior:**
- **Manual refresh**: Click the "↻ Refresh" button to update workflow status
- **Auto-refresh**: Status panel automatically refreshes when workflows are triggered from chat
- **No polling**: Eliminates unnecessary API calls when idle

## Testing

### Unit Tests

Run unit tests with Jest:
```bash
npm test
```

Watch mode for development:
```bash
npm run test:watch
```

### E2E Tests

Run end-to-end tests with Playwright:
```bash
npm run test:e2e
```

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/          # AI agent API route with tool calling
│   │   └── workflows/     # Workflow status API
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ChatInterface.tsx  # Chat UI component
│   └── WorkflowStatus.tsx # Real-time workflow tracking UI
├── lib/
│   ├── types/
│   │   └── workflow.ts    # TypeScript type definitions
│   └── workflows/
│       └── lead-workflows.ts  # Workflow implementations
├── __tests__/             # Unit tests
├── e2e/                   # E2E tests
└── public/                # Static assets
```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **AI**: Vercel AI SDK with OpenAI GPT-4
- **Styling**: Tailwind CSS 4
- **Testing**: Jest + React Testing Library + Playwright
- **State Management**: React hooks
- **Real-time Updates**: Polling with fetch API

## Workflows

### Validate Lead
1. Validate email format
2. Check domain validity
3. Finalize validation

### Enrich Lead
1. Fetch company data
2. Enrich lead profile
3. Update lead record

### Score Lead
1. Gather lead data
2. Calculate score (0-100)
3. Determine qualification (threshold: 60)

### Process Lead
Runs all workflows in sequence: Validate → Enrich → Score

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run linting and tests
5. Submit a pull request

## License

MIT

## Acknowledgments

Based on the Vercel AI SDK lead processing agent template.
