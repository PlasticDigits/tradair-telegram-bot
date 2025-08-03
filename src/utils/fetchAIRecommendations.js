require('dotenv').config();
const fetch = require('node-fetch');
const { tokenSchema, CHATGPT_PROMPT_BASE } = require('./helper');
const { ZeroAddress } = require('ethers');

// Function to get top tokens from PancakeSwap on BSC using CoinGecko On-Chain API
async function getTopTokens() {
    // Use the On-Chain DEX API to get top pools from PancakeSwap on BSC
    const pancakeswapv2_data_url = `https://api.coingecko.com/api/v3/exchanges/pancakeswap_new?dex_pair_format=contract_address`;

    const pancakeswapv2_data_response = await fetch(pancakeswapv2_data_url, {
        headers: {
            'accept': 'application/json',
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
        }
    });

    if (!pancakeswapv2_data_response.ok) {
        throw new Error(`CoinGecko On-Chain API error: ${pancakeswapv2_data_response.status}`);
    }

    const exchange_data = await pancakeswapv2_data_response.json();

    if (!exchange_data.tickers || exchange_data.tickers.length === 0) {
        throw new Error('No tickers received from PancakeSwap');
    }

    const pcsv2_tickers = exchange_data.tickers;
    const rawTokens = pcsv2_tickers.map(ticker => ({
        bsc_address: ticker.base, // BSC contract address (e.g., 0x55d398326f99059fF775485246999027B3197955)
        coin_id: ticker.coin_id,
        trade_url: ticker.trade_url,
        current_price: ticker.converted_last.usd,
        pcsv2_volume: ticker.converted_volume.usd,
        symbol: ticker.base, // Using contract address as symbol for now
        name: ticker.coin_id // Using coin_id as name for now
    }));

    // remove tokens that have usd string in coin_id string
    const filteredTokens = rawTokens.filter(token => !token.coin_id.includes('usd'));

    // Pick 10 randomly from top volume tokens
    const shuffled = filteredTokens.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10);
}

// Function to get pool data for a token from CoinGecko On-Chain API
async function getTokenPoolData(tokenAddress) {
    const url = `https://api.coingecko.com/api/v3/onchain/networks/bsc/tokens/${tokenAddress}/pools?include=base_token%2Cdex`;

    const response = await fetch(url, {
        headers: {
            'accept': 'application/json',
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY
        }
    });

    if (!response.ok) {
        throw new Error(`CoinGecko Pool API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
        return null;
    }

    // Find the top pool with PancakeSwap dex
    for (const pool of data.data) {
        if (pool.relationships?.dex?.data?.id?.includes('pancakeswap')) {
            return {
                pool_address: pool.attributes.address,
                dex_id: pool.relationships.dex.data.id,
                pool_name: pool.attributes.name,
                reserve_usd: pool.attributes.reserve_in_usd,
                volume_24h_usd: pool.attributes.volume_usd?.h24
            };
        }
    }

    return null;
}

// Function to search news with Tavily
async function searchTokenNews(tokenSymbol, tokenName) {
    const query = `${tokenName} ${tokenSymbol} cryptocurrency news price analysis`;

    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TAVILY_KEY}`
        },
        body: JSON.stringify({
            query: query,
            search_depth: "basic",
            include_answer: true,
            include_raw_content: false,
            max_results: 3,
            include_domains: [],
            exclude_domains: []
        })
    });

    if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract and summarize the news
    let newsSummary = '';
    if (data.answer) {
        newsSummary += `Summary: ${data.answer}\n`;
    }

    if (data.results && data.results.length > 0) {
        newsSummary += 'Recent news:\n';
        data.results.slice(0, 3).forEach((result, index) => {
            newsSummary += `${index + 1}. ${result.title}: ${result.content.substring(0, 200)}...\n`;
        });
    }

    return newsSummary || `No recent news found for ${tokenName}`;
}

// Function to call OpenAI Assistant
async function callOpenAIAssistant(prompt) {
    const openaiHeaders = {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
    };

    // Create a thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: openaiHeaders,
        body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
        throw new Error(`OpenAI thread creation error: ${threadResponse.status}`);
    }

    const thread = await threadResponse.json();

    // Add message to thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: openaiHeaders,
        body: JSON.stringify({
            role: "user",
            content: prompt
        })
    });

    if (!messageResponse.ok) {
        throw new Error(`OpenAI message creation error: ${messageResponse.status}`);
    }

    // Load the schema
    const schema = tokenSchema;

    // Create and run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: openaiHeaders,
        body: JSON.stringify({
            assistant_id: process.env.OPENAI_ASSISTANT_SMARTTRADING_ID,
            response_format: {
                type: "json_schema",
                json_schema: schema
            }
        })
    });

    if (!runResponse.ok) {
        throw new Error(`OpenAI run creation error: ${runResponse.status}`);
    }

    const run = await runResponse.json();

    // Wait for run completion
    let runStatus = run;
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
            headers: openaiHeaders
        });

        if (!statusResponse.ok) {
            throw new Error(`OpenAI run status error: ${statusResponse.status}`);
        }

        runStatus = await statusResponse.json();
    }

    if (runStatus.status === 'completed') {
        // Get the assistant's response
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
            headers: openaiHeaders
        });

        if (!messagesResponse.ok) {
            throw new Error(`OpenAI messages retrieval error: ${messagesResponse.status}`);
        }

        const messages = await messagesResponse.json();

        // Find the assistant's last message
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        if (assistantMessage && assistantMessage.content[0] && assistantMessage.content[0].text) {
            return JSON.parse(assistantMessage.content[0].text.value);
        }
    } else {
        throw new Error(`OpenAI run failed with status: ${runStatus.status}`);
    }

    throw new Error('No valid response from OpenAI Assistant');
}

// Main function
async function fetchAIRecommendations() {
    try {
        console.log('Starting AI recommendations fetch...');

        // Step 1: Get top 100 tokens from CoinGecko, filter and pick 10
        console.log('Fetching top tokens from CoinGecko...');
        const selectedTokens = await getTopTokens();
        console.log(`Selected ${selectedTokens.length} tokens:`, selectedTokens.map(t => `${t.coin_id} (${t.bsc_address})`));

        // Step 2: Get news and pool data for each token
        console.log('Fetching news and pool data for each token...');
        const tokensWithData = [];

        for (const token of selectedTokens) {
            try {
                console.log(`Getting data for ${token.coin_id} (${token.bsc_address})...`);

                // Get pool data first
                console.log(`  Fetching pool data...`);
                const poolData = await getTokenPoolData(token.bsc_address);

                // Get news data
                console.log(`  Fetching news...`);
                const news = await searchTokenNews(token.coin_id, token.coin_id);

                tokensWithData.push({
                    symbol: token.coin_id,
                    name: token.coin_id,
                    bsc_address: token.bsc_address,
                    price: token.current_price,
                    volume: token.pcsv2_volume,
                    pool_data: poolData,
                    news: news
                });

                console.log(`  Pool found: ${poolData ? `${poolData.pool_name} (${poolData.dex_id})` : 'None'}`);

                // 3 second delay to prevent rate limiting as requested
                console.log(`  Waiting 3 seconds to prevent rate limiting...`);
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                console.warn(`Failed to get data for ${token.coin_id}: ${error.message}`);
                tokensWithData.push({
                    symbol: token.coin_id,
                    name: token.coin_id,
                    bsc_address: token.bsc_address,
                    price: token.current_price,
                    volume: token.pcsv2_volume,
                    pool_data: null,
                    news: `No news available for ${token.coin_id}`
                });

                // Still wait 3 seconds even on error
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // Step 3: Create the prompt
        let prompt = "Here are 10 randomly selected tokens from the top 100 by volume:\n\n";

        tokensWithData.forEach((token, index) => {
            prompt += `${index + 1}. ${token.symbol} (${token.name})\n`;
            prompt += `   BSC Address: ${token.bsc_address}\n`;
            prompt += `   Current Price: $${token.price}\n`;
            prompt += `   24h Volume: $${token.volume.toLocaleString()}\n`;
            if (token.pool_data) {
                prompt += `   Pool Address: ${token.pool_data.pool_address}\n`;
                prompt += `   DEX: ${token.pool_data.dex_id}\n`;
                prompt += `   Pool Name: ${token.pool_data.pool_name}\n`;
                prompt += `   Pool Reserve: $${parseFloat(token.pool_data.reserve_usd).toLocaleString()}\n`;
                if (token.pool_data.volume_24h_usd) {
                    prompt += `   Pool 24h Volume: $${parseFloat(token.pool_data.volume_24h_usd).toLocaleString()}\n`;
                }
            } else {
                prompt += `   Pool Data: Not available\n`;
            }
            prompt += `   News Summary:\n${token.news}\n\n`;
        });

        prompt += "\n" + CHATGPT_PROMPT_BASE;

        console.log('Sending to OpenAI Assistant...');
        console.log('Prompt length:', prompt.length, 'characters');

        // Step 4: Send to OpenAI Assistant
        const result = await callOpenAIAssistant(prompt);

        console.log('AI recommendations generated successfully!');
        const enriched = result.tokens.map(tokenRec => {
            const original = tokensWithData.find(
                t => t.symbol.toUpperCase() === tokenRec.ticker.toUpperCase()
            );

            return {
                ...tokenRec,
                name: original?.name || '',
                address: original?.bsc_address || ZeroAddress,
                pool: original?.pool_data?.pool_address || ZeroAddress,
                price: original?.price || 0,
                volume: original?.volume || 0
            };

        });

        return enriched;

    } catch (error) {
        console.error('Error in fetchAIRecommendations:', error.message);
        throw error;
    }
}

// Export the function
module.exports = { fetchAIRecommendations };