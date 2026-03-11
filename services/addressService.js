const ADDRESS_SEARCH_ENDPOINT =
  window.APP_CONFIG?.ADDRESS_SEARCH_ENDPOINT ||
  "https://jykfgstmcmhhhluzojxb.supabase.co/functions/v1/address-search";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_DELAY = 250;

function debounce(fn, delay = DEBOUNCE_DELAY) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSuggestion(item = {}) {
  const street = item.street || "";
  const houseNumber = item.houseNumber || item.house_number || "";
  const postalCode = item.postalCode || item.postal_code || "";
  const city = item.city || "";
  const country = item.country || "CH";

  const fallbackLabel = [street, houseNumber].filter(Boolean).join(" ") +
    ((postalCode || city) ? `, ${postalCode} ${city}` : "");

  return {
    label: String(item.label || fallbackLabel).trim(),
    street: String(street).trim(),
    houseNumber: String(houseNumber).trim(),
    postalCode: String(postalCode).trim(),
    city: String(city).trim(),
    country: String(country).trim() || "CH",
  };
}

async function fetchAddressSuggestions(query) {
  const url = new URL(ADDRESS_SEARCH_ENDPOINT);
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Adresse API HTTP ${response.status}`);
  }

  const payload = await response.json();
  const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];

  return suggestions
    .map(normalizeSuggestion)
    .filter((item) => item.label && item.city);
}

export function initializeAddressAutocomplete() {
  const searchInput = document.getElementById("reg-address-search");
  const suggestionsBox = document.getElementById("address-suggestions");
  const statusBox = document.getElementById("address-status");
  const selectedCard = document.getElementById("address-selected-card");
  const selectedLabel = document.getElementById("address-selected-label");
  const changeButton = document.getElementById("change-address-btn");

  const hiddenAddress = document.getElementById("reg-address");
  const hiddenStreet = document.getElementById("reg-street");
  const hiddenHouseNumber = document.getElementById("reg-house-number");
  const hiddenPostalCode = document.getElementById("reg-npa");
  const hiddenCity = document.getElementById("reg-city");
  const hiddenCountry = document.getElementById("reg-country");
  const hiddenVerified = document.getElementById("reg-address-verified");

  const previewPostalCode = document.getElementById("reg-address-preview-npa");
  const previewCity = document.getElementById("reg-address-preview-city");

  if (
    !searchInput ||
    !suggestionsBox ||
    !statusBox ||
    !hiddenAddress ||
    !hiddenStreet ||
    !hiddenHouseNumber ||
    !hiddenPostalCode ||
    !hiddenCity ||
    !hiddenCountry ||
    !hiddenVerified ||
    !previewPostalCode ||
    !previewCity
  ) {
    return;
  }

  let currentResults = [];

  function setStatus(message = "", type = "neutral") {
    statusBox.classList.remove("hidden", "text-red-500", "text-primary", "text-gray-500", "dark:text-gray-300");

    if (!message) {
      statusBox.textContent = "";
      statusBox.classList.add("hidden");
      return;
    }

    statusBox.textContent = message;

    if (type === "error") {
      statusBox.classList.add("text-red-500");
      return;
    }

    if (type === "success") {
      statusBox.classList.add("text-primary");
      return;
    }

    statusBox.classList.add("text-gray-500", "dark:text-gray-300");
  }

  function clearSuggestions() {
    suggestionsBox.innerHTML = "";
    suggestionsBox.classList.add("hidden");
    currentResults = [];
  }

  function clearSelectedAddress() {
    hiddenAddress.value = "";
    hiddenStreet.value = "";
    hiddenHouseNumber.value = "";
    hiddenPostalCode.value = "";
    hiddenCity.value = "";
    hiddenCountry.value = "CH";
    hiddenVerified.value = "false";

    previewPostalCode.value = "";
    previewCity.value = "";

    if (selectedLabel) selectedLabel.textContent = "";
    if (selectedCard) selectedCard.classList.add("hidden");
  }

  function markAddressAsUnverified() {
    clearSelectedAddress();
  }

  function applySelectedAddress(address) {
    hiddenAddress.value = address.label;
    hiddenStreet.value = address.street;
    hiddenHouseNumber.value = address.houseNumber;
    hiddenPostalCode.value = address.postalCode;
    hiddenCity.value = address.city;
    hiddenCountry.value = address.country || "CH";
    hiddenVerified.value = "true";

    previewPostalCode.value = address.postalCode;
    previewCity.value = address.city;

    if (selectedLabel) selectedLabel.textContent = address.label;
    if (selectedCard) selectedCard.classList.remove("hidden");

    searchInput.value = address.label;
    clearSuggestions();
    setStatus("Adresse suisse validée.", "success");
  }

  function renderSuggestions(items) {
    if (!items.length) {
      clearSuggestions();
      setStatus("Aucune adresse trouvée.", "error");
      return;
    }

    suggestionsBox.innerHTML = items
      .map((item, index) => {
        const safeLabel = escapeHtml(item.label);
        const safeCity = escapeHtml(item.city);
        const safePostalCode = escapeHtml(item.postalCode);
        const safeCountry = escapeHtml(item.country);

        return `
          <button
            type="button"
            data-address-index="${index}"
            class="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b last:border-b-0 border-gray-100 dark:border-white/10"
          >
            <p class="text-sm font-semibold text-gray-900 dark:text-white">${safeLabel}</p>
            <p class="text-xs text-gray-500 dark:text-gray-300">${safePostalCode} ${safeCity} · ${safeCountry}</p>
          </button>
        `;
      })
      .join("");

    suggestionsBox.classList.remove("hidden");
  }

  const performSearch = debounce(async (query) => {
    if (query.length < MIN_QUERY_LENGTH) {
      clearSuggestions();
      setStatus("Tapez au moins 3 caractères.", "neutral");
      return;
    }

    setStatus("Recherche en cours...", "neutral");

    try {
      const results = await fetchAddressSuggestions(query);
      currentResults = results;
      renderSuggestions(results);

      if (results.length) {
        setStatus("Sélectionnez votre adresse dans la liste.", "neutral");
      }
    } catch (error) {
      clearSuggestions();
      setStatus("Service d’adresse indisponible.", "error");
      console.error("Erreur autocomplete adresse :", error);
    }
  }, DEBOUNCE_DELAY);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();

    markAddressAsUnverified();

    if (!query) {
      clearSuggestions();
      setStatus("", "neutral");
      return;
    }

    performSearch(query);
  });

  suggestionsBox.addEventListener("click", (event) => {
    const button = event.target.closest("[data-address-index]");
    if (!button) return;

    const index = Number(button.dataset.addressIndex);
    const selectedAddress = currentResults[index];
    if (!selectedAddress) return;

    applySelectedAddress(selectedAddress);
  });

  if (changeButton) {
    changeButton.addEventListener("click", () => {
      clearSuggestions();
      clearSelectedAddress();
      searchInput.value = "";
      searchInput.focus();
      setStatus("Recherchez une nouvelle adresse.", "neutral");
    });
  }
}