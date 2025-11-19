# Deployment Guide

## Redis Setup (Required for Persistent Workflow Tracking)

The application uses Redis to store workflow tracking data persistently across serverless function invocations. This ensures workflow status is visible in the UI even after the workflow completes.

### Step 1: Set Up Redis Database

You can use any Redis provider. Recommended options:

#### Option 1: Vercel Redis (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to the **Storage** tab
3. Click **Create Database**
4. Select **Redis**
5. Give it a name (e.g., `nextjs-workflow-redis`)
6. Choose your region
7. Click **Create**

#### Option 2: Upstash Redis (Free Tier Available)
1. Go to [upstash.com](https://upstash.com)
2. Create a free account
3. Create a new Redis database
4. Copy your Redis URL with authentication

### Step 2: Configure Environment Variable

Add the following environment variable to your Vercel project:

**Environment Variable:**
- `KV_REST_API_REDIS_URL` - Your Redis connection URL (includes authentication)

**Format:** `redis://username:password@hostname:port` or `rediss://...` for TLS

**In Vercel:**
1. Go to Project Settings → Environment Variables
2. Add `KV_REST_API_REDIS_URL` with your Redis URL
3. Select all environments (Production, Preview, Development)
4. Save

The application will automatically detect and use Redis when this variable is present.

### Local Development

For local development, the application falls back to in-memory storage when Redis is not available. To test with Redis locally:

1. Copy the `KV_REST_API_REDIS_URL` from your Vercel project
2. Add it to your `.env.local` file
3. Run `npm run dev`

### Free Tier Options

**Upstash Redis Free Tier:**
- **256 MB** storage
- **10,000** daily commands
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
