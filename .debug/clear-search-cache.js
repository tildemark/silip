const redis = require('redis');

(async () => {
  try {
    const client = redis.createClient({
      socket: { host: 'localhost', port: 6379 }
    });
    
    await client.connect();
    console.log('Connected to Redis');
    
    // Delete all search cache keys
    const keys = await client.keys('silip:search:*');
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`✅ Deleted ${keys.length} cached search results`);
    } else {
      console.log('No cache keys found');
    }
    
    await client.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
