# AI Elements Usage Guide

## Overview

This project has been enhanced with production-quality UI components inspired by [AI SDK Elements](https://ai-sdk.dev/elements). While we couldn't directly install AI Elements due to registry accessibility, we've implemented a modern chat interface following AI Elements design patterns and best practices.

## What Are AI Elements?

AI Elements is a component library built on top of shadcn/ui specifically designed for AI-native applications. It provides pre-built, customizable React components for:

- **Conversations**: Chat containers with auto-scrolling and message management
- **Messages**: Individual message display with role-based styling and avatars
- **Prompt Input**: Advanced input areas with attachments and model selection
- **Tool Visualization**: Display of AI tool usage and results
- **Loading States**: Elegant loading indicators for AI operations
- **Code Blocks**: Syntax-highlighted code with copy functionality
- **Reasoning Display**: Show AI's thought processes step-by-step

## Implementation in This Project

### Chat Interface Improvements

We've implemented the following production-quality features:

#### 1. **Message Display with Avatars**
```tsx
// Avatar component for user and assistant
function Avatar({ role }: { role: string }) {
  return (
    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
      role === 'user' 
        ? 'bg-blue-600 text-white' 
        : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
    }`}>
      {role === 'user' ? 'U' : 'AI'}
    </div>
  );
}
```

#### 2. **Enhanced Tool Invocation Display**
Tool calls are now displayed with:
- Icon indicators
- Clear status badges (Success/Failed)
- Compact execution and lead IDs
- Better visual hierarchy with cards

#### 3. **Modern Input Area**
- Rounded corners and modern styling
- Icon-based send button with loading states
- Better disabled states and transitions
- Responsive design

#### 4. **Improved Loading States**
- Animated dots with staggered timing
- Avatar display during loading
- Clear "Thinking..." indicator

### Settings Panel Enhancements

The settings panel now includes:

#### 1. **OPENROUTER_API_KEY Environment Variable Support**
```tsx
// Tip displayed in the UI
💡 Tip: Set OPENROUTER_API_KEY in your environment to avoid entering it each time.
```

To use this feature, set the environment variable in your deployment:
```bash
# For local development (.env.local)
OPENROUTER_API_KEY=your_key_here

# For production (e.g., Vercel)
# Add via dashboard: Settings → Environment Variables
```

#### 2. **Free Models Only**
The OpenRouter integration now:
- Fetches only free models (pricing = $0)
- Displays "Free only" label
- Links to OpenRouter's free models page
- Shows clear loading states

#### 3. **Better Visual Design**
- Backdrop blur on modal overlay
- Improved spacing and typography
- Icon-based close button
- Colored info boxes with tips

## Key Design Principles Applied

### 1. Visual Hierarchy
- Clear distinction between user and assistant messages
- Prominent avatars for quick role identification
- Tool invocations nested within messages with subtle backgrounds

### 2. Color System
- Blue for user messages and primary actions
- Purple-blue gradient for AI/assistant
- Gray for neutral elements
- Green for success, red for errors

### 3. Spacing and Layout
- Generous whitespace for readability
- Consistent padding and margins
- Max-width containers for optimal reading

### 4. Accessibility
- High contrast ratios
- Clear focus states
- Semantic HTML structure
- ARIA labels where appropriate

## Using Free OpenRouter Models

### Why Free Models?

The project is configured to show only free models from OpenRouter to:
- Avoid unexpected costs during development
- Make the demo accessible to everyone
- Demonstrate the functionality without requiring paid accounts

### Recommended Free Models

OpenRouter provides several free models including:
- Google's Gemini models (gemini-pro, gemini-1.5-flash)
- Meta's Llama models
- Various open-source models

Visit [OpenRouter Models](https://openrouter.ai/models?fmt=cards&max_price=0&order=top-weekly) to see all available free models.

### How to Use

1. Click the **Settings** button in the header
2. Select **OpenRouter** as the provider
3. Enter your OpenRouter API key (or set `OPENROUTER_API_KEY` environment variable)
4. Select from the list of free models
5. Click **Save Settings**

## Component Architecture

### ChatInterface Component
Location: `/components/ChatInterface.tsx`

**Key Features:**
- Uses `useChat` hook from AI SDK
- Auto-scrolls to newest messages
- Handles tool invocations
- Responsive design

**Props:**
```tsx
interface ChatInterfaceProps {
  onWorkflowTriggered?: () => void;
}
```

### SettingsPanel Component
Location: `/components/settings/SettingsPanel.tsx`

**Key Features:**
- Provider selection (OpenAI/OpenRouter)
- API key management with local storage
- Free model filtering for OpenRouter
- Environment variable hints

## Future Enhancements

When AI Elements registry becomes accessible, consider:

1. **Installing AI Elements CLI:**
```bash
npx ai-elements@latest add conversation
npx ai-elements@latest add message
npx ai-elements@latest add prompt-input
```

2. **Using Official Components:**
```tsx
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
```

3. **Additional Features:**
- Reasoning display for chain-of-thought
- Branch visualization for conversation flows
- Web preview components
- File attachments for prompt input

## References

- [AI SDK Elements Documentation](https://ai-sdk.dev/elements)
- [AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [OpenRouter API](https://openrouter.ai/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [shadcn/ui](https://ui.shadcn.com/)

## Best Practices

### 1. Message Handling
- Always provide unique keys for message lists
- Implement auto-scroll for new messages
- Show loading states during AI responses

### 2. Tool Invocations
- Display tool calls with clear visual indicators
- Show execution status (pending/success/failed)
- Provide relevant metadata (IDs, timestamps)

### 3. Error Handling
- Display user-friendly error messages
- Provide fallback UI for failed operations
- Log errors for debugging

### 4. Performance
- Use `useMemo` for expensive computations
- Implement proper loading states
- Optimize re-renders with React best practices

## Troubleshooting

### Settings Not Persisting
Settings are stored in browser localStorage. If they're not persisting:
- Check browser console for errors
- Ensure localStorage is enabled
- Try clearing browser cache

### Models Not Loading
If OpenRouter models don't load:
- Verify API key is correct
- Check network connectivity
- Ensure the API key has proper permissions

### Visual Issues
If the UI looks broken:
- Ensure Tailwind CSS is properly configured
- Check for conflicting CSS
- Verify dark mode is working correctly

## Contributing

When making UI improvements:
1. Follow the existing design patterns
2. Maintain accessibility standards
3. Test in both light and dark modes
4. Ensure responsive behavior
5. Document new features in this guide
