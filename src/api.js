/**
 * DNSHE Free Domain API Client
 * Uses /api/ proxy (Cloudflare Pages Functions) to bypass CORS
 */

/**
 * Uses local /api/ proxy (Cloudflare Pages Functions) to avoid CORS.
 * Proxy forwards to https://api005.dnshe.com/index.php?m=domain_hub
 */

function getCredentials() {
  const apiKey = localStorage.getItem('dnshe_api_key') || '';
  const apiSecret = localStorage.getItem('dnshe_api_secret') || '';
  return { apiKey, apiSecret };
}

function saveCredentials(apiKey, apiSecret) {
  localStorage.setItem('dnshe_api_key', apiKey);
  localStorage.setItem('dnshe_api_secret', apiSecret);
}

function hasCredentials() {
  const { apiKey, apiSecret } = getCredentials();
  return apiKey && apiSecret;
}

async function request(endpoint, action, method = 'GET', data = null, extraParams = '') {
  const { apiKey, apiSecret } = getCredentials();
  if (!apiKey || !apiSecret) {
    throw new Error('请先配置 API 密钥');
  }

  // Use local proxy to avoid CORS
  let url = `/api/${endpoint}?action=${action}${extraParams}`;

  const options = {
    method,
    headers: {
      'X-API-Key': apiKey,
      'X-API-Secret': apiSecret,
      'Content-Type': 'application/json'
    }
  };

  if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || result.error || '请求失败');
  }

  return result;
}

// === Subdomain Management ===

export async function listSubdomains({ page = 1, perPage = 50, search = '', status = '', sortBy = 'id', sortDir = 'desc' } = {}) {
  let params = `&page=${page}&per_page=${perPage}&include_total=1&sort_by=${sortBy}&sort_dir=${sortDir}`;
  if (search) params += `&search=${encodeURIComponent(search)}`;
  if (status) params += `&status=${status}`;
  return request('subdomains', 'list', 'GET', null, params);
}

export async function getSubdomain(subdomainId) {
  return request('subdomains', 'get', 'GET', null, `&subdomain_id=${subdomainId}`);
}

export async function registerSubdomain(subdomain, rootdomain) {
  return request('subdomains', 'register', 'POST', { subdomain, rootdomain });
}

export async function deleteSubdomain(subdomainId) {
  return request('subdomains', 'delete', 'POST', { subdomain_id: subdomainId });
}

export async function renewSubdomain(subdomainId) {
  return request('subdomains', 'renew', 'POST', { subdomain_id: subdomainId });
}

// === DNS Record Management ===

export async function listDnsRecords(subdomainId) {
  return request('dns_records', 'list', 'GET', null, `&subdomain_id=${subdomainId}`);
}

export async function createDnsRecord(subdomainId, type, content, { name = '', ttl = 600, priority = null } = {}) {
  const data = { subdomain_id: subdomainId, type, content, ttl };
  if (name) data.name = name;
  if (priority !== null) data.priority = priority;
  return request('dns_records', 'create', 'POST', data);
}

export async function updateDnsRecord(id, { type, name, content, ttl, priority } = {}) {
  const data = { id };
  if (type) data.type = type;
  if (name !== undefined) data.name = name;
  if (content) data.content = content;
  if (ttl) data.ttl = ttl;
  if (priority !== undefined) data.priority = priority;
  return request('dns_records', 'update', 'POST', data);
}

export async function deleteDnsRecord(id) {
  return request('dns_records', 'delete', 'POST', { id });
}

// === API Key Management ===

export async function listApiKeys() {
  return request('keys', 'list', 'GET');
}

export async function createApiKey(keyName, ipWhitelist = '') {
  const data = { key_name: keyName };
  if (ipWhitelist) data.ip_whitelist = ipWhitelist;
  return request('keys', 'create', 'POST', data);
}

export async function deleteApiKey(keyId) {
  return request('keys', 'delete', 'POST', { key_id: keyId });
}

export async function regenerateApiKey(keyId) {
  return request('keys', 'regenerate', 'POST', { key_id: keyId });
}

// === Quota ===

export async function getQuota() {
  return request('quota', 'list', 'GET');
}

// === Credentials ===

export { getCredentials, saveCredentials, hasCredentials };
