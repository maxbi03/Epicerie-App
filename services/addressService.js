const SEARCH_ENDPOINT = 'https://api3.geo.admin.ch/rest/services/ech/SearchServer';
const MIN_QUERY_LENGTH = 3;
const MAX_SUGGESTIONS = 6;

function getEl(id) {
  return document.getElementById(id);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTags(value = '') {
  const div = document.createElement('div');
  div.innerHTML = value;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function setStatus(message = '', tone = 'neutral') {
  const status = getEl('address-status');
  if (!status) return;

  status.textContent = message;
  status.classList.remove(
    'hidden',
    'text-red-500',
    'text-green-600',
    'text-gray-500',
    'dark:text-red-400',
    'dark:text-green-400',
    'dark:text-gray-300'
  );

  if (!message) {
    status.classList.add('hidden');
    return;
  }

  if (tone === 'error') {
    status.classList.add('text-red-500', 'dark:text-red-400');
  } else if (tone === 'success') {
    status.classList.add('text-green-600', 'dark:text-green-400');
  } else {
    status.classList.add('text-gray-500', 'dark:text-gray-300');
  }
}

function clearSuggestions() {
  const container = getEl('address-suggestions');
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('hidden');
}

function extractStreetAndNumber(text = '') {
  const clean = stripTags(text);

  const match = clean.match(/^(.+?)\s+(\d+[A-Za-z]?)$/);
  if (match) {
    return {
      street: match[1].trim(),
      houseNumber: match[2].trim(),
    };
  }

  return {
    street: clean.trim(),
    houseNumber: '',
  };
}

function extractPostalCodeAndCity(...parts) {
  for (const part of parts) {
    const clean = stripTags(part || '');
    if (!clean) continue;

    const match = clean.match(/(\d{4})\s+([A-Za-zÀ-ÿ'’\- ]{2,})/);
    if (match) {
      return {
        postalCode: match[1].trim(),
        city: match[2].trim(),
      };
    }
  }

  return {
    postalCode: '',
    city: '',
  };
}

function normalizeSuggestion(result) {
  const attrs = result?.attrs || {};

  const labelText = stripTags(attrs.label || '');
  const detailText = stripTags(attrs.detail || '');

  const streetAndNumber = extractStreetAndNumber(
    attrs.street || labelText.split(',')[0] || labelText
  );

  const locality = extractPostalCodeAndCity(
    attrs.zip,
    attrs.postalcode,
    attrs.plz,
    attrs.city,
    attrs.gemeinde,
    detailText,
    labelText
  );

  let label = labelText;
  if (!label) {
    label = [
      [streetAndNumber.street, streetAndNumber.houseNumber].filter(Boolean).join(' '),
      [locality.postalCode, locality.city].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ');
  }

  return {
    label,
    street: streetAndNumber.street,
    houseNumber: streetAndNumber.houseNumber,
    postalCode: locality.postalCode,
    city: locality.city,
    country: 'CH',
    raw: result,
  };
}

function fillSelectedAddress(item) {
  const searchInput = getEl('reg-address-search') || getEl('reg-address');
  const hiddenAddress = getEl('reg-address');
  const streetInput = getEl('reg-street');
  const houseNumberInput = getEl('reg-house-number');
  const npaInput = getEl('reg-npa');
  const cityInput = getEl('reg-city');
  const countryInput = getEl('reg-country');
  const verifiedInput = getEl('reg-address-verified');

  const previewNpa = getEl('reg-address-preview-npa');
  const previewCity = getEl('reg-address-preview-city');

  const selectedCard = getEl('address-selected-card');
  const selectedLabel = getEl('address-selected-label');

  if (searchInput) searchInput.value = item.label;
  if (hiddenAddress) hiddenAddress.value = item.label;
  if (streetInput) streetInput.value = item.street;
  if (houseNumberInput) houseNumberInput.value = item.houseNumber;
  if (npaInput) npaInput.value = item.postalCode;
  if (cityInput) cityInput.value = item.city;
  if (countryInput) countryInput.value = item.country;
  if (verifiedInput) verifiedInput.value = 'true';

  if (previewNpa) previewNpa.value = item.postalCode;
  if (previewCity) previewCity.value = item.city;

  if (selectedLabel) selectedLabel.textContent = item.label;
  if (selectedCard) selectedCard.classList.remove('hidden');

  clearSuggestions();
  setStatus('Adresse suisse validée.', 'success');
}

function resetSelection() {
  const verifiedInput = getEl('reg-address-verified');
  const selectedCard = getEl('address-selected-card');
  const selectedLabel = getEl('address-selected-label');

  ['reg-address', 'reg-street', 'reg-house-number', 'reg-npa', 'reg-city'].forEach((id) => {
    const el = getEl(id);
    if (el) el.value = '';
  });

  const previewNpa = getEl('reg-address-preview-npa');
  const previewCity = getEl('reg-address-preview-city');

  if (previewNpa) previewNpa.value = '';
  if (previewCity) previewCity.value = '';

  if (verifiedInput) verifiedInput.value = 'false';
  if (selectedLabel) selectedLabel.textContent = '';
  if (selectedCard) selectedCard.classList.add('hidden');
}

async function searchAddresses(query, signal) {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('type', 'locations');
  url.searchParams.set('origins', 'address');
  url.searchParams.set('searchText', query);
  url.searchParams.set('limit', String(MAX_SUGGESTIONS));
  url.searchParams.set('lang', 'fr');

  const response = await fetch(url.toString(), {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload?.results) ? payload.results : [];

  return results
    .map(normalizeSuggestion)
    .filter((item) => item.label && (item.city || item.postalCode));
}

function renderSuggestions(items) {
  const container = getEl('address-suggestions');
  if (!container) return;

  if (!items.length) {
    clearSuggestions();
    return;
  }

  container.innerHTML = items
    .map(
      (item, index) => `
        <button
          type="button"
          class="block w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/10 transition ${index < items.length - 1 ? 'border-b border-gray-100 dark:border-white/10' : ''}"
          data-address-index="${index}"
        >
          <div class="font-medium text-sm text-gray-900 dark:text-white">${escapeHtml(item.label)}</div>
          <div class="text-xs text-gray-500 dark:text-gray-300 mt-1">${escapeHtml(
            [item.postalCode, item.city].filter(Boolean).join(' ')
          )}</div>
        </button>
      `
    )
    .join('');

  container.classList.remove('hidden');

  container.querySelectorAll('[data-address-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.addressIndex);
      fillSelectedAddress(items[index]);
    });
  });
}

export function initializeAddressAutocomplete() {
  const searchInput = getEl('reg-address-search') || getEl('reg-address');
  const suggestions = getEl('address-suggestions');

  if (!searchInput || !suggestions) return;

  let debounceTimer = null;
  let controller = null;

  const runSearch = () => {
    const query = searchInput.value.trim();

    resetSelection();

    if (debounceTimer) clearTimeout(debounceTimer);
    if (controller) controller.abort();

    if (query.length < MIN_QUERY_LENGTH) {
      clearSuggestions();
      setStatus('Tapez au moins 3 caractères pour rechercher une adresse suisse.');
      return;
    }

    setStatus('Recherche en cours...');

    debounceTimer = setTimeout(async () => {
      controller = new AbortController();

      try {
        const items = await searchAddresses(query, controller.signal);

        if (!items.length) {
          clearSuggestions();
          setStatus('Aucune adresse trouvée. Essayez avec rue + numéro + localité.', 'error');
          return;
        }

        renderSuggestions(items);
        setStatus('Sélectionnez votre adresse dans la liste.');
      } catch (error) {
        if (error?.name === 'AbortError') return;

        console.error('Erreur autocomplete adresse:', error);
        clearSuggestions();
        setStatus("Le service d'adresse n'est pas disponible pour le moment.", 'error');
      }
    }, 250);
  };

  searchInput.addEventListener('input', runSearch);

  searchInput.addEventListener('focus', () => {
    const query = searchInput.value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setStatus('Tapez au moins 3 caractères pour rechercher une adresse suisse.');
    }
  });

  document.addEventListener('click', (event) => {
    const container = getEl('address-suggestions');
    if (!container) return;

    if (!container.contains(event.target) && event.target !== searchInput) {
      clearSuggestions();
    }
  });

  const changeBtn = getEl('change-address-btn');
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      resetSelection();
      searchInput.value = '';
      searchInput.focus();
      clearSuggestions();
      setStatus('Saisissez une nouvelle adresse suisse.');
    });
  }
}