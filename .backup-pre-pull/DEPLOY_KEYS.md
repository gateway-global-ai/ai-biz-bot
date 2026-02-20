# Deploy Keys Reference

This document provides a reference for all deploy keys used in the chat-mvp-merge repository.

## Overview

Deploy keys are SSH keys that grant access to a single GitHub repository. They are used for automated deployments, CI/CD pipelines, and agent access.

## Active Deploy Keys

### Cursor Agent Deploy Key

**Server:** srv1326242  
**Key Type:** ED25519  
**Purpose:** Cursor agent repository access  
**Access:** Read/Write (if configured)  
**Location:** `.cursor/DEPLOY_KEY.md`

**Public Key:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHCHn0oKnjYLYaGZwKGlbBxxniT0iZcT7+q7bmXayHV6 deploy-key-chat-mvp-merge@srv1326242
```

**SHA256 Fingerprint:** `dxXAf/3BPY8Gssx/Lm4SXTjjZvHZYXWqSmwoCkCfVeI`

## Managing Deploy Keys

### Adding a Deploy Key to GitHub

1. Navigate to repository settings:
   ```
   https://github.com/gateway-global-ai/chat-mvp-merge/settings/keys
   ```

2. Click **"Add deploy key"**

3. Fill in the details:
   - **Title:** Use a descriptive name (e.g., `deploy-key-chat-mvp-merge@srv1326242`)
   - **Key:** Paste the public key
   - **Allow write access:** Check only if write access is needed

4. Click **"Add key"**

### Removing a Deploy Key

1. Go to repository settings → Deploy Keys
2. Find the key to remove
3. Click the delete/trash icon
4. Confirm deletion

## Best Practices

### Security
- ✅ **DO** keep private keys secure and never commit them
- ✅ **DO** use unique deploy keys for each server/environment
- ✅ **DO** rotate deploy keys periodically (recommended: annually)
- ✅ **DO** use read-only access when write access is not required
- ❌ **DON'T** share private keys between servers
- ❌ **DON'T** use personal SSH keys as deploy keys
- ❌ **DON'T** grant write access unless absolutely necessary

### Organization
- Document all deploy keys in this file
- Include key fingerprints for verification
- Note the purpose and server for each key
- Keep detailed documentation of when keys were added/removed

## Using Deploy Keys

### On the Server

After adding the deploy key to GitHub, configure the server to use it:

1. **Ensure the private key is in the correct location:**
   ```bash
   # Private key should be at ~/.ssh/id_ed25519 or similar
   chmod 600 ~/.ssh/id_ed25519
   ```

2. **Configure SSH to use the key:**
   ```bash
   # Add to ~/.ssh/config
   Host github.com
       HostName github.com
       User git
       IdentityFile ~/.ssh/id_ed25519
       IdentitiesOnly yes
   ```

3. **Test the connection:**
   ```bash
   ssh -T git@github.com
   ```

   Expected output:
   ```
   Hi gateway-global-ai/chat-mvp-merge! You've successfully authenticated, but GitHub does not provide shell access.
   ```

4. **Clone or pull from the repository:**
   ```bash
   # Clone with SSH
   git clone git@github.com:gateway-global-ai/chat-mvp-merge.git
   
   # Or update existing clone to use SSH
   git remote set-url origin git@github.com:gateway-global-ai/chat-mvp-merge.git
   ```

## Troubleshooting

### Permission Denied (publickey)

If you see `Permission denied (publickey)` error:

1. Verify the key is added to GitHub:
   - Go to repository settings → Deploy Keys
   - Confirm the key is listed and enabled

2. Check SSH agent:
   ```bash
   ssh-add -l  # List loaded keys
   ssh-add ~/.ssh/id_ed25519  # Add key if not listed
   ```

3. Test connection with verbose output:
   ```bash
   ssh -vT git@github.com
   ```

4. Verify key permissions:
   ```bash
   chmod 600 ~/.ssh/id_ed25519
   chmod 644 ~/.ssh/id_ed25519.pub
   ```

### Key Fingerprint Mismatch

If the fingerprint doesn't match, regenerate the fingerprint:

```bash
ssh-keygen -lf ~/.ssh/id_ed25519.pub
```

Compare with the documented fingerprint in this file.

## Key Rotation

When rotating deploy keys:

1. Generate a new SSH key pair on the server
2. Add the new public key to GitHub as a deploy key
3. Test the new key works correctly
4. Remove the old deploy key from GitHub
5. Update this documentation with the new key information
6. Securely delete the old private key from the server

## Related Documentation

- [SETUP_GITHUB_HOSTINGER_CURSOR.md](./SETUP_GITHUB_HOSTINGER_CURSOR.md) - GitHub SSH setup
- [server_deployment.md](./server_deployment.md) - Server deployment guide
- [.cursor/DEPLOY_KEY.md](../../.cursor/DEPLOY_KEY.md) - Cursor agent deploy key details
- [GitHub Deploy Keys Documentation](https://docs.github.com/en/developers/overview/managing-deploy-keys)

---

**Last Updated:** February 10, 2026  
**Maintained By:** Gateway Global AI Team
