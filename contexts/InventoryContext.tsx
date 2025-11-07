import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface InventoryItem {
  id: string;
  name: string;
  icon: any;
  count: number;
  progress: number; // 0.0 to 1.0 representing freshness/shelf life
  timeRemaining: string; // e.g., "1d 2hrs"
  status: 'Fresh' | 'Warning'; // Status based on progress
  createdAt: Date;
  expiresAt: Date;
  userId?: string; // For future Supabase integration
}

interface InventoryContextType {
  inventoryItems: InventoryItem[];
  addInventoryItem: (
    name: string,
    icon: any,
    count: number,
    shelfLifeDays: number
  ) => void;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => void;
  removeInventoryItem: (itemId: string) => void;
  incrementCount: (itemId: string) => void;
  decrementCount: (itemId: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Helper to calculate time remaining string
const calculateTimeRemaining = (expiresAt: Date): string => {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}hrs`;
  return `${hours}hrs`;
};

// Helper to calculate progress based on expiration
const calculateProgress = (createdAt: Date, expiresAt: Date): number => {
  const now = new Date().getTime();
  const created = createdAt.getTime();
  const expires = expiresAt.getTime();
  
  if (now >= expires) return 0;
  if (now <= created) return 1;
  
  return (expires - now) / (expires - created);
};

// Helper to get status based on progress
const getStatus = (progress: number): 'Fresh' | 'Warning' => {
  return progress > 0.5 ? 'Fresh' : 'Warning';
};

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const addInventoryItem = (
    name: string,
    icon: any,
    count: number,
    shelfLifeDays: number
  ) => {
    const createdAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + shelfLifeDays);
    
    const progress = calculateProgress(createdAt, expiresAt);
    const timeRemaining = calculateTimeRemaining(expiresAt);
    const status = getStatus(progress);

    const newItem: InventoryItem = {
      id: `inventory-${Date.now()}`,
      name,
      icon,
      count,
      progress,
      timeRemaining,
      status,
      createdAt,
      expiresAt,
    };
    
    setInventoryItems((prev) => [...prev, newItem]);
  };

  const updateInventoryItem = (itemId: string, updates: Partial<InventoryItem>) => {
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates };
          // Recalculate progress and status if expiration changed
          if (updates.expiresAt || updates.createdAt) {
            updated.progress = calculateProgress(
              updated.createdAt,
              updated.expiresAt
            );
            updated.timeRemaining = calculateTimeRemaining(updated.expiresAt);
            updated.status = getStatus(updated.progress);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeInventoryItem = (itemId: string) => {
    setInventoryItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const incrementCount = (itemId: string) => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, count: item.count + 1 } : item
      )
    );
  };

  const decrementCount = (itemId: string) => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, count: Math.max(0, item.count - 1) } : item
      )
    );
  };

  return (
    <InventoryContext.Provider
      value={{
        inventoryItems,
        addInventoryItem,
        updateInventoryItem,
        removeInventoryItem,
        incrementCount,
        decrementCount,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
