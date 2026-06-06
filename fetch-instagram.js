const https = require('https');
const fs = require('fs');
const path = require('path');

// Your Instagram Graph API token
const INSTAGRAM_TOKEN = 'EAAOPSBeLKAQBRjYZCrlLMu1S8C7ILrutXNRGvjvGLjtQ71FMsRBqI7zdxRlBVvWTaXesQmT6exXec6oIX5ZBWg8b1antXkozYd5DgI6OORElivFyCZAIIEfpED3mnSDVdms67Qwz5VFHek9jZAOArn8eFcNi9qIFrqhwwD0c3niWZBx9BffcndnD6zW7vsr36sAZDZD';
const OUTPUT_FILE = path.join(__dirname, 'instagram-posts.json');

async function fetchInstagramPosts() {
  try {
    console.log('Fetching Instagram posts via Graph API...');
    
    // First, get your Instagram Business Account ID
    const userUrl = `https://graph.instagram.com/me?fields=id,username,name&access_token=${INSTAGRAM_TOKEN}`;
    
    const userId = await new Promise((resolve, reject) => {
      https.get(userUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error.message);
            }
            console.log(`Connected to account: ${parsed.username}`);
            resolve(parsed.id);
          } catch (e) {
            reject(new Error('Failed to get user ID: ' + e.message));
          }
        });
      }).on('error', reject);
    });
    
    // Now fetch media from this user
    const mediaUrl = `https://graph.instagram.com/${userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count&access_token=${INSTAGRAM_TOKEN}`;
    
    const posts = await new Promise((resolve, reject) => {
      https.get(mediaUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error.message);
            }
            
            const posts = (parsed.data || []).slice(0, 12).map(item => ({
              id: item.id,
              caption: item.caption || '',
              media_url: item.media_url || item.thumbnail_url,
              timestamp: item.timestamp,
              permalink: item.permalink,
              likes: item.like_count || 0,
              comments: item.comments_count || 0,
              type: item.media_type
            }));
            
            resolve(posts);
          } catch (e) {
            reject(new Error('Failed to fetch media: ' + e.message));
          }
        });
      }).on('error', reject);
    });
    
    const jsonData = { posts, lastUpdated: new Date().toISOString() };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
    
    console.log(`Successfully fetched ${posts.length} posts`);
    return posts;
  } catch (error) {
    console.error('Error:', error.message);
    
    // Fallback - don't break the site
    const fallbackData = { posts: [], lastUpdated: new Date().toISOString(), error: error.message };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fallbackData, null, 2));
    
    throw error;
  }
}

if (require.main === module) {
  fetchInstagramPosts().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { fetchInstagramPosts };
