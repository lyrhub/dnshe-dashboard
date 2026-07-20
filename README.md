# DNSHE 域名管理面板

基于 DNSHE Free Domain API V2.0 的 Web 管理面板，部署在 Cloudflare Pages。

**在线地址**: https://dnshe-dashboard.pages.dev

## 功能

- **自动续期** — 填入 API 密钥后自动检查所有域名，可续期的自动续期
- **子域名管理** — 列表、搜索、筛选、注册、删除
- **DNS 记录管理** — 查看、创建、删除 DNS 记录（A/AAAA/CNAME/MX/TXT/NS/SRV/CAA）
- **API 密钥管理** — 创建、删除、重新生成密钥
- **配额查询** — 实时显示已用/可用配额

## 使用

1. 打开 https://dnshe-dashboard.pages.dev
2. 首次使用会弹出设置弹窗，填入你的 DNSHE API Key 和 API Secret
3. 保存后自动开始批量续期所有可续期的域名
4. 续期日志在右下角实时显示

## 本地开发

```bash
npm install
npm run dev
```

## 构建部署

```bash
npm run build
npx wrangler pages deploy dist --project-name dnshe-dashboard
```

## API 参考

基于 [DNSHE Free Domain API V2.0](https://my.dnshe.com/knowledgebase/13/DNSHE-Free-Domain-API-User-Guide-V2.0.html)

- 认证方式：`X-API-Key` + `X-API-Secret` HTTP Header
- API 端点：`https://api005.dnshe.com/index.php?m=domain_hub`
- 请求限制：60 次/分钟

## 技术栈

- Vanilla JS（无框架）
- Vite 构建
- Cloudflare Pages 托管
