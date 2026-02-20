# Tool Integration Guide

Step-by-step examples for integrating new tools into the Clear Voice UI SDK.

## Example 1: Adding a New Tool Type

### Step 1: Define the Function Declaration

Add to `server/config/geminiToolDeclarations.ts`:

```typescript
export const TOOL_DECLARATIONS = {
  // ... existing tools ...
  
  display_product_catalog: {
    name: "display_product_catalog",
    description: "Displays a product catalog with images and prices in the Content Window",
    parameters: {
      type: "OBJECT",
      properties: {
        category: {
          type: "STRING",
          description: "Product category to display"
        },
        max_items: {
          type: "NUMBER",
          description: "Maximum number of items to show"
        }
      },
      required: ["category"]
    }
  }
};
```

### Step 2: Create the Component

Create `client/src/components/voice/tools/ProductCatalog.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';

interface ProductCatalogProps {
  metadata: {
    category: string;
    items: Array<{
      id: string;
      name: string;
      price: number;
      image?: string;
    }>;
  };
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ metadata }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full p-4 bg-white rounded-xl border border-gray-200"
    >
      <h3 className="text-lg font-bold mb-4">{metadata.category}</h3>
      <div className="grid grid-cols-2 gap-4">
        {metadata.items.map((item) => (
          <div key={item.id} className="bg-gray-50 rounded-lg p-3">
            {item.image && (
              <img src={item.image} alt={item.name} className="w-full h-32 object-cover rounded mb-2" />
            )}
            <p className="font-medium text-sm">{item.name}</p>
            <p className="text-blue-600 font-bold">${item.price}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
```

### Step 3: Add to ToolRouter

Update `client/src/components/voice/tools/ToolRouter.tsx`:

```tsx
import { ProductCatalog } from './ProductCatalog';

// ... existing code ...

switch (toolType) {
  // ... existing cases ...
  
  case 'product_catalog':
    return <ProductCatalog metadata={metadata} />;
    
  // ... rest of cases ...
}
```

### Step 4: Create Server Handler

Create `server/tools/productCatalogHandler.ts`:

```typescript
export async function handleProductCatalog(category: string, maxItems: number = 10) {
  // Fetch products from your database or API
  const products = await fetchProductsByCategory(category, maxItems);
  
  return {
    category,
    items: products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.imageUrl
    }))
  };
}
```

### Step 5: Wire Up Server Response

In your Gemini WebSocket handler, when you receive a `tool_call`:

```typescript
if (toolCall.name === 'display_product_catalog') {
  const result = await handleProductCatalog(
    toolCall.args.category,
    toolCall.args.max_items
  );
  
  // Send tool_response back to Gemini
  sendToolResponse({
    name: 'display_product_catalog',
    result
  });
  
  // Also send to client for UI rendering
  clientWs.send(JSON.stringify({
    type: 'tool_response',
    tool_type: 'product_catalog',
    metadata: result
  }));
}
```

## Example 2: Creating Custom Animations

### Step 1: Create Animation Component

Create `client/src/components/voice/animations/CustomSuccess.tsx`:

```tsx
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const CustomSuccess: React.FC<{ message: string }> = ({ message }) => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="flex items-center gap-2 text-green-600"
    >
      <Sparkles className="w-5 h-5" />
      <span className="font-bold">{message}</span>
    </motion.div>
  );
};
```

### Step 2: Use in Tool Component

```tsx
import { CustomSuccess } from '../animations/CustomSuccess';

export const MyTool: React.FC<Props> = ({ onSubmit }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleSubmit = (value: string) => {
    onSubmit(value);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };
  
  return (
    <div>
      {/* Tool UI */}
      {showSuccess && <CustomSuccess message="Saved!" />}
    </div>
  );
};
```

## Example 3: Extending Map Markers

### Step 1: Create Custom Marker Component

```tsx
import { AdvancedMarker } from '@vis.gl/react-google-maps';

export const CustomMarker: React.FC<{
  position: { lat: number; lng: number };
  title: string;
  color: string;
}> = ({ position, title, color }) => {
  return (
    <AdvancedMarker position={position} title={title}>
      <div 
        className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
        style={{ backgroundColor: color }}
      />
    </AdvancedMarker>
  );
};
```

### Step 2: Use in MapTool

```tsx
import { CustomMarker } from './CustomMarker';

export const MapTool: React.FC<MapToolProps> = ({ markers, ...props }) => {
  return (
    <Map {...props}>
      {markers.map(marker => (
        <CustomMarker
          key={marker.id}
          position={marker.position}
          title={marker.title}
          color={marker.color || '#4F46E5'}
        />
      ))}
    </Map>
  );
};
```

## Example 4: Building Catalog Displays

### Step 1: Create Catalog Component

```tsx
import { motion } from 'framer-motion';

export const CatalogDisplay: React.FC<{
  items: Array<{ id: string; name: string; price: number; image?: string }>;
}> = ({ items }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          {item.image && (
            <img src={item.image} alt={item.name} className="w-full h-24 object-cover rounded mb-2" />
          )}
          <p className="font-medium text-sm text-gray-800">{item.name}</p>
          <p className="text-blue-600 font-bold text-sm mt-1">${item.price}</p>
        </motion.div>
      ))}
    </div>
  );
};
```

### Step 2: Integrate with ToolRouter

```tsx
case 'catalog':
  return <CatalogDisplay items={metadata.items} />;
```

## Example 5: Form Validation

### Step 1: Add Validation to ManualCorrectionBox

```tsx
const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePhone = (phone: string) => {
  return /^\+?[\d\s-()]+$/.test(phone);
};

export const ManualCorrectionBox: React.FC<Props> = ({ fieldType, onSubmit }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = () => {
    let isValid = true;
    
    if (fieldType === 'email' && !validateEmail(value)) {
      setError('Please enter a valid email address');
      isValid = false;
    } else if (fieldType === 'phone' && !validatePhone(value)) {
      setError('Please enter a valid phone number');
      isValid = false;
    }
    
    if (isValid) {
      onSubmit(value);
    }
  };
  
  return (
    <div>
      {/* Input field */}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};
```

## Best Practices

1. **Always validate tool metadata** before rendering components
2. **Use TypeScript interfaces** for all tool props
3. **Handle loading states** with skeleton components
4. **Provide error boundaries** for tool components
5. **Test tool routing** with various metadata structures
6. **Document tool requirements** in function declarations
7. **Use consistent styling** with Tailwind classes
8. **Implement accessibility** features (ARIA labels, keyboard navigation)

## Common Patterns

### Pattern 1: Async Tool Loading

```tsx
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  fetchToolData(metadata.id).then(result => {
    setData(result);
    setLoading(false);
  });
}, [metadata.id]);

if (loading) return <MapSkeleton />;
return <ToolComponent data={data} />;
```

### Pattern 2: Tool State Management

```tsx
const [toolState, setToolState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

const handleSubmit = async (value: string) => {
  setToolState('loading');
  try {
    await submitToolData(value);
    setToolState('success');
  } catch (err) {
    setToolState('error');
  }
};
```

### Pattern 3: Conditional Rendering

```tsx
{metadata.completed ? (
  <div className="text-green-600">✓ Completed</div>
) : (
  <ToolComponent metadata={metadata} onSubmit={handleSubmit} />
)}
```
