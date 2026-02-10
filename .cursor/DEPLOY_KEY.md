# Cursor Agent Deploy Key

This document contains the SSH deploy key for the cursor agent to access this GitHub repository.

## Deploy Key Information

**Key Type:** ED25519  
**Key Name:** deploy-key-chat-mvp-merge@srv1326242  
**Purpose:** Allows cursor agent to perform read/write operations on the repository  
**Server:** srv1326242

## Public Key

The following public key should be added to the GitHub repository as a Deploy Key:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHCHn0oKnjYLYaGZwKGlbBxxniT0iZcT7+q7bmXayHV6 deploy-key-chat-mvp-merge@srv1326242
```

## Key Fingerprint

**SHA256:** `dxXAf/3BPY8Gssx/Lm4SXTjjZvHZYXWqSmwoCkCfVeI`

## Randomart Image

```
+--[ED25519 256]--+
|     ...   ....  |
| .  ...     .  .o|
|. . oE       oo.=|
|.  o      . *.+*+|
| .      S=.=.O.=*|
|  .   . ..O.* = +|
|   . . . o * .   |
|    .     o + .  |
|           +.+.  |
+----[SHA256]-----+
```

## How to Add Deploy Key to GitHub

1. Go to repository settings: https://github.com/gateway-global-ai/chat-mvp-merge/settings/keys
2. Click **"Add deploy key"**
3. Enter the following:
   - **Title:** `deploy-key-chat-mvp-merge@srv1326242`
   - **Key:** Paste the public key shown above
   - **Allow write access:** Check this box if the agent needs to push changes
4. Click **"Add key"**

## Verification

To verify the deploy key is working, test the GitHub connection:

```bash
ssh -T git@github.com
```

Expected response after the key is added:
```
Hi gateway-global-ai/chat-mvp-merge! You've successfully authenticated, but GitHub does not provide shell access.
```

## Security Notes

- This is a **public key** and is safe to commit to the repository
- The corresponding **private key** should be kept secure on srv1326242
- The private key should never be committed to version control
- Deploy keys are tied to a single repository for security
- Consider using read-only access if write access is not required

## Related Documentation

- [GitHub Deploy Keys Documentation](https://docs.github.com/en/developers/overview/managing-deploy-keys)
- [GitHub SSH Setup](./SETUP_GITHUB_HOSTINGER_CURSOR.md)
- [MCP Setup](./.cursor/MCP_SETUP.md)
