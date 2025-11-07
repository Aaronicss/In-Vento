import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  image?: any;
}

export interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  progress: number;
  createdAt: Date;
}

interface OrdersContextType {
  orders: Order[];
  addOrder: (tableNumber: number, items: OrderItem[]) => void;
  updateOrderProgress: (orderId: string, progress: number) => void;
  removeOrder: (orderId: string) => void;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  const addOrder = (tableNumber: number, items: OrderItem[]) => {
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      tableNumber,
      items,
      progress: 1.0, // Start with full progress (will decrease over time)
      createdAt: new Date(),
    };
    setOrders((prev) => [...prev, newOrder]);
  };

  const updateOrderProgress = (orderId: string, progress: number) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, progress: Math.max(0, Math.min(1, progress)) } : order
      )
    );
  };

  const removeOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
  };

  return (
    <OrdersContext.Provider value={{ orders, addOrder, updateOrderProgress, removeOrder }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
}
