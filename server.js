// server.js    
// 1. Import necessary packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

// 2. Initialize the Express app and Vertex AI client
const app = express();
const PORT = process.env.PORT || 3000;

const vertex_ai = new VertexAI({
    project: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION,
});

// 3. Configure middleware
app.use(cors());
app.use(express.json());

// Serve the frontend HTML file
app.use(express.static('.'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: {
            node: process.version,
            platform: process.platform,
            geminiMode: process.env.GEMINI_API_KEY === 'demo-mode' ? 'demo' : 'production',
            gcpProject: process.env.GCP_PROJECT_ID || 'not-configured'
        }
    });
});

// Default route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/ai-story-studio-combined.html');
});

// 4. API endpoint to START the video generation
app.post('/generate-video-plan', async (req, res) => {
    try {
        const { prompt, duration } = req.body;
        if (!prompt || !duration) {
            return res.status(400).json({ error: 'Prompt and duration are required.' });
        }

        // --- Step 1: Call Gemini to get the creative plan (for the user) ---
        const geminiApiKey = process.env.GEMINI_API_KEY;
        let generatedPlan;

        if (geminiApiKey === "demo-mode" || !geminiApiKey || geminiApiKey === "YOUR_SECRET_GEMINI_API_KEY_GOES_HERE") {
            // Demo mode - return a sample plan
            generatedPlan = `🎬 **AI Story Studio - Demo Video Plan**

**Duration:** ${duration} seconds
**Concept:** "${prompt}"

**Scene Breakdown:**
• **Opening (0-${Math.floor(duration * 0.3)}s):** Establish the setting with dynamic camera movement
• **Development (${Math.floor(duration * 0.3)}-${Math.floor(duration * 0.7)}s):** Main action and character interaction  
• **Climax (${Math.floor(duration * 0.7)}-${duration}s):** Dramatic conclusion with perfect timing

**Visual Style:** Cinematic, high-quality 4K resolution with professional lighting
**Audio:** Dynamic soundtrack that complements the visual narrative

*This is a demo response. Configure your Gemini API key for AI-generated plans.*`;
        } else {
            // Real API call
            const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`;
            const fullPromptForPlan = `As an expert AI Film Director... create a plan for a ${duration}s video... User's Core Idea: "${prompt}"...`; // (Full prompt omitted for brevity)
            const geminiPayload = { contents: [{ role: "user", parts: [{ text: fullPromptForPlan }] }] };
            const geminiResponse = await axios.post(geminiApiUrl, geminiPayload);
            generatedPlan = geminiResponse.data.candidates[0].content.parts[0].text;
        }

        // --- Step 2: Send the original, concise prompt to the Veo 3 model ---
        let jobId;

        if (process.env.GCP_PROJECT_ID === "demo-project" || !process.env.GCP_PROJECT_ID || process.env.GCP_PROJECT_ID === "your-gcp-project-id") {
            // Demo mode - simulate job creation
            jobId = `demo-job-${Date.now()}`;
            console.log('Started demo video generation job:', jobId);
        } else {
            // Real video generation
            const videoModel = vertex_ai.getGenerativeModel({
                model: 'veo-3-0-generate-preview',
            });

            const videoRequest = {
                prompt: prompt,
                config: {
                    durationSeconds: parseInt(duration, 10),
                    resolution: '1080p',
                    generateAudio: true,
                },
            };

            const [operation] = await videoModel.generateVideos(videoRequest);
            jobId = operation.name;
            console.log('Started video generation job:', operation.name);
        }

        res.json({
            plan: generatedPlan,
            jobId: jobId
        });

    } catch (error) {
        console.error('Error starting video generation process:', error);
        res.status(500).json({ error: 'Failed to start video generation.' });
    }
});

// --- Endpoint to check the status of the rendering job ---
app.get('/check-job-status/:jobId', async (req, res) => {
    try {
        const jobId = req.params.jobId;
        if (!jobId) {
            return res.status(400).json({ error: 'Job ID is required.' });
        }

        if (jobId.startsWith('demo-job-')) {
            // Demo mode - simulate video completion
            try {
                const timestampStr = jobId.split('-')[2];
                if (!timestampStr || isNaN(timestampStr)) {
                    return res.status(400).json({ error: 'Invalid demo job ID format.' });
                }

                const jobAge = Date.now() - parseInt(timestampStr);
                if (jobAge > 10000) { // After 10 seconds, mark as complete
                    res.json({
                        status: 'completed',
                        videoUrl: 'https://placehold.co/1920x1080.mp4?text=Demo+Video+Generated',
                        note: 'This is a demo response. Configure your GCP project for real video generation.'
                    });
                } else {
                    res.json({
                        status: 'rendering',
                        progress: Math.min(Math.floor((jobAge / 10000) * 100), 99),
                        note: 'Demo mode: simulating video generation...'
                    });
                }
                return;
            } catch (demoError) {
                return res.status(400).json({ error: 'Invalid demo job ID.' });
            }
        }

        const [operation] = await vertex_ai.operationsClient.getOperation({ name: jobId });

        if (operation.done) {
            console.log(`Job ${jobId} is complete.`);
            const videoUrl = operation.response.generatedVideos[0].gcsUri;
            res.json({ status: 'completed', videoUrl: videoUrl });
        } else {
            console.log(`Job ${jobId} is still running.`);
            res.json({ status: 'rendering' });
        }

    } catch (error) {
        console.error('Error checking job status:', error);
        res.status(500).json({ error: 'Failed to check job status.' });
    }
});

// 5. Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// 6. Export the app for testing
module.exports = app;
// Note: Ensure you have the necessary environment variables set in a .env file:
// GEMINI_API_KEY="your-actual-gemini-key"
// GCP_PROJECT_ID="your-actual-gcp-project-id"
// GCP_LOCATION="us-central1" (or your preferred location)
// GCP_VIDEO_MODEL="veo-3-0-generate-preview" (or your preferred model)
// GCP_VIDEO_RESOLUTION="1080p" (or your preferred resolution)
// GCP_VIDEO_DURATION=30 (or your preferred duration in seconds)
// GCP_VIDEO_AUDIO=true (or false if you don't want audio)
// GCP_VIDEO_ASPECT_RATIO="16:9" (or your preferred aspect ratio)       
// GCP_VIDEO_FRAME_RATE=30 (or your preferred frame rate)
// GCP_VIDEO_BITRATE="4M" (or your preferred bitrate)
// GCP_VIDEO_FORMAT="mp4" (or your preferred format)
// GCP_VIDEO_OUTPUT_BUCKET="your-gcs-bucket-name" (where the video will be stored)
// GCP_VIDEO_OUTPUT_PATH="videos/" (the path within the bucket where the video will be stored)
// GCP_VIDEO_OUTPUT_NAME="output_video.mp4" (the name of the output video file)
// GCP_VIDEO_OUTPUT_URL="https://storage.googleapis.com/your-gcs-bucket-name/videos/output_video.mp4" (the public URL of the output video)
// GCP_VIDEO_OUTPUT_PUBLIC=true (whether the output video should be publicly accessible)
// GCP_VIDEO_OUTPUT_PRIVATE=false (whether the output video should be private)
// GCP_VIDEO_OUTPUT_ENCRYPTION="AES256" (or your preferred encryption method)
// GCP_VIDEO_OUTPUT_METADATA={ "key": "value" } (or your preferred metadata)
// GCP_VIDEO_OUTPUT_LABELS={ "label1": "value1", "label2": "value2" } (or your preferred labels)
// GCP_VIDEO_OUTPUT_TAGS=[ "tag1", "tag2" ] (or your preferred tags)
// GCP_VIDEO_OUTPUT_NOTIFICATIONS={ "pubsubTopic": "projects/your-project-id/topics/your-topic-name" } (or your preferred Pub/Sub topic for notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_URL="https://your-webhook-url" (or your preferred webhook URL)
// GCP_VIDEO_OUTPUT_WEBHOOK_HEADERS={ "Authorization": "Bearer YOUR_ACCESS_TOKEN" } (or your preferred headers)     
// GCP_VIDEO_OUTPUT_WEBHOOK_PAYLOAD={ "key": "value" } (or your preferred payload)
// GCP_VIDEO_OUTPUT_WEBHOOK_METHOD="POST" (or your preferred HTTP method)
// GCP_VIDEO_OUTPUT_WEBHOOK_TIMEOUT=5000 (or your preferred timeout in milliseconds)
// GCP_VIDEO_OUTPUT_WEBHOOK_RETRIES=3 (or your preferred number of retries)
// GCP_VIDEO_OUTPUT_WEBHOOK_RETRY_DELAY=1000 (or your preferred delay between retries in milliseconds)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_CODES=[200, 201] (or your preferred success HTTP status codes)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_CODES=[400, 500] (or your preferred failure HTTP status codes)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_ACTION="retry" (or your preferred action on failure, e.g., "retry", "abort", "notify")
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_ACTION="notify" (or your preferred action on success, e.g., "notify", "store", "log")
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_MESSAGE="Video generation failed" (or your preferred failure message)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_MESSAGE="Video generation completed successfully" (or your preferred success message)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_EMAIL="your-email@example.com" (or your preferred email for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_EMAIL="your-email@example.com" (or your preferred email for success notifications)     
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_SMS="+1234567890" (or your preferred phone number for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_SMS="+1234567890" (or your preferred phone number for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_SLACK_CHANNEL="#your-slack-channel" (or your preferred Slack channel for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_SLACK_CHANNEL="#your-slack-channel" (or your preferred Slack channel for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/your-webhook-url" (or your preferred Slack webhook URL for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/your-webhook-url" (or your preferred Slack webhook URL for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_DISCORD_CHANNEL="your-discord-channel-id" (or your preferred Discord channel ID for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_DISCORD_CHANNEL="your-discord-channel-id" (or your preferred Discord channel ID for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/your-webhook-url" (or your preferred Discord webhook URL for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/your-webhook-url"
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_TELEGRAM_CHAT_ID="your-telegram-chat-id" (or your preferred Telegram chat ID for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_TELEGRAM_CHAT_ID="your-telegram-chat-id" (or your preferred Telegram chat ID for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_TELEGRAM_BOT_TOKEN="your-telegram-bot-token" (or your preferred Telegram bot token for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_TELEGRAM_BOT_TOKEN="your-telegram-bot-token" (or your preferred Telegram bot token for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_USER_KEY="your-pushover-user-key" (or your preferred Pushover user key for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_USER_KEY="your-pushover-user-key" (or your preferred Pushover user key for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_API_TOKEN="your-pushover-api-token" (or your preferred Pushover API token for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_API_TOKEN="your-pushover-api-token" (or your preferred Pushover API token for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_MESSAGE="Video generation failed" (or your preferred failure message for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_MESSAGE="Video generation completed successfully" (or your preferred success message for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_PRIORITY=1 (or your preferred Pushover priority for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_PRIORITY=0 (or your preferred Pushover priority for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_SOUND="siren" (or your preferred Pushover sound for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_SOUND="magic" (or your preferred Pushover sound for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_RETRY=30 (or your preferred Pushover retry interval for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_RETRY=60 (or your preferred Pushover retry interval for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_EXPIRATION=3600 (or your preferred Pushover expiration time for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_EXPIRATION=7200 (or your preferred Pushover expiration time for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_URL="https://api.pushover.net/1/messages.json" (or your preferred Pushover API URL for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_URL="https://api.pushover.net/1/messages.json" (or your preferred Pushover API URL for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_METHOD="POST" (or your preferred HTTP method for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_METHOD="POST" (or your preferred HTTP method for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_HEADERS={ "Content-Type": "application/json" } (or your preferred headers for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_HEADERS={ "Content-Type": "application/json" } (or your preferred headers for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_PAYLOAD={ "token": "your-pushover-api-token", "user": "your-pushover-user-key", "message": "Video generation failed", "priority": 1, "sound": "siren" } (or your preferred payload for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_PAYLOAD={ "token": "your-pushover-api-token", "user": "your-pushover-user-key", "message": "Video generation completed successfully", "priority": 0, "sound": "magic" } (or your preferred payload for success notifications)     
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_TIMEOUT=5000 (or your preferred timeout for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_TIMEOUT=5000 (or your preferred timeout for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_RETRIES=3 (or your preferred number of retries for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_RETRIES=3 (or your preferred number of retries for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_RETRY_DELAY=1000 (or your preferred delay between retries for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_RETRY_DELAY=1000 (or your preferred delay between retries for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_SUCCESS_CODES=[200, 201] (or your preferred success HTTP status codes for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_SUCCESS_CODES=[200, 201] (or your preferred success HTTP status codes for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_FAILURE_CODES=[400, 500] (or your preferred failure HTTP status codes for Pushover notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_FAILURE_CODES=[400, 500] (or your preferred failure HTTP status codes for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_FAILURE_ACTION="retry" (or your preferred action on failure for Pushover notifications, e.g., "retry", "abort", "notify")
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_FAILURE_ACTION="notify" (or your preferred action on failure for success notifications, e.g., "notify", "store", "log")
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_RETRY_DELAY=1000 (or your preferred delay between retries for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_RETRY_DELAY=1000 (or your preferred delay between retries for success notifications)  
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_TIMEOUT=5000 (or your preferred timeout for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_TIMEOUT=5000 (or your preferred timeout for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_RETRIES=3 (or your preferred number of retries for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_RETRIES=3 (or your preferred number of retries for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_RETRY_DELAY=1000 (or your preferred delay between retries for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_RETRY_DELAY=1000 (or your preferred delay between retries for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_SUCCESS_CODES=[200, 201] (or your preferred success HTTP status codes for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_SUCCESS_CODES=[200, 201] (or your preferred success HTTP status codes for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_FAILURE_CODES=[400, 500] (or your preferred failure HTTP status codes for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_FAILURE_CODES=[400, 500] (or your preferred failure HTTP status codes for success notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_FAILURE_ACTION="retry" (or your preferred action on failure for Pushover notifications, e.g., "retry", "abort", "notify")
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_FAILURE_ACTION="notify" (or your preferred action on failure for success notifications, e.g., "notify", "store", "log")
// GCP_VIDEO_OUTPUT_WEBHOOK_FAILURE_NOTIFICATION_PUSHOVER_RETRY_DELAY=1000 (or your preferred delay between retries for failure notifications)
// GCP_VIDEO_OUTPUT_WEBHOOK_SUCCESS_NOTIFICATION_PUSHOVER_RETRY_DELAY=1000 (or your preferred delay between retries for success notifications





