// Menu and Cart Types for Frontend

export interface Menu {
  id: string;
  siteConfigId: string;
  ownerId: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  availableDays: string[];
  availableStartTime?: string;
  availableEndTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuCategory {
  id: string;
  menuId: string;
  name: string;
  description?: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  menuId: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: string;
  imageUrl?: string;
  isAvailable: boolean;
  displayOrder: number;
  preparationTime?: number;
  calories?: number;
  allergens: string[];
  dietaryInfo: string[];
  customizationOptions?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cart {
  id: string;
  siteConfigId: string;
  customerId?: string;
  sessionId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  subtotal: string;
  taxAmount: string;
  deliveryFee: string;
  totalAmount: string;
  lastUpdatedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  customizations?: Record<string, any>;
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  siteConfigId: string;
  cartId?: string;
  customerId?: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  orderType: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  subtotal: string;
  taxAmount: string;
  deliveryFee: string;
  tipAmount: string;
  totalAmount: string;
  paymentMethod?: string;
  paymentStatus: string;
  stripePaymentIntentId?: string;
  status: string;
  estimatedReadyTime?: Date;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  customerNotes?: string;
  internalNotes?: string;
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  itemDescription?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  customizations?: Record<string, any>;
  specialInstructions?: string;
  createdAt: Date;
}

export interface MenuWithDetails {
  menu: Menu;
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface CartWithItems {
  cart: Cart;
  items: CartItem[];
}

export interface OrderWithItems {
  order: Order;
  items: OrderItem[];
}
