require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// --- Gemini API Configuration ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not set in the .env file.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Or "gemini-1.5-flash-latest" etc.

// --- Middleware ---
app.use(express.json()); // To parse JSON request bodies
app.use(express.static('public')); // Serve static files from the 'public' directory

// --- API Endpoint for Chat ---
app.post('/ask', async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    console.log(`Received question: ${question}`);

    try {
        // For text-only input, use the gemini-pro model
        const result = await model.generateContent(question);
        const response = await result.response;
        const text = response.text();

        console.log(`Gemini response: ${text}`);
        res.json({ answer: text });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        if (error.message && error.message.includes('API key not valid')) {
            res.status(401).json({ error: 'Invalid API Key. Please check your .env file.' });
        } else if (error.message && error.message.includes('quota')) {
            res.status(429).json({ error: 'API Quota exceeded. Please check your Google Cloud Console.' });
        }
        else {
            res.status(500).json({ error: 'Failed to get answer from Gemini' });
        }
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});