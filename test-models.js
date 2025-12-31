
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return console.log('NO_KEY');

    const ai = new GoogleGenAI({ apiKey });
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-flash-8b', 'gemini-pro', 'gemini-1.0-pro'];

    for (const m of models) {
        try {
            await ai.models.generateContent({ model: m, contents: 'Hi' });
            console.log(`PASS: ${m}`);
        } catch (e) {
            const err = e.message || JSON.stringify(e);
            const status = err.includes('403') ? '403' : err.includes('404') ? '404' : 'ERR';
            console.log(`FAIL: ${m} (${status})`);
        }
    }
}
listModels();
