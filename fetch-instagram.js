const https = require('https');
const fs = require('fs');
const path = require('path');

const INSTAGRAM_USERNAME = 'urvault.tz';
const OUTPUT_FILE = path.join(__dirname, 'instagram-posts.json');

async function fetchInstagramPosts() {
  try {
    console.log(`Fetching Instagram posts from @${INSTAGRAM_USERNAME}...`);
    
    const url = `https://www.instagram.com/${INSTAGRAM_USERNAME}/?__a=1`;
    
    const posts = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const user = json.graphql.user;
            const media = user.edge_owner_to_timeline_media.edges;
            
            const posts = media.slice(0, 12).map(edge => {
              const node = edge.node;
              const caption = node.edge_media_to_caption.edges[0]?.node?.text || '';
              return {
                id: node.id,
                caption: caption,
                media_url: node.display_url,
                timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
                permalink: `https://www.instagram.com/p/${node.shortcode}/`,
                likes: node.edge_liked_by.count,
                comments: node.edge_media_to_comment.count
              };
            });
            
            resolve(posts);
          } catch (e) {
            reject(new Error('Failed to parse Instagram data'));
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
    throw error;
  }
}

if (require.main === module) {
  fetchInstagramPosts().catch(err => process.exit(1));
}

module.exports = { fetchInstagramPosts };
