# Deployment Guide

## Vercel KV Setup (Required for Persistent Workflow Tracking)

The application uses Vercel KV (Redis) to store workflow tracking data persistently across serverless function invocations. This ensures workflow status is visible in the UI even after the workflow completes.

### Step 1: Create a Vercel KV Database

1. Go to your Vercel project dashboard
2. Navigate to the **Storage** tab
3. Click **Create Database**
4. Select **KV** (Redis)
5. Give it a name (e.g., `nextjs-workflow-kv`)
6. Choose your region
7. Click **Create**

### Step 2: Connect KV to Your Project

Vercel will automatically add the required environment variables to your project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

No manual configuration needed! The application will automatically detect and use KV when these variables are present.

### Local Development

For local development, the application falls back to in-memory storage when KV is not available. To test with KV locally:

1. Copy the environment variables from your Vercel project
2. Add them to your `.env.local` file
3. Run `npm run dev`

### Free Tier

Vercel KV has a generous free tier:
- **30 MB** storage
- **100,000** monthly requests
- Perfect for development and small applications

## Vercel Deployment Protection

### Issue

When deployed to Vercel with deployment protection enabled, server-to-server API calls (e.g., from the chat API to workflow APIs) may fail with a 401 authentication error. This happens because internal API requests go through the public URL and are blocked by Vercel's authentication layer.

### Solution

To fix this issue, you need to set up a Vercel automation bypass secret:

#### Step 1: Get Your Deployment Protection Bypass Token

1. Go to your Vercel project settings
2. Navigate to **Deployment Protection**
3. Find the **Automation Bypass** section
4. Copy your bypass secret (it looks like: `xxxxxxxxxxxxxxxxxxxxxx`)

Alternatively, you can create a bypass secret by following the instructions at:
https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation

#### Step 2: Add Environment Variable

Add the bypass secret to your Vercel project as an environment variable:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add a new variable:
   - **Name**: `VERCEL_AUTOMATION_BYPASS_SECRET`
   - **Value**: Your bypass secret from Step 1
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**

#### Step 3: Redeploy

After adding the environment variable, redeploy your application:

```bash
git push
```

Or manually trigger a redeploy from the Vercel dashboard.

### How It Works

The application automatically detects the `VERCEL_AUTOMATION_BYPASS_SECRET` environment variable and includes it in internal API requests via the `x-vercel-protection-bypass` header. This allows server-side workflow triggers to bypass deployment protection authentication.

See the implementation in `app/api/chat/route.ts`:

```typescript
// Add Vercel automation bypass secret if available (for deployment protection)
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}
```

### Local Development

This fix does not affect local development. When running locally, the application uses `localhost:3000` for internal requests, which doesn't require authentication.

### Security Note

The automation bypass secret should be kept secure and only used for legitimate internal API calls. Never expose this secret in client-side code or public repositories.

## Alternative: Disable Deployment Protection

If you don't need deployment protection, you can disable it in your Vercel project settings:

1. Go to your Vercel project settings
2. Navigate to **Deployment Protection**
3. Set protection level to **None** or configure it to allow your specific use case

**Note**: Disabling deployment protection may expose your preview deployments publicly. Use the bypass secret approach instead if you want to maintain security.
