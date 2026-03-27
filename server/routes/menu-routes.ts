import type { Express } from "express";
import { db } from "../db";
import { 
  menus, 
  menuCategories, 
  menuItems, 
  orders, 
  orderItems,
  insertMenuSchema,
  insertMenuCategorySchema,
  insertMenuItemSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  type Menu,
  type MenuItem,
  type Order
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

/**
 * Register menu and order management routes
 */
export function registerMenuRoutes(app: Express) {
  
  // ==========================================
  // MENU MANAGEMENT ROUTES
  // ==========================================
  
  // Get all menus for a site
  app.get("/api/menus/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      
      const siteMenus = await db.query.menus.findMany({
        where: eq(menus.siteConfigId, siteConfigId),
        orderBy: (menus, { asc }) => [asc(menus.displayOrder)],
      });
      
      res.json(siteMenus);
    } catch (error) {
      console.error("Error fetching menus:", error);
      res.status(500).json({ error: "Failed to fetch menus" });
    }
  });
  
  // Get a specific menu with categories and items
  app.get("/api/menus/:siteConfigId/:menuId", async (req, res) => {
    try {
      const { menuId } = req.params;
      
      const menu = await db.query.menus.findFirst({
        where: eq(menus.id, menuId),
      });
      
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      
      const categories = await db.query.menuCategories.findMany({
        where: eq(menuCategories.menuId, menuId),
        orderBy: (menuCategories, { asc }) => [asc(menuCategories.displayOrder)],
      });
      
      const items = await db.query.menuItems.findMany({
        where: eq(menuItems.menuId, menuId),
        orderBy: (menuItems, { asc }) => [asc(menuItems.displayOrder)],
      });
      
      res.json({
        menu,
        categories,
        items,
      });
    } catch (error) {
      console.error("Error fetching menu details:", error);
      res.status(500).json({ error: "Failed to fetch menu details" });
    }
  });
  
  // Create a new menu
  app.post("/api/menus", async (req, res) => {
    try {
      const menuData = insertMenuSchema.parse(req.body);
      
      const [newMenu] = await db.insert(menus).values(menuData).returning();
      
      res.status(201).json(newMenu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid menu data", details: error.errors });
      }
      console.error("Error creating menu:", error);
      res.status(500).json({ error: "Failed to create menu" });
    }
  });
  
  // Update a menu
  app.patch("/api/menus/:menuId", async (req, res) => {
    try {
      const { menuId } = req.params;
      const updateData = insertMenuSchema.partial().parse(req.body);
      
      const [updatedMenu] = await db
        .update(menus)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(menus.id, menuId))
        .returning();
      
      if (!updatedMenu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      
      res.json(updatedMenu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid menu data", details: error.errors });
      }
      console.error("Error updating menu:", error);
      res.status(500).json({ error: "Failed to update menu" });
    }
  });
  
  // Delete a menu
  app.delete("/api/menus/:menuId", async (req, res) => {
    try {
      const { menuId } = req.params;
      
      // Delete associated items and categories first
      await db.delete(menuItems).where(eq(menuItems.menuId, menuId));
      await db.delete(menuCategories).where(eq(menuCategories.menuId, menuId));
      await db.delete(menus).where(eq(menus.id, menuId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu:", error);
      res.status(500).json({ error: "Failed to delete menu" });
    }
  });
  
  // ==========================================
  // MENU CATEGORY ROUTES
  // ==========================================
  
  // Create a category
  app.post("/api/menu-categories", async (req, res) => {
    try {
      const categoryData = insertMenuCategorySchema.parse(req.body);
      
      const [newCategory] = await db.insert(menuCategories).values(categoryData).returning();
      
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid category data", details: error.errors });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });
  
  // Update a category
  app.patch("/api/menu-categories/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const updateData = insertMenuCategorySchema.partial().parse(req.body);
      
      const [updatedCategory] = await db
        .update(menuCategories)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(menuCategories.id, categoryId))
        .returning();
      
      if (!updatedCategory) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });
  
  // Delete a category
  app.delete("/api/menu-categories/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      
      await db.delete(menuCategories).where(eq(menuCategories.id, categoryId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
  
  // ==========================================
  // MENU ITEM ROUTES
  // ==========================================
  
  // Get a specific menu item by ID
  app.get("/api/menu-items/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      
      const item = await db.query.menuItems.findFirst({
        where: eq(menuItems.id, itemId),
      });
      
      if (!item) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching menu item:", error);
      res.status(500).json({ error: "Failed to fetch menu item" });
    }
  });
  
  // Create a menu item
  app.post("/api/menu-items", async (req, res) => {
    try {
      const itemData = insertMenuItemSchema.parse(req.body);
      
      const [newItem] = await db.insert(menuItems).values(itemData).returning();
      
      res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid item data", details: error.errors });
      }
      console.error("Error creating menu item:", error);
      res.status(500).json({ error: "Failed to create menu item" });
    }
  });
  
  // Update a menu item
  app.patch("/api/menu-items/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const updateData = insertMenuItemSchema.partial().parse(req.body);
      
      const [updatedItem] = await db
        .update(menuItems)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(menuItems.id, itemId))
        .returning();
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });
  
  // Delete a menu item
  app.delete("/api/menu-items/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      
      await db.delete(menuItems).where(eq(menuItems.id, itemId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });
  
  // ==========================================
  // ORDER/CHECKOUT ROUTES
  // ==========================================
  
  // Create order from cart (checkout)
  app.post("/api/orders/checkout", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      const [newOrder] = await db.insert(orders).values({
        ...orderData,
        orderNumber,
      }).returning();
      
      res.status(201).json(newOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid order data", details: error.errors });
      }
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });
  
  // Get orders for a site
  app.get("/api/orders/:siteConfigId", async (req, res) => {
    try {
      const { siteConfigId } = req.params;
      const { status, customerId } = req.query;
      
      let query = db.query.orders.findMany({
        where: eq(orders.siteConfigId, siteConfigId),
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });
      
      const allOrders = await query;
      
      // Filter by status or customerId if provided
      let filteredOrders = allOrders;
      if (status) {
        filteredOrders = filteredOrders.filter(o => o.status === status);
      }
      if (customerId) {
        filteredOrders = filteredOrders.filter(o => o.customerId === customerId);
      }
      
      res.json(filteredOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  
  // Get single order with items
  app.get("/api/orders/:siteConfigId/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const items = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, orderId),
      });
      
      res.json({ order, items });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });
  
  // Update order status
  app.patch("/api/orders/:orderId/status", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      interface OrderUpdateData {
        status: string;
        updatedAt: Date;
        confirmedAt?: Date;
        completedAt?: Date;
        actualDeliveryTime?: Date;
        cancelledAt?: Date;
      }
      
      const updateData: OrderUpdateData = { 
        status,
        updatedAt: new Date()
      };
      
      // Set timestamps based on status
      if (status === "confirmed") {
        updateData.confirmedAt = new Date();
      } else if (status === "delivered") {
        updateData.completedAt = new Date();
        updateData.actualDeliveryTime = new Date();
      } else if (status === "cancelled") {
        updateData.cancelledAt = new Date();
      }
      
      const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning();
      
      if (!updatedOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });
}
