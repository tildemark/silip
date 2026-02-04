
import fs from 'fs';
import path from 'path';

// Manual .env loading
const envPath = path.resolve(process.cwd(), '.env');
let apiKey = '';

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        if (line.trim().startsWith('#') || !line.trim()) return;
        const separatorIndex = line.indexOf('=');
        if (separatorIndex > 0) {
            const key = line.substring(0, separatorIndex).trim();
            let value = line.substring(separatorIndex + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            if (key === 'GEMINI_API_KEY') apiKey = value;
        }
    });
}

if (!apiKey) {
    console.error('API Key not found in .env');
    process.exit(1);
}

async function listModels() {
    try {
        console.log('Fetching models with key ending in...' + apiKey.slice(-4));
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!res.ok) {
            console.error('Failed to fetch models:', res.status, res.statusText);
            const text = await res.text();
            console.error('Body:', text);
            return;
        }
        const data = await res.json();
        console.log('Available Models:');
        if (data.models) {
            data.models.forEach((m: any) => {
                // Filter for generateContent supported models
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log('No models returned in list.');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

listModels();
