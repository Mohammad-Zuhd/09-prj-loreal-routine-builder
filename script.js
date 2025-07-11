// ...existing code...
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
  addChatMessage("ai", "AI is thinking...", false); // Show thinking immediately
  const routine = await fetchRoutine(selectedProducts);
  // Remove last 'AI is thinking...' message
  let msgs = chatWindow.querySelectorAll(".msg.ai");
  if (msgs.length) chatWindow.removeChild(msgs[msgs.length - 1]);
  addChatMessage("ai", routine, true);
});


// --- Chat Form ---
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;
  addChatMessage("user", msg);
  chatInput.value = "";
  addChatMessage("ai", "AI is thinking...", false);
  const aiReply = await fetchChat(msg);
  let msgs = chatWindow.querySelectorAll(".msg.ai");
  if (msgs.length) chatWindow.removeChild(msgs[msgs.length - 1]);
  addChatMessage("ai", aiReply, true);
});


function addChatMessage(role, text, animate = false) {
  chatHistory.push({ role, text });
  if (role === "ai" && animate) {
    // Add placeholder
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${role}`;
    msgDiv.innerHTML = `<b>AI:</b> <span class="ai-typing">AI is thinking...</span>`;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    // Animate word by word
    setTimeout(() => {
      let words = text.split(" ");
      let i = 0;
      msgDiv.querySelector(".ai-typing").textContent = "";
      function typeWord() {
        if (i < words.length) {
          msgDiv.querySelector(".ai-typing").textContent +=
            (i > 0 ? " " : "") + words[i];
          i++;
          chatWindow.scrollTop = chatWindow.scrollHeight;
          setTimeout(typeWord, 40 + Math.random() * 40); // randomize speed a bit
        }
      }
      typeWord();
    }, 600);
  } else {
    chatWindow.innerHTML += `<div class="msg ${role}"><b>${
      role === "user" ? "You" : "AI"
    }:</b> ${text}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}


// --- AI API Integration ---
// Use Cloudflare Worker endpoint for OpenAI API
const OPENAI_API_URL = "https://openai-proxy.zuhdmudy.workers.dev/";


// Generate routine using OpenAI API
async function fetchRoutine(products) {
  // Prepare prompt for routine generation
  const prompt = `Create a personalized beauty routine using these products.\n${products
    .map((p) => `- ${p.name} (${p.brand}, ${p.category}): ${p.description}`)
    .join("\n")}`;
  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful skincare and beauty routine assistant for L’Oréal products.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return (
      data.choices?.[0]?.message?.content || "Sorry, no routine generated."
    );
  } catch (e) {
    return "Error generating routine.";
  }
}


// Chat follow-up using OpenAI API
async function fetchChat(message) {
  // Build conversation history for context
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful skincare and beauty routine assistant for L’Oréal products.",
    },
  ];
  chatHistory.forEach((msg) => {
    messages.push({ role: msg.role, content: msg.text });
  });
  messages.push({ role: "user", content: message });
  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
      }),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "Sorry, no answer.";
  } catch (e) {
    return "Error contacting AI.";
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


// ...existing code...
