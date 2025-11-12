# Deployment Guide

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
