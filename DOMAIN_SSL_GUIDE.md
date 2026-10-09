# VoterDesk: Custom Domain, DNS & SSL Configuration Guide

This document outlines the step-by-step production configuration for custom domain mapping and SSL termination for VoterDesk across Vercel and Cloudflare, with zero downtime risk.

---

## 🌐 1. Domain & DNS Architecture

### Standard Setup:
* **Root Domain (Apex):** `example.com` -> redirects to `www.example.com` or serves directly.
* **Subdomain:** `app.example.com` or `www.example.com` -> points to VoterDesk production deployment.

---

## ⚡ 2. Vercel Custom Domain Configuration

### Step A: Add Domain to Vercel
1. Open your **Vercel Dashboard** -> Select Project **VoterDesk**.
2. Navigate to **Settings** -> **Domains**.
3. Enter your domain (e.g. `voterdesk.in` or `www.voterdesk.in`).
4. Select the recommended option: **Redirect `voterdesk.in` to `www.voterdesk.in`** (or vice versa).

### Step B: Configure DNS Records at your Registrar (Namecheap, GoDaddy, Cloudflare, etc.)

| Type | Name / Host | Value / Target | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- |
| **CNAME** | `www` (or `app`) | `cname.vercel-dns.com` | Auto | DNS Only (Grey Cloud) or Proxied |
| **A** | `@` (Root) | `76.76.21.21` | Auto | DNS Only (Grey Cloud) |

> [!NOTE]
> Vercel automatically provisions and renews free Let's Encrypt Wildcard SSL certificates for all connected domains within 60 seconds of DNS propagation.

---

## 🛡️ 3. Cloudflare Proxy & SSL Configuration (Recommended)

When using Cloudflare as your DNS manager and CDN/DDoS shield:

### SSL/TLS Encryption Mode:
* Navigate to **SSL/TLS** -> **Overview** in Cloudflare.
* Set encryption mode to **Full (Strict)**.
  * Ensures end-to-end encryption from voter's browser -> Cloudflare Edge -> Vercel Origin.

### Edge Certificates:
* **Always Use HTTPS:** Enabled (Enforces 301 redirect from `http://` to `https://`).
* **Minimum TLS Version:** `TLS 1.2` (or `TLS 1.3`).
* **Automatic HTTPS Rewrites:** Enabled.
* **HTTP Strict Transport Security (HSTS):** Enabled (`max-age=31536000; includeSubDomains; preload`).

---

## 🖥️ 4. Hostinger Node.js / Nginx SSL Setup (If Migrated in Future)

If you migrate the Node.js backend to a Hostinger VPS or dedicated server:

### Nginx Reverse Proxy Configuration (`/etc/nginx/sites-available/voterdesk`):
```nginx
server {
    listen 80;
    server_name app.voterdesk.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.voterdesk.in;

    ssl_certificate /etc/letsencrypt/live/app.voterdesk.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.voterdesk.in/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Performance & Caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # API & Dynamic Pages
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Let's Encrypt Auto-Renewal:
```bash
sudo certbot --nginx -d app.voterdesk.in
```
Certbot will install a cron job or systemd timer that automatically checks and renews the SSL certificate 30 days before expiration.
