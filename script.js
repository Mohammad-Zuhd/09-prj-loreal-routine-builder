// --- L'Oréal Routine Builder JS ---
const PRODUCTS_URL = "products.json";
const productGrid = document.getElementById("product-grid");
const categorySelect = document.getElementById("category-select");
const searchInput = document.getElementById("product-search");
const searchSuggestions = document.getElementById("search-suggestions");
const selectedList = document.getElementById("selected-list");
const clearSelectedBtn = document.getElementById("clear-selected");
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const generateBtn = document.getElementById("generate-routine");

let allProducts = [];
let selectedProducts = [];
let chatHistory = [];
let isRTL = false;

// --- Load Products ---
async function loadProducts() {
  const res = await fetch(PRODUCTS_URL);
  const data = await res.json();
  allProducts = data.products;
  renderCategories();
  renderProducts();
  loadSelectedFromStorage();
  showSuggestions(); // Ensure suggestions are available after load
}

// --- Render Category Dropdown ---
function renderCategories() {
  const cats = Array.from(
    new Set(
      allProducts.map((p) =>
        capitalize(typeof p.category === "string" ? p.category : "")
      )
    )
  ).filter((cat) => cat); // Remove empty strings
  categorySelect.innerHTML =
    '<option value="all">All</option>' +
    cats
      .map((cat) => `<option value="${cat.toLowerCase()}">${cat}</option>`)
      .join("");
}

// --- Render Product Grid ---
function renderProducts() {
  const cat = categorySelect.value;
  const search = searchInput.value.trim().toLowerCase();
  let filtered = allProducts.filter((p) => {
    const category =
      typeof p.category === "string" ? p.category.toLowerCase() : "";
    const name = typeof p.name === "string" ? p.name.toLowerCase() : "";
    const brand = typeof p.brand === "string" ? p.brand.toLowerCase() : "";
    const desc =
      typeof p.description === "string" ? p.description.toLowerCase() : "";
    return (
      (cat === "all" || category === cat) &&
      (name.includes(search) || brand.includes(search) || desc.includes(search))
    );
  });
  productGrid.innerHTML = filtered.map(productCardHTML).join("");
  // Add event listeners for selection and desc toggle
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("desc-toggle")) return;
      toggleProductSelect(card.dataset.id);
    });
    const descBtn = card.querySelector(".desc-toggle");
    if (descBtn) {
      descBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        card.classList.toggle("show-desc");
      });
    }
  });
}

function productCardHTML(p) {
  const selected = selectedProducts.some(
    (sp) => Number(sp.id) === Number(p.id)
  );
  return `<div class="product-card${
    selected ? " selected" : ""
  }" data-id="${Number(p.id)}">
    <img src="${p.image}" alt="${p.name}">
    <div class="brand">${p.brand}</div>
    <div class="name">${p.name}</div>
    <button class="desc-toggle" tabindex="0">Details</button>
    <div class="description">${p.description}</div>
  </div>`;
}

// --- Product Selection ---
function toggleProductSelect(id) {
  id = Number(id);
  const idx = selectedProducts.findIndex((p) => Number(p.id) === id);
  if (idx > -1) {
    selectedProducts.splice(idx, 1);
  } else {
    const prod = allProducts.find((p) => Number(p.id) === id);
    if (prod) selectedProducts.push(prod);
  }
  saveSelectedToStorage();
  updateProductCardSelection();
  renderSelected();
}

// Update only the selected state of product cards
function updateProductCardSelection() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const id = Number(card.dataset.id);
    if (selectedProducts.some((p) => Number(p.id) === id)) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

function renderSelected() {
  selectedList.innerHTML = selectedProducts
    .map(
      (p) =>
        `<li>${p.name} <button class="remove-btn" data-id="${p.id}" title="Remove">&times;</button></li>`
    )
    .join("");
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleProductSelect(btn.dataset.id);
    });
  });
}

clearSelectedBtn.addEventListener("click", () => {
  selectedProducts = [];
  saveSelectedToStorage();
  renderProducts();
  renderSelected();
});

// --- LocalStorage ---
function saveSelectedToStorage() {
  localStorage.setItem(
    "selectedProducts",
    JSON.stringify(selectedProducts.map((p) => p.id))
  );
}
function loadSelectedFromStorage() {
  const ids = JSON.parse(localStorage.getItem("selectedProducts") || "[]");
  selectedProducts = allProducts.filter((p) => ids.includes(p.id));
  renderSelected();
}

// --- Category & Search Events ---
categorySelect.addEventListener("change", renderProducts);
searchInput.addEventListener("input", () => {
  renderProducts();
  showSuggestions();
});

// --- Live Search Suggestions ---
function showSuggestions() {
  const query = searchInput.value.trim().toLowerCase();
  console.log(
    "showSuggestions called. Query:",
    query,
    "Products:",
    allProducts.length
  );
  if (!query) {
    searchSuggestions.innerHTML = "";
    searchSuggestions.style.display = "none";
    return;
  }
  // Get unique product names that match
  const matches = allProducts
    .map((p) => p.name)
    .filter((name) => name.toLowerCase().includes(query));
  const uniqueMatches = Array.from(new Set(matches)).slice(0, 8);
  if (uniqueMatches.length === 0) {
    searchSuggestions.innerHTML = "";
    searchSuggestions.style.display = "none";
    return;
  }
  searchSuggestions.innerHTML = uniqueMatches
    .map((name) => `<li class="suggestion-item">${name}</li>`)
    .join("");
  searchSuggestions.style.display = "block";
  // Add click event to autofill and filter
  document.querySelectorAll(".suggestion-item").forEach((item) => {
    item.addEventListener("mousedown", (e) => {
      searchInput.value = item.textContent;
      renderProducts();
      searchSuggestions.innerHTML = "";
      searchSuggestions.style.display = "none";
    });
  });
}

// Hide suggestions when focus leaves search
searchInput.addEventListener("blur", () => {
  setTimeout(() => {
    searchSuggestions.innerHTML = "";
    searchSuggestions.style.display = "none";
  }, 150);
});

// --- Generate Routine Button ---
generateBtn.addEventListener("click", async () => {
  if (!selectedProducts.length) return;
  addChatMessage(
    "user",
    "Generate a personalized routine for these products: " +
      selectedProducts.map((p) => p.name).join(", ")
  );

  // Add thinking message with new structure
  const thinkingDiv = document.createElement("div");
  thinkingDiv.className = "msg ai ai-structured thinking-msg";
  thinkingDiv.innerHTML = `
    <div class="ai-header">
      <i class="fa-solid fa-sparkles"></i>
      <span class="ai-label">AI Beauty Assistant</span>
    </div>
    <div class="ai-content">
      <div class="ai-typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
  chatWindow.appendChild(thinkingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  const routine = await fetchRoutine(selectedProducts);

  // Remove the thinking message
  const thinkingMsgs = chatWindow.querySelectorAll(".thinking-msg");
  if (thinkingMsgs.length) {
    chatWindow.removeChild(thinkingMsgs[thinkingMsgs.length - 1]);
  }

  addChatMessage("ai", routine, true);
});

// --- Chat Form ---
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;
  addChatMessage("user", msg);
  chatInput.value = "";

  // Add thinking message with new structure
  const thinkingDiv = document.createElement("div");
  thinkingDiv.className = "msg ai ai-structured thinking-msg";
  thinkingDiv.innerHTML = `
    <div class="ai-header">
      <i class="fa-solid fa-sparkles"></i>
      <span class="ai-label">AI Beauty Assistant</span>
    </div>
    <div class="ai-content">
      <div class="ai-typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
  chatWindow.appendChild(thinkingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  const aiReply = await fetchChat(msg);

  // Remove the thinking message
  const thinkingMsgs = chatWindow.querySelectorAll(".thinking-msg");
  if (thinkingMsgs.length) {
    chatWindow.removeChild(thinkingMsgs[thinkingMsgs.length - 1]);
  }

  addChatMessage("ai", aiReply, true);
});

// --- AI Response Formatting ---
function formatAIResponse(text) {
  if (!text || typeof text !== "string") return text || "";

  try {
    // Convert markdown-style formatting to HTML
    let formatted = text;

    // Handle headers (##, ###)
    formatted = formatted.replace(
      /^### (.+)$/gm,
      '<h4 class="ai-subheading">$1</h4>'
    );
    formatted = formatted.replace(
      /^## (.+)$/gm,
      '<h3 class="ai-heading">$1</h3>'
    );

    // Handle numbered lists (1. 2. 3.)
    formatted = formatted.replace(
      /^(\d+)\.\s+(.+)$/gm,
      '<div class="ai-list-item"><span class="ai-number">$1.</span> $2</div>'
    );

    // Handle bullet points (- or *)
    formatted = formatted.replace(
      /^[*-]\s+(.+)$/gm,
      '<div class="ai-bullet-item"><span class="ai-bullet">•</span> $1</div>'
    );

    // Handle bold text (**text**)
    formatted = formatted.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="ai-bold">$1</strong>'
    );

    // Handle italic text (*text*)
    formatted = formatted.replace(
      /\*([^*]+)\*/g,
      '<em class="ai-italic">$1</em>'
    );

    // Handle product names and brands (capitalize them and make them stand out)
    formatted = formatted.replace(
      /\b(CeraVe|L'Oréal|Neutrogena|Olay|Revlon|Maybelline)\b/gi,
      '<span class="ai-brand">$1</span>'
    );

    // Handle routine steps (Morning:, Evening:, Step 1:, etc.)
    formatted = formatted.replace(
      /^((?:Morning|Evening|Step \d+|AM|PM):\s*)/gm,
      '<div class="ai-step-header">$1</div>'
    );

    // Handle disclaimers and notes (*Note:, *Information, etc.)
    formatted = formatted.replace(
      /^\*([^*\n]+)\*$/gm,
      '<div class="ai-disclaimer">$1</div>'
    );

    // Convert line breaks to proper spacing
    formatted = formatted.replace(/\n\n/g, '</p><p class="ai-paragraph">');
    formatted = '<p class="ai-paragraph">' + formatted + "</p>";

    // Clean up empty paragraphs
    formatted = formatted.replace(/<p class="ai-paragraph"><\/p>/g, "");

    return formatted;
  } catch (error) {
    console.error("Error formatting AI response:", error);
    // Return original text wrapped in a paragraph if formatting fails
    return `<p class="ai-paragraph">${text}</p>`;
  }
}

function addChatMessage(role, text, animate = false) {
  chatHistory.push({ role, text });

  if (role === "ai" && animate) {
    // Add placeholder with structured formatting
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${role} ai-structured`;
    msgDiv.innerHTML = `
      <div class="ai-header">
        <i class="fa-solid fa-sparkles"></i>
        <span class="ai-label">AI Beauty Assistant</span>
      </div>
      <div class="ai-content">
        <div class="ai-typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    `;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Animate with structured content
    setTimeout(() => {
      const formattedText = formatAIResponse(text);
      const contentDiv = msgDiv.querySelector(".ai-content");

      // Remove typing indicator
      contentDiv.innerHTML = "";

      // Add formatted content with fade-in animation
      contentDiv.innerHTML = formattedText;
      contentDiv.style.opacity = "0";
      contentDiv.style.transform = "translateY(10px)";

      // Animate content appearance
      setTimeout(() => {
        contentDiv.style.transition = "opacity 0.8s ease, transform 0.8s ease";
        contentDiv.style.opacity = "1";
        contentDiv.style.transform = "translateY(0)";
      }, 300);

      chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 1200);
  } else if (role === "ai") {
    // Non-animated AI message with structure
    const formattedText = formatAIResponse(text);
    chatWindow.innerHTML += `
      <div class="msg ${role} ai-structured">
        <div class="ai-header">
          <i class="fa-solid fa-sparkles"></i>
          <span class="ai-label">AI Beauty Assistant</span>
        </div>
        <div class="ai-content">${formattedText}</div>
      </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } else {
    // User message
    chatWindow.innerHTML += `
      <div class="msg ${role}">
        <div class="user-header">
          <i class="fa-solid fa-user"></i>
          <span class="user-label">You</span>
        </div>
        <div class="user-content">${text}</div>
      </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

// --- AI API Integration ---
// Use Cloudflare Worker endpoint for OpenAI API with web search
const OPENAI_API_URL = "https://openai-proxy.zuhdmudy.workers.dev/";

// Generate routine using OpenAI API with web search
async function fetchRoutine(products) {
  // Show search indicator for routine generation (always uses web search)
  const searchIndicator = document.getElementById("search-indicator");
  if (searchIndicator) {
    searchIndicator.classList.add("active");
    searchIndicator.title = "Searching web for current routine information...";
  }

  // Prepare prompt for routine generation with web search
  const prompt = `Create a personalized beauty routine using these L'Oréal products. Please search for current information about these products and include any recent reviews, tips, or updates about their usage.

Products:
${products
  .map((p) => `- ${p.name} (${p.brand}, ${p.category}): ${p.description}`)
  .join("\n")}

Please structure your response as follows:
## Your Personalized L'Oréal Routine

### Morning Routine
(List morning steps with numbered list)

### Evening Routine  
(List evening steps with numbered list)

### Key Benefits
(Use bullet points for product benefits)

### Pro Tips
(Use bullet points for expert recommendations)

Please include current information about L'Oréal skincare trends, product compatibility, and any recent expert recommendations. Include citations or sources where possible.`;

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o", // Model that supports web search
        messages: [
          {
            role: "system",
            content:
              "You are a helpful skincare and beauty routine assistant for L'Oréal products. You have access to current information about beauty trends, product reviews, and expert recommendations. Always include sources or citations when possible, and provide the most up-to-date information about L'Oréal products and skincare routines.\n\nFORMATTING GUIDELINES:\n- Use ## for main headings (e.g., ## Your Personalized Routine)\n- Use ### for subheadings (e.g., ### Morning Routine)\n- Use numbered lists for steps (1. 2. 3.)\n- Use bullet points (-) for product benefits or tips\n- Use **bold** for product names and important terms\n- Use Morning: and Evening: to clearly separate routine times\n- Structure your response with clear sections and easy-to-follow steps",
          },
          { role: "user", content: prompt },
        ],
        // Enable web search capabilities
        tools: [
          {
            type: "function",
            function: {
              name: "web_search",
              description:
                "Search the web for current information about L'Oréal products, beauty trends, and skincare recommendations",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description:
                      "The search query for current beauty and skincare information",
                  },
                },
                required: ["query"],
              },
            },
          },
        ],
        tool_choice: "auto", // Let the AI decide when to use web search
        web_search: true, // Enable web search for real-time information
      }),
    });

    if (!res.ok) throw new Error("API error");
    const data = await res.json();

    let response =
      data.choices?.[0]?.message?.content || "Sorry, no routine generated.";

    // Add disclaimer about current information
    response +=
      "\n\n*Note: This routine includes current information and recommendations. Always patch test new products and consult with a dermatologist for personalized advice.*";

    // Update search indicator
    if (searchIndicator) {
      searchIndicator.classList.remove("active");
      searchIndicator.title = "Routine includes current web information";
    }

    return response;
  } catch (e) {
    // Reset search indicator on error
    if (searchIndicator) {
      searchIndicator.classList.remove("active");
      searchIndicator.title = "Includes current web information";
    }

    console.error("Error generating routine:", e);
    return "Error generating routine. Please try again.";
  }
}

// Chat follow-up using OpenAI API with web search
async function fetchChat(message) {
  // Check if the message is asking about current L'Oréal information
  const needsWebSearch =
    message.toLowerCase().includes("current") ||
    message.toLowerCase().includes("latest") ||
    message.toLowerCase().includes("recent") ||
    message.toLowerCase().includes("new") ||
    message.toLowerCase().includes("trend");

  // Show search indicator if web search is needed
  const searchIndicator = document.getElementById("search-indicator");
  if (needsWebSearch && searchIndicator) {
    searchIndicator.classList.add("active");
    searchIndicator.title = "Searching web for current information...";
  }

  // Build conversation history for context
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful skincare and beauty routine assistant for L'Oréal products. You have access to current information about beauty trends, product reviews, and expert recommendations. When users ask about current information, search the web for the most up-to-date details. Always include sources or citations when providing current information.\n\nFORMATTING GUIDELINES:\n- Use ## for main headings when providing detailed answers\n- Use ### for subheadings to organize information\n- Use numbered lists (1. 2. 3.) for sequential steps or recommendations\n- Use bullet points (-) for benefits, tips, or related information\n- Use **bold** for product names, brands, and key terms\n- Keep responses well-structured and easy to scan\n- Use clear, concise language with proper spacing",
    },
  ];

  chatHistory.forEach((msg) => {
    messages.push({ role: msg.role, content: msg.text });
  });

  // Enhance the user message to encourage web search when appropriate
  let enhancedMessage = message;
  if (needsWebSearch) {
    enhancedMessage +=
      " Please search for current information and include any relevant sources or links.";
  }

  messages.push({ role: "user", content: enhancedMessage });

  try {
    const requestBody = {
      model: "gpt-4o",
      messages,
      web_search: needsWebSearch, // Enable web search for relevant queries
    };

    // Add tools for web search if needed
    if (needsWebSearch) {
      requestBody.tools = [
        {
          type: "function",
          function: {
            name: "web_search",
            description:
              "Search the web for current information about L'Oréal products, beauty trends, and skincare recommendations",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description:
                    "The search query for current beauty and skincare information",
                },
              },
              required: ["query"],
            },
          },
        },
      ];
      requestBody.tool_choice = "auto";
    }

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) throw new Error("API error");
    const data = await res.json();

    let response = data.choices?.[0]?.message?.content || "Sorry, no answer.";

    // Add disclaimer for web-searched information
    if (needsWebSearch) {
      response +=
        "\n\n*Information includes current data from web sources. Always verify with official L'Oréal sources.*";
    }

    // Update search indicator
    if (searchIndicator) {
      searchIndicator.classList.remove("active");
      if (needsWebSearch) {
        searchIndicator.title = "Response includes current web information";
      } else {
        searchIndicator.title = "Includes current web information";
      }
    }

    return response;
  } catch (e) {
    // Reset search indicator on error
    if (searchIndicator) {
      searchIndicator.classList.remove("active");
      searchIndicator.title = "Includes current web information";
    }

    console.error("Error in chat:", e);
    console.error("Error details:", {
      message: e.message,
      stack: e.stack,
      needsWebSearch,
      originalMessage: message,
    });
    return "Error contacting AI. Please try again.";
  }
}

// --- RTL Support ---
function setRTL(enabled) {
  isRTL = enabled;
  document.documentElement.dir = enabled ? "rtl" : "ltr";
}

// Example: toggle RTL with keyboard shortcut (Ctrl+R)
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "r") {
    setRTL(!isRTL);
  }
});

// --- Helpers ---
// Safely capitalize a string (handles undefined/null)
function capitalize(str) {
  if (typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Init ---
loadProducts();
