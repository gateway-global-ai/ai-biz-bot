# Deploy Key Quick Reference

> **Quick access to deploy key information for the chat-mvp-merge repository**

## Cursor Agent Deploy Key

**Status:** Ready to be added to GitHub  
**Documentation:** [.cursor/DEPLOY_KEY.md](./.cursor/DEPLOY_KEY.md)

### Public Key

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHCHn0oKnjYLYaGZwKGlbBxxniT0iZcT7+q7bmXayHV6 deploy-key-chat-mvp-merge@srv1326242
```

### Add to GitHub

1. Go to: https://github.com/gateway-global-ai/chat-mvp-merge/settings/keys
2. Click **"Add deploy key"**
3. Title: `deploy-key-chat-mvp-merge@srv1326242`
4. Paste the public key above
5. Check **"Allow write access"** if needed
6. Click **"Add key"**

### Verify

```bash
ssh -T git@github.com
```

Expected: `Hi gateway-global-ai/chat-mvp-merge! You've successfully authenticated...`

## Complete Documentation

- [.cursor/DEPLOY_KEY.md](./.cursor/DEPLOY_KEY.md) - Cursor agent deploy key details
- [docs/deployment/DEPLOY_KEYS.md](./docs/deployment/DEPLOY_KEYS.md) - Complete deploy keys reference
- [docs/deployment/SETUP_GITHUB_HOSTINGER_CURSOR.md](./docs/deployment/SETUP_GITHUB_HOSTINGER_CURSOR.md) - GitHub setup guide

---

**Note:** This is a public key and is safe to commit. Never commit private keys to the repository.
