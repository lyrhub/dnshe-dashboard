import {
  listSubdomains,
  registerSubdomain,
  deleteSubdomain,
  renewSubdomain,
  listDnsRecords,
  createDnsRecord,
  deleteDnsRecord,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  regenerateApiKey,
  getQuota,
  getCredentials,
  saveCredentials,
  hasCredentials
} from './api.js';

// === DOM Elements ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// === Toast ===
function toast(message, type = 'success') {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast ${type}`;
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// === Modal helpers ===
function openModal(id) {
  $(`#${id}`).classList.remove('hidden');
}

function closeModal(id) {
  $(`#${id}`).classList.add('hidden');
}

// === Tab switching ===
$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(tc => { tc.classList.remove('active'); tc.classList.add('hidden'); });
    tab.classList.add('active');
    const target = $(`#tab-${tab.dataset.tab}`);
    target.classList.remove('hidden');
    target.classList.add('active');
  });
});

// === Settings Modal ===
$('#btn-settings').addEventListener('click', () => {
  const { apiKey, apiSecret } = getCredentials();
  $('#input-api-key').value = apiKey;
  $('#input-api-secret').value = apiSecret;
  openModal('modal-settings');
});

$('#btn-settings-cancel').addEventListener('click', () => closeModal('modal-settings'));
$('#modal-settings .modal-backdrop').addEventListener('click', () => closeModal('modal-settings'));

$('#form-settings').addEventListener('submit', (e) => {
  e.preventDefault();
  const apiKey = $('#input-api-key').value.trim();
  const apiSecret = $('#input-api-secret').value.trim();
  if (!apiKey || !apiSecret) {
    toast('请输入完整的 API 密钥', 'error');
    return;
  }
  saveCredentials(apiKey, apiSecret);
  closeModal('modal-settings');
  toast('API 密钥已保存');
  loadAll();
});

// === Close modals ===
$$('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').classList.add('hidden');
  });
});

$$('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', () => {
    bd.closest('.modal').classList.add('hidden');
  });
});

// === Subdomains ===
let currentPage = 1;
let searchTimeout = null;

async function loadSubdomains() {
  if (!hasCredentials()) return;

  const search = $('#search-subdomains').value.trim();
  const status = $('#filter-status').value;

  try {
    const result = await listSubdomains({ page: currentPage, search, status });
    renderSubdomains(result);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderSubdomains(result) {
  const list = $('#subdomains-list');
  const subdomains = result.subdomains || [];

  if (subdomains.length === 0) {
    list.innerHTML = '<p class="placeholder">暂无子域名</p>';
    $('#subdomains-pagination').innerHTML = '';
    return;
  }

  list.innerHTML = subdomains.map(d => `
    <div class="list-item" data-id="${d.id}">
      <div class="list-item-info">
        <span class="list-item-title">${d.full_domain || d.subdomain + '.' + d.rootdomain}</span>
        <div class="list-item-meta">
          <span class="status status-${d.status}">${d.status}</span>
          <span>创建: ${d.created_at || '--'}</span>
          ${d.expires_at ? `<span>到期: ${d.expires_at}</span>` : ''}
        </div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm btn-success btn-renew" data-id="${d.id}" title="续期">续期</button>
        <button class="btn btn-sm btn-ghost btn-dns" data-id="${d.id}" data-domain="${d.full_domain || d.subdomain + '.' + d.rootdomain}" title="DNS 记录">DNS</button>
        <button class="btn btn-sm btn-danger btn-delete-sub" data-id="${d.id}" data-domain="${d.full_domain || d.subdomain + '.' + d.rootdomain}" title="删除">删除</button>
      </div>
    </div>
  `).join('');

  // Pagination
  const pagination = result.pagination;
  if (pagination) {
    const { page, has_more, prev_page } = pagination;
    let html = '';
    if (prev_page) html += `<button data-page="${prev_page}">上一页</button>`;
    html += `<button class="active" disabled>第 ${page} 页</button>`;
    if (has_more) html += `<button data-page="${page + 1}">下一页</button>`;
    $('#subdomains-pagination').innerHTML = html;
  } else {
    $('#subdomains-pagination').innerHTML = '';
  }

  // Also populate DNS subdomain select
  populateDnsSelect(subdomains);
}

function populateDnsSelect(subdomains) {
  const select = $('#dns-subdomain-select');
  const current = select.value;
  select.innerHTML = '<option value="">选择子域名...</option>' +
    subdomains.map(d => `<option value="${d.id}">${d.full_domain || d.subdomain + '.' + d.rootdomain}</option>`).join('');
  if (current) select.value = current;
}

// Search debounce
$('#search-subdomains').addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage = 1;
    loadSubdomains();
  }, 400);
});

$('#filter-status').addEventListener('change', () => {
  currentPage = 1;
  loadSubdomains();
});

$('#btn-refresh-subdomains').addEventListener('click', loadSubdomains);

// Pagination click
$('#subdomains-pagination').addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON' && e.target.dataset.page) {
    currentPage = parseInt(e.target.dataset.page);
    loadSubdomains();
  }
});

// Subdomain actions (event delegation)
$('#subdomains-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const id = parseInt(btn.dataset.id);

  if (btn.classList.contains('btn-renew')) {
    if (!confirm('确认续期此子域名？')) return;
    try {
      const result = await renewSubdomain(id);
      toast(result.message || '续期成功');
      loadSubdomains();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (btn.classList.contains('btn-delete-sub')) {
    const domain = btn.dataset.domain;
    if (!confirm(`确认删除 ${domain}？此操作不可恢复！`)) return;
    try {
      await deleteSubdomain(id);
      toast('子域名已删除');
      loadSubdomains();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (btn.classList.contains('btn-dns')) {
    // Switch to DNS tab and select this subdomain
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(tc => { tc.classList.remove('active'); tc.classList.add('hidden'); });
    $('[data-tab="dns"]').classList.add('active');
    $('#tab-dns').classList.remove('hidden');
    $('#tab-dns').classList.add('active');
    $('#dns-subdomain-select').value = id;
    loadDnsRecords(id);
  }
});

// Register subdomain
$('#btn-register').addEventListener('click', () => openModal('modal-register'));

$('#form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const subdomain = $('#input-subdomain').value.trim();
  const rootdomain = $('#input-rootdomain').value.trim();
  if (!subdomain || !rootdomain) return;

  try {
    const result = await registerSubdomain(subdomain, rootdomain);
    toast(result.message || `${result.full_domain} 注册成功`);
    closeModal('modal-register');
    $('#input-subdomain').value = '';
    $('#input-rootdomain').value = '';
    loadSubdomains();
  } catch (err) {
    toast(err.message, 'error');
  }
});

// === DNS Records ===
async function loadDnsRecords(subdomainId) {
  if (!subdomainId) {
    $('#dns-list').innerHTML = '<p class="placeholder">请选择一个子域名查看 DNS 记录</p>';
    $('#btn-add-record').disabled = true;
    return;
  }

  $('#btn-add-record').disabled = false;

  try {
    const result = await listDnsRecords(subdomainId);
    renderDnsRecords(result.records || [], subdomainId);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderDnsRecords(records, subdomainId) {
  const list = $('#dns-list');

  if (records.length === 0) {
    list.innerHTML = '<p class="placeholder">暂无 DNS 记录</p>';
    return;
  }

  list.innerHTML = records.map(r => `
    <div class="dns-record" data-id="${r.id}">
      <span class="dns-type-badge">${r.type}</span>
      <span title="${r.name}">${r.name}</span>
      <span title="${r.content}" style="word-break:break-all;">${r.content}</span>
      <span style="color:var(--text-muted);">TTL ${r.ttl}</span>
      <button class="btn btn-sm btn-danger btn-delete-dns" data-id="${r.id}" data-subdomain-id="${subdomainId}">删除</button>
    </div>
  `).join('');
}

$('#dns-subdomain-select').addEventListener('change', (e) => {
  loadDnsRecords(e.target.value);
});

// Delete DNS record
$('#dns-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-delete-dns');
  if (!btn) return;

  if (!confirm('确认删除此 DNS 记录？')) return;

  const id = parseInt(btn.dataset.id);
  const subdomainId = btn.dataset.subdomainId;

  try {
    await deleteDnsRecord(id);
    toast('DNS 记录已删除');
    loadDnsRecords(subdomainId);
  } catch (err) {
    toast(err.message, 'error');
  }
});

// Add DNS record
$('#btn-add-record').addEventListener('click', () => {
  const subdomainId = $('#dns-subdomain-select').value;
  if (!subdomainId) return;
  $('#dns-subdomain-id').value = subdomainId;
  openModal('modal-dns');
});

$('#form-dns').addEventListener('submit', async (e) => {
  e.preventDefault();
  const subdomainId = parseInt($('#dns-subdomain-id').value);
  const type = $('#dns-type').value;
  const name = $('#dns-name').value.trim();
  const content = $('#dns-content').value.trim();
  const ttl = parseInt($('#dns-ttl').value) || 600;

  if (!content) return;

  try {
    await createDnsRecord(subdomainId, type, content, { name, ttl });
    toast('DNS 记录已创建');
    closeModal('modal-dns');
    $('#dns-name').value = '';
    $('#dns-content').value = '';
    loadDnsRecords(subdomainId);
  } catch (err) {
    toast(err.message, 'error');
  }
});

// === API Keys ===
async function loadApiKeys() {
  if (!hasCredentials()) return;

  try {
    const result = await listApiKeys();
    renderApiKeys(result.keys || []);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderApiKeys(keys) {
  const list = $('#keys-list');

  if (keys.length === 0) {
    list.innerHTML = '<p class="placeholder">暂无 API 密钥</p>';
    return;
  }

  list.innerHTML = keys.map(k => `
    <div class="list-item" data-id="${k.id}">
      <div class="list-item-info">
        <span class="list-item-title">${k.key_name || k.api_key}</span>
        <div class="list-item-meta">
          <span>${k.api_key}</span>
          <span class="status status-${k.status}">${k.status}</span>
          <span>请求次数: ${k.request_count || 0}</span>
          <span>最后使用: ${k.last_used_at || '--'}</span>
        </div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm btn-ghost btn-regenerate" data-id="${k.id}" title="重新生成">🔄 重新生成</button>
        <button class="btn btn-sm btn-danger btn-delete-key" data-id="${k.id}" data-name="${k.key_name}" title="删除">删除</button>
      </div>
    </div>
  `).join('');
}

$('#btn-create-key').addEventListener('click', async () => {
  const name = prompt('请输入新密钥名称:');
  if (!name) return;

  try {
    const result = await createApiKey(name);
    toast('API 密钥已创建，请保存 Secret！');
    alert(`新密钥信息（Secret 仅显示一次）:\n\nAPI Key: ${result.api_key}\nAPI Secret: ${result.api_secret}`);
    loadApiKeys();
  } catch (err) {
    toast(err.message, 'error');
  }
});

$('#keys-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const id = parseInt(btn.dataset.id);

  if (btn.classList.contains('btn-regenerate')) {
    if (!confirm('重新生成后旧 Secret 将失效，确认继续？')) return;
    try {
      const result = await regenerateApiKey(id);
      toast('Secret 已重新生成');
      alert(`新 Secret（仅显示一次）:\n\n${result.api_secret}`);
      loadApiKeys();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (btn.classList.contains('btn-delete-key')) {
    if (!confirm(`确认删除密钥 ${btn.dataset.name}？`)) return;
    try {
      await deleteApiKey(id);
      toast('API 密钥已删除');
      loadApiKeys();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});

// === Quota ===
async function loadQuota() {
  if (!hasCredentials()) return;

  try {
    const result = await getQuota();
    const q = result.quota;
    $('#quota-info').textContent = `配额: ${q.used}/${q.total} (可用 ${q.available})`;
  } catch (err) {
    $('#quota-info').textContent = '--';
  }
}

// === Init ===
async function loadAll() {
  if (!hasCredentials()) {
    openModal('modal-settings');
    return;
  }
  loadQuota();
  loadSubdomains();
  loadApiKeys();
}

// Start
loadAll();
