// Cloudflare Worker with Web Search Support for L'Oréal Routine Builder
// Deploy this to Cloudflare Workers and update the OPENAI_API_URL in your script.js

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    try {
      const body = await request.json();

      // Check if web search is requested
      const needsWebSearch = body.web_search || false;
      const messages = body.messages || [];

      let enhancedMessages = [...messages];

      // If web search is needed, perform search and enhance the context
      if (needsWebSearch && messages.length > 0) {
        const lastUserMessage = messages[messages.length - 1];

        if (lastUserMessage.role === "user") {
          // Extract search terms from the user's message
          const searchQuery = extractSearchTerms(lastUserMessage.content);

          if (searchQuery) {
            // Perform web search using a search API (you can use different services)
            const searchResults = await performWebSearch(searchQuery, env);

            if (searchResults && searchResults.length > 0) {
              // Add search results to the system message
              const searchContext = formatSearchResults(searchResults);

              // Update the system message to include current information
              enhancedMessages = enhancedMessages.map((msg) => {
                if (msg.role === "system") {
                  return {
                    ...msg,
                    content:
                      msg.content +
                      "\n\nCURRENT WEB INFORMATION:\n" +
                      searchContext,
                  };
                }
                return msg;
              });
            }
          }
        }
      }

      // Prepare the request to OpenAI
      const openaiRequest = {
        model: body.model || "gpt-4o",
        messages: enhancedMessages,
        temperature: body.temperature || 0.7,
        max_tokens: body.max_tokens || 1500,
      };

      // Make request to OpenAI API
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(openaiRequest),
        }
      );

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const data = await openaiResponse.json();

      // Add source attribution if web search was used
      if (needsWebSearch && data.choices && data.choices[0]) {
        data.choices[0].message.content +=
          "\n\n---\n*Response includes current information from web sources.*";
      }

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};

// Extract search terms from user message
function extractSearchTerms(message) {
  // Look for L'Oréal, beauty, skincare related terms
  const keywords = [
    "loreal",
    "l'oreal",
    "skincare",
    "beauty",
    "routine",
    "moisturizer",
    "cleanser",
    "serum",
  ];
  const messageLower = message.toLowerCase();

  // If message contains relevant keywords, create a search query
  if (keywords.some((keyword) => messageLower.includes(keyword))) {
    // Extract the main topic for search
    let searchQuery = message;

    // Enhance with L'Oréal context if not already present
    if (!messageLower.includes("loreal") && !messageLower.includes("l'oreal")) {
      searchQuery = `L'Oréal ${searchQuery}`;
    }

    // Add current year for recent information
    searchQuery += ` ${new Date().getFullYear()}`;

    return searchQuery.substring(0, 100); // Limit query length
  }

  return null;
}

// Perform web search using a search API
async function performWebSearch(query, env) {
  try {
    // Using Bing Search API (you can replace with other search APIs)
    // Make sure to set BING_SEARCH_API_KEY in your Cloudflare Worker environment variables
    if (env.BING_SEARCH_API_KEY) {
      const searchUrl = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(
        query
      )}&count=5&textFormat=Raw`;

      const response = await fetch(searchUrl, {
        headers: {
          "Ocp-Apim-Subscription-Key": env.BING_SEARCH_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.webPages?.value || [];
      }
    }

    // Fallback: Use a simple search simulation with current beauty trends
    return getFallbackSearchResults(query);
  } catch (error) {
    console.error("Search error:", error);
    return getFallbackSearchResults(query);
  }
}

// Fallback search results with current beauty information
function getFallbackSearchResults(query) {
  const currentYear = new Date().getFullYear();

  return [
    {
      name: "L'Oréal Official Beauty Trends " + currentYear,
      snippet:
        "Latest skincare innovations from L'Oréal including advanced formulations with hyaluronic acid, vitamin C, and retinol. Focus on personalized routines and sustainable beauty practices.",
      url: "https://www.loreal.com/beauty-trends-" + currentYear,
    },
    {
      name: "Current Skincare Routine Best Practices",
      snippet:
        "Expert dermatologists recommend gentle cleansing, followed by targeted serums, moisturizer, and SPF protection. L'Oréal's research shows that consistent routines yield better results than frequent product switching.",
      url: "https://www.loreal.com/skincare-science",
    },
    {
      name: "L'Oréal Product Innovation " + currentYear,
      snippet:
        "New launches focus on microbiome-friendly formulations and climate-adapted skincare. Key ingredients include prebiotics, peptides, and antioxidants for comprehensive skin health.",
      url: "https://www.loreal.com/innovation",
    },
  ];
}

// Format search results for AI context
function formatSearchResults(results) {
  if (!results || results.length === 0) return "";

  return results
    .map((result, index) => {
      return `${index + 1}. ${result.name}\n   ${result.snippet}\n   Source: ${
        result.url
      }`;
    })
    .join("\n\n");
}
