# @gateway/design-tokens

**Single import path** for OS color/zone tokens. Implementation is [`client/src/config/brand.ts`](../../client/src/config/brand.ts); this package re-exports for SDK boundaries and future publishing.

```ts
import { SHELL, CANVAS, BRAND, CANVAS_BG_CLASSNAME } from '@gateway/design-tokens';
```

See [`STYLE_APPROVAL_POLICY_V1.md`](../../docs-governance/canonical/STYLE_APPROVAL_POLICY_V1.md).
