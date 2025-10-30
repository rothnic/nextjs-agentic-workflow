# Lead Processing Agent

AI-powered lead validation, enrichment, and scoring with real-time workflow tracking. Built with Next.js, AI SDK, and TypeScript.

## Features

- **Chat Interface**: Interactive chat powered by AI SDK with natural language processing
- **AI Agent with Tools**: Agent can trigger workflows through tool calling
- **Real-time Workflow Status**: Live tracking of workflow execution with step-by-step progress
- **Multiple Workflows**:
  - **Validate**: Check email format and domain validity
  - **Enrich**: Add company information and data enrichment
  - **Score**: Calculate lead score and determine qualification
  - **Process**: Run complete workflow (validate + enrich + score)
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

## Usage

### LLM Configuration

The application supports two ways to configure your LLM provider:

#### 1. Environment Variables (Server-side)
Configure in `.env.local` as described in the installation section. This is recommended for production deployments.

#### 2. Settings UI (Client-side)
Click the **⚙️ Settings** button in the top-right corner to:
- Switch between OpenAI and OpenRouter
- Enter your API key (stored securely in browser localStorage)
- For OpenRouter: Browse and select from available free models
- View free models sorted by popularity at [OpenRouter Models](https://openrouter.ai/models?fmt=cards&max_price=0&order=top-weekly)

**Priority**: Client-side settings override server-side environment variables.

### Chat Commands

The AI agent understands natural language. Here are some example commands:

- "Validate lead: john@example.com, John Doe, Acme Corp"
- "Enrich lead: jane@techcorp.com, Jane Smith, TechCorp"
- "Score lead: bob@startup.io, Bob Johnson, Startup Inc, +1234567890"
- "Process lead: alice@company.com, Alice Brown, Company LLC"

The agent will automatically:
1. Parse the lead information
2. Execute the appropriate workflow
3. Show real-time progress in the status panel
4. Return results and insights

### Workflow Status Panel

The right panel shows:
- Active and recent workflow executions
- Step-by-step progress with status indicators
- Execution time for each step
- Overall workflow duration
- Success/failure states

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
