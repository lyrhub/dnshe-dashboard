/**
 * Cloudflare Pages Function - API Proxy
 * Proxies requests to DNSHE API to avoid CORS issues
 * 
 * Frontend calls: /api/endpoint?action=list&...
 * This proxies to: https://api005.dnshe.com/index.php?m=domain_hub&endpoint=...&action=...
 */

const DNSHE_API = 'https://api005.dnshe.com/index.php';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders()
    });
  }

  // Extract the path after /api/
  // e.g., /api/subdomains?action=list -> endpoint=subdomains, action=list
  const pathSegments = url.pathname.replace('/api/', '').split('/').filter(Boolean);
  const endpoint = pathSegments[0] || '';

  if (!endpoint) {
    return jsonResponse({ success: false, error: 'Missing endpoint' }, 400);
  }

  // Build target URL
  const targetUrl = new URL(DNSHE_API);
  targetUrl.searchParams.set('m', 'domain_hub');
  targetUrl.searchParams.set('endpoint', endpoint);

  // Copy all query params from the original request
  for (const [key, value] of url.searchParams.entries()) {
    targetUrl.searchParams.set(key, value);
  }

  // Forward request to DNSHE API
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  // Forward auth headers
  const apiKey = request.headers.get('X-API-Key');
  const apiSecret = request.headers.get('X-API-Secret');
  if (apiKey) headers.set('X-API-Key', apiKey);
  if (apiSecret) headers.set('X-API-Secret', apiSecret);

  const fetchOptions = {
    method: request.method,
    headers
  };

  // Forward body for POST/PUT/PATCH/DELETE
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    try {
      const body = await request.text();
      if (body) fetchOptions.body = body;
    } catch (e) {
      // No body
    }
  }

  try {
    const response = await fetch(targetUrl.toString(), fetchOptions);
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 502);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-API-Secret',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}
