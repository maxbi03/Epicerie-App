const PAYREXX_INSTANCE = process.env.PAYREXX_INSTANCE;
const PAYREXX_API_SECRET = process.env.PAYREXX_API_SECRET;
const PAYREXX_BASE = `https://api.payrexx.com/v1.0`;

async function payrexxRequest(method, endpoint, body = null) {
  const url = `${PAYREXX_BASE}/${endpoint}/?instance=${PAYREXX_INSTANCE}`;
  const options = {
    method,
    headers: {
      'X-API-KEY': PAYREXX_API_SECRET,
    },
  };

  if (body && method !== 'GET') {
    const params = new URLSearchParams();
    flattenParams(body, params);
    options.body = params.toString();
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const res = await fetch(url, options);
  const data = await res.json();

  if (data.status !== 'success' && !res.ok) {
    throw new Error(data.message || `Payrexx error: ${res.status}`);
  }

  return data.data ? data.data[0] || data.data : data;
}

// Flatten nested objects into URLSearchParams with bracket notation
function flattenParams(obj, params, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenParams(value, params, fullKey);
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object') {
          flattenParams(item, params, `${fullKey}[${i}]`);
        } else {
          params.append(`${fullKey}[${i}]`, item);
        }
      });
    } else if (value !== null && value !== undefined) {
      params.append(fullKey, value);
    }
  }
}

export async function createPayrexxGateway({ amountInCents, currency, purpose, successRedirectUrl, failedRedirectUrl, referenceId, fields }) {
  const body = {
    amount: amountInCents,
    currency,
    purpose,
    successRedirectUrl,
    failedRedirectUrl,
    referenceId,
    skipResultPage: 0,
  };

  if (fields) {
    body.fields = fields;
  }

  const gateway = await payrexxRequest('POST', 'Gateway', body);
  return gateway;
}

export async function getPayrexxGateway(gatewayId) {
  return payrexxRequest('GET', `Gateway/${gatewayId}`);
}
