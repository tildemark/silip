


import path from 'path';

import fs from 'fs';

// Manual .env loading to avoid dependency issues
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) return;

        // Split on first equals sign
        const separatorIndex = line.indexOf('=');
        if (separatorIndex > 0) {
            const key = line.substring(0, separatorIndex).trim();
            let value = line.substring(separatorIndex + 1).trim();

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            process.env[key] = value;
        }
    });
} else {
    console.warn('.env file not found!');
}

async function main() {
    console.log('Testing Gemini API connection...');
    console.log('API Key present:', !!process.env.GEMINI_API_KEY);

    const mockContext = [
        {
            id: 'test-1',
            sectionNum: 'Section 1',
            title: 'Test Section',
            content: 'This is a test section content for debugging purposes.'
        }
    ];

    try {
        const { getConsultantResponse, generateEmbedding } = await import('../lib/ai');

        console.log('Testing embedding...');
        try {
            const embedding = await generateEmbedding('Test text');
            console.log('Embedding success! Vector length:', embedding.length);
        } catch (embError) {
            console.error('Embedding failed:', embError);
        }

        console.log('Testing content generation...');
        const response = await getConsultantResponse('Test query', mockContext);
        console.log('Success! Response:', response);
    } catch (error: any) {
        console.error('Error occurred:', error);
        if (error.response) {
            try {
                const text = await error.response.text();
                console.error('Response body:', text);
            } catch (e) {
                console.error('Could not read response text');
            }
        }
        if (error instanceof Error) {
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
        }
    }
}

main();
