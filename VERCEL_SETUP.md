# Vercel Setup Guide

This guide will help you set up and deploy your SMS Chat Interface to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your project repository (GitHub, GitLab, or Bitbucket)
3. All environment variables ready

## Method 1: Using Vercel Extension (VS Code/Cursor)

### Step 1: Install the Vercel Extension

1. Open VS Code or Cursor
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Vercel" by Vercel Inc.
4. Click "Install"

### Step 2: Sign In to Vercel

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Vercel: Login" and select it
3. A browser window will open - sign in to your Vercel account
4. Authorize the extension

### Step 3: Deploy Your Project

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Vercel: Deploy Project" and select it
3. Follow the prompts:
   - Select your project scope (personal or team)
   - Choose to link to an existing project or create a new one
   - Select your framework preset (Next.js should be auto-detected)
   - Configure build settings (usually auto-detected)

### Step 4: Configure Environment Variables

1. Open the Command Palette
2. Type "Vercel: Open Environment Variables" and select it
3. Or go to your project on Vercel dashboard → Settings → Environment Variables

Add the following environment variables:

#### Required Variables

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Hebes API Configuration
NEXT_PUBLIC_HEBES_API_BASE=https://admin.hebesbychloe.com/wp-content/themes/flatsome-child/backend-dfcflow/twilio

# Application URL (will be set automatically, but you can override)
NEXT_PUBLIC_APP_URL=https://your-project-name.vercel.app
```

#### Optional Variables (if using Supabase)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

**Important:** 
- Set these for **Production**, **Preview**, and **Development** environments
- After adding variables, you'll need to redeploy for them to take effect

### Step 5: Configure Webhook URL in Twilio

After deployment, update your Twilio webhook URL:

1. Go to your Twilio Console → Phone Numbers → Manage → Active Numbers
2. Click on your phone number
3. Under "Messaging", set the webhook URL to:
   ```
   https://your-project-name.vercel.app/api/twilio/webhook
   ```
4. Set HTTP method to `POST`
5. Save changes

## Method 2: Using Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
vercel
```

Follow the prompts to configure your project.

### Step 4: Set Environment Variables

```bash
# Set production variables
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add NEXT_PUBLIC_HEBES_API_BASE production
vercel env add NEXT_PUBLIC_APP_URL production

# Set preview variables (for pull requests)
vercel env add TWILIO_ACCOUNT_SID preview
vercel env add TWILIO_AUTH_TOKEN preview
vercel env add NEXT_PUBLIC_HEBES_API_BASE preview
```

### Step 5: Deploy to Production

```bash
vercel --prod
```

## Method 3: Using Vercel Dashboard (Git Integration)

### Step 1: Import Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js

### Step 2: Configure Build Settings

- Framework Preset: Next.js
- Root Directory: `./` (or leave default)
- Build Command: `npm run build` (auto-detected)
- Output Directory: `.next` (auto-detected)
- Install Command: `npm install` (auto-detected)

### Step 3: Add Environment Variables

1. Go to Settings → Environment Variables
2. Add all required variables (see Method 1, Step 4)
3. Select which environments they apply to (Production, Preview, Development)

### Step 4: Deploy

Click "Deploy" - Vercel will automatically deploy your project.

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Update Twilio webhook URL to point to your Vercel deployment
- [ ] Test sending an SMS message
- [ ] Test receiving an SMS message (webhook)
- [ ] Verify `NEXT_PUBLIC_APP_URL` matches your Vercel deployment URL
- [ ] Check Vercel function logs for any errors

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation passes locally

### Environment Variables Not Working

- Make sure variables are set for the correct environment (Production/Preview)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

### Webhook Not Receiving Messages

- Verify webhook URL in Twilio console
- Check Vercel function logs
- Ensure `TWILIO_AUTH_TOKEN` is set correctly for signature validation

### API Routes Not Working

- Check Vercel function logs
- Verify API routes are in `app/api/` directory
- Ensure routes export correct HTTP methods (GET, POST, etc.)

## Useful Vercel Extension Commands

- `Vercel: Deploy Project` - Deploy current project
- `Vercel: Open Dashboard` - Open project in Vercel dashboard
- `Vercel: Open Environment Variables` - Manage environment variables
- `Vercel: View Logs` - View deployment and function logs
- `Vercel: Open Project Settings` - Configure project settings

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)

