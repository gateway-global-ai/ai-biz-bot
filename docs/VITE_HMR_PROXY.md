# Vite HMR Behind a Reverse Proxy (aibizbot-dev.gatewayglobal.ai)

When the app is served at `https://aibizbot-dev.gatewayglobal.ai` but the Vite dev server runs on `localhost:5173`, the browser must connect to the **public URL** for Hot Module Replacement (HMR). The project’s `vite.config.ts` is already set for that:

- **HMR URL:** `wss://aibizbot-dev.gatewayglobal.ai/vite-hmr` (port 443)

For HMR to work, the **reverse proxy** in front of the app must:

1. Accept WebSocket upgrade requests for `/vite-hmr`.
2. Forward those requests to the Vite dev server (e.g. `http://localhost:5173` or `http://127.0.0.1:5173`).

## Nginx

```nginx
location /vite-hmr {
    proxy_pass http://127.0.0.1:5173;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Caddy

```caddy
handle_path /vite-hmr* {
    reverse_proxy 127.0.0.1:5173
}
```

(Caddy usually handles WebSocket upgrades automatically.)

## Cloudflare Tunnel / Other proxies

Ensure the path `/vite-hmr` is proxied to the origin where Vite is running (e.g. `localhost:5173`) and that WebSocket (Upgrade) is enabled for that path.

---

After updating the proxy, restart the Vite dev server and reload the page. The console should stop showing `[vite] failed to connect to websocket` once the proxy forwards `/vite-hmr` correctly.
