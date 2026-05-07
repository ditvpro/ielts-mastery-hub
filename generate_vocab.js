const fs = require('fs');
const OpenAI = require('openai');
require('dotenv').config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});

const topics = [
  "Environment & Climate", "Education & Learning", "Technology & Innovation", 
  "Health & Diet", "Economy & Finance", "Society & Social Issues", 
  "Culture & Traditions", "Science & Space", "Media & Advertising", 
  "Travel & Tourism", "Work & Careers", "Family & Children", 
  "Crime & Punishment", "Government & Politics", "Architecture & Housing", 
  "History & Past", "Sports & Leisure", "Art & Creativity", 
  "Psychology & Behavior", "Globalisation"
];

async function generate() {
  const results = [];
  
  // Run in chunks of 4 to avoid heavy rate limits
  for (let i = 0; i < topics.length; i += 4) {
    const chunk = topics.slice(i, i + 4);
    console.log(`Processing batch ${Math.floor(i/4) + 1}...`);
    
    const promises = chunk.map(async (topic) => {
      try {
        const resp = await client.chat.completions.create({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: `Provide exactly 100 distinct IELTS vocabulary words related to the topic "${topic}".
Return ONLY a valid JSON array of objects, like this:
[{"word": "sustainable", "definition": "able to be maintained at a certain rate or level"}]
Do NOT include any extra text.`
          }],
          temperature: 0.7,
        });
        
        let text = resp.choices[0].message.content;
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const words = JSON.parse(text);
        console.log(`[Success] ${words.length} words for ${topic}`);
        return { topic, words };
      } catch (e) {
        console.log(`[Error] Failed for ${topic}: ${e.message}`);
        return { topic, words: [] };
      }
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }

  fs.writeFileSync('./data/vocabulary.json', JSON.stringify(results, null, 2));
  console.log("Done! 2000 words written to data/vocabulary.json");
}

generate();
