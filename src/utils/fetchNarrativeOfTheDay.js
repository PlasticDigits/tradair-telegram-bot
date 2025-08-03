require('dotenv').config();
const fetch = require('node-fetch');

// Function to search for crypto narratives using Tavily
async function searchCryptoNarratives() {
    const query = 'cryptocurrency trending narratives bitcoin ethereum altcoin news today';
    
    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TAVILY_KEY}`
        },
        body: JSON.stringify({
            query: query,
            search_depth: "advanced",
            include_answer: true,
            include_raw_content: false,
            max_results: 10,
            include_domains: ["coindesk.com", "cointelegraph.com", "decrypt.co", "theblock.co", "cryptonews.com", "bitcoinmagazine.com", "blockworks.co", "bsc.news"],
            exclude_domains: []
        })
    });
    
    if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract headlines and content
    let newsContent = '';
    if (data.answer) {
        newsContent += `Overall Summary: ${data.answer}\n\n`;
    }
    
    if (data.results && data.results.length > 0) {
        newsContent += 'Top Headlines:\n';
        data.results.forEach((result, index) => {
            newsContent += `${index + 1}. ${result.title}\n`;
            if (result.content) {
                newsContent += `   ${result.content.substring(0, 150)}...\n`;
            }
            newsContent += '\n';
        });
    }
    
    return newsContent || 'No crypto news found';
}

// Function to call OpenAI Completion API (not Assistant)
async function callOpenAICompletion(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 100,
            temperature: 0.8
        })
    });
    
    if (!response.ok) {
        throw new Error(`OpenAI Completion API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content.trim();
    }
    
    throw new Error('No valid response from OpenAI Completion API');
}

// Main function to get narrative of the day
async function getNarrativeOfTheDay() {
    try {
        console.log('Starting narrative of the day generation...');
        
        // Step 1: Search for crypto narratives using Tavily
        console.log('Searching for crypto narratives...');
        const newsContent = await searchCryptoNarratives();
        
        // Step 2: Create the prompt for ChatGPT
        const prompt = `${newsContent}\n\nUsing the top crypto news sites, write a 1 sentence narrative about what narrative is trending. Be exciting, engaging, entertaining, humorous, and concise. Use emojis to emphaize the narrative; no hashtags. Write your answer below:`;
        
        console.log('Sending to OpenAI Completion API...');
        
        // Step 3: Send to OpenAI Completion API
        const narrative = await callOpenAICompletion(prompt);
        
        console.log('Narrative of the day generated successfully!');
        return {
            narrative: narrative,
            timestamp: new Date().toISOString(),
            source: 'crypto-news-aggregation'
        };
        
    } catch (error) {
        console.error('Error in getNarrativeOfTheDay:', error.message);
        throw error;
    }
}

// Export the function
module.exports = { getNarrativeOfTheDay };
