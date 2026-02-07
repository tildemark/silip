
import { setTimeout } from 'timers/promises';

async function testRateLimit() {
    console.log('🚀 Starting Rate Limit Test...');
    const url = 'http://localhost:3000/api/search/v2?q=test';

    let successCount = 0;
    let blockedCount = 0;

    for (let i = 1; i <= 30; i++) {
        try {
            const start = Date.now();
            const res = await fetch(url);
            const duration = Date.now() - start;

            if (res.status === 429) {
                blockedCount++;
                console.log(`❌ Request ${i}: 429 Too Many Requests`);
            } else if (res.ok) {
                successCount++;
                console.log(`✅ Request ${i}: ${res.status} (${duration}ms)`);
            } else {
                console.log(`⚠️ Request ${i}: ${res.status}`);
            }
        } catch (error) {
            console.error(`Request ${i} failed:`, error.message);
        }
    }

    console.log('\n📊 Results:');
    console.log(`Success: ${successCount}`);
    console.log(`Blocked: ${blockedCount}`);

    if (blockedCount > 0) {
        console.log('✅ Rate limiting is WORKING.');
    } else {
        console.log('❌ Rate limiting might NOT be working (or limit is higher than 30).');
    }
}

testRateLimit();
