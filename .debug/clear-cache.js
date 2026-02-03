const redis = require('redis');

const client = redis.createClient({
  socket: {
    host: 'localhost',
    port: 6379
  }
});

(async () => {
  try {
    await client.connect();
    const deleted = await client.del(await client.keys('silip:*'));
    console.log(`Deleted ${deleted} Redis cache keys`);
    await client.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
