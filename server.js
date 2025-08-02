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

// 4. API endpoint to START the video generation
app.post('/generate-video-plan', async (req, res) => {
    try {
        const { prompt, duration } = req.body;
        if (!prompt || !duration) {
            return res.status(400).json({ error: 'Prompt and duration are required.' });
        }

        // --- Step 1: Call Gemini to get the creative plan (for the user) ---
        const geminiApiKey = process.env.GEMINI_API_KEY;
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`;
        const fullPromptForPlan = `As an expert AI Film Director... create a plan for a ${duration}s video... User's Core Idea: "${prompt}"...`; // (Full prompt omitted for brevity)
        const geminiPayload = { contents: [{ role: "user", parts: [{ text: fullPromptForPlan }] }] };
        const geminiResponse = await axios.post(geminiApiUrl, geminiPayload);
        const generatedPlan = geminiResponse.data.candidates[0].content.parts[0].text;

        // --- Step 2: Send the original, concise prompt to the Veo 3 model ---
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
        console.log('Started video generation job:', operation.name);

        res.json({
            plan: generatedPlan,
            jobId: operation.name
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
