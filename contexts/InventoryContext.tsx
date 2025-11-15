import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getBatchFreshnessPredictions } from '../services/freshnessService';

// Icon mapping for converting string keys to image sources
export const iconMap: { [key: string]: any } = {
  burgerbun: require('../assets/burgerbun.png'),
  beef: require('../assets/beef.png'),
  lettuce: require('../assets/lettuce.png'),
  cheese: require('../assets/cheese.png'),
  tomato: require('../assets/tomato.png'),
  onion: require('../assets/onion.png'),
  burger: require('../assets/burger.png'),
  drink: require('../assets/drink.png'),
};

export interface InventoryItem {
  id: string;
  name: string;
  icon: string; // Icon key (e.g., "burger", "cheese")
  count: number;
  progress: number; // 0.0 to 1.0 representing freshness/shelf life
  timeRemaining: string; // e.g., "1d 2hrs"
  status: 'Fresh' | 'Warning'; // Status based on progress
  createdAt: Date;
  expiresAt: Date;
  userId: string;
  freshnessClassification?: 'Fresh' | 'Stale' | 'Expired'; // ML-based freshness prediction
  freshnessLoading?: boolean; // Loading state for freshness prediction
}

// Helper to get icon source from icon key
export const getIconSource = (iconKey: string): any => {
  return iconMap[iconKey.toLowerCase()] || iconMap.burger;
};

interface InventoryContextType {
  inventoryItems: InventoryItem[];
  loading: boolean;
  addInventoryItem: (
    name: string,
    icon: string,
    count: number,
    shelfLifeDays: number
  ) => Promise<void>;
  updateInventoryItem: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  removeInventoryItem: (itemId: string) => Promise<void>;
  incrementCount: (itemId: string) => Promise<void>;
  decrementCount: (itemId: string) => Promise<void>;
  refreshInventory: () => Promise<void>;
  refreshFreshnessPredictions: (city: string, weatherApiKey: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  // Fetch inventory items from Supabase
  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setInventoryItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inventory items:', error);
        setLoading(false);
        return;
      }

      // Convert Supabase data to InventoryItem format
      const items: InventoryItem[] = (data || []).map((item) => {
        const createdAt = new Date(item.created_at);
        const expiresAt = new Date(item.expires_at);
        const progress = calculateProgress(createdAt, expiresAt);
        const timeRemaining = calculateTimeRemaining(expiresAt);
        const status = getStatus(progress);

        return {
          id: item.id,
          name: item.name,
          icon: item.icon,
          count: item.count,
          progress,
          timeRemaining,
          status,
          createdAt,
          expiresAt,
          userId: item.user_id,
        };
      });

      setInventoryItems(items);
    } catch (error) {
      console.error('Error in fetchInventoryItems:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load inventory items on mount and when auth state changes
  useEffect(() => {
    fetchInventoryItems();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchInventoryItems();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Note: Progress, time remaining, and status are calculated on-demand in the UI
  // to avoid constant updates that make items hard to read

  const addInventoryItem = async (
    name: string,
    icon: string,
    count: number,
    shelfLifeDays: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const createdAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + shelfLifeDays);

      const { data, error } = await supabase
        .from('inventory_items')
        .insert([
          {
            user_id: user.id,
            name,
            icon,
            count,
            created_at: createdAt.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding inventory item:', error);
        throw error;
      }

      // Refresh inventory items
      await fetchInventoryItems();
    } catch (error) {
      console.error('Error in addInventoryItem:', error);
      throw error;
    }
  };

  const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>) => {
    try {
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.count !== undefined) updateData.count = updates.count;
      if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt.toISOString();
      if (updates.createdAt !== undefined) updateData.created_at = updates.createdAt.toISOString();

      const { error } = await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) {
        console.error('Error updating inventory item:', error);
        throw error;
      }

      // Refresh inventory items
      await fetchInventoryItems();
    } catch (error) {
      console.error('Error in updateInventoryItem:', error);
      throw error;
    }
  };

  const removeInventoryItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error removing inventory item:', error);
        throw error;
      }

      // Refresh inventory items
      await fetchInventoryItems();
    } catch (error) {
      console.error('Error in removeInventoryItem:', error);
      throw error;
    }
  };

  const incrementCount = async (itemId: string) => {
    const item = inventoryItems.find((i) => i.id === itemId);
    if (item) {
      await updateInventoryItem(itemId, { count: item.count + 1 });
    }
  };

  const decrementCount = async (itemId: string) => {
    const item = inventoryItems.find((i) => i.id === itemId);
    if (item) {
      await updateInventoryItem(itemId, { count: Math.max(0, item.count - 1) });
    }
  };

  // Refresh freshness predictions for all inventory items
  const refreshFreshnessPredictions = async (city: string, weatherApiKey: string) => {
    try {
      // Capture current items at the start
      const currentItems = [...inventoryItems];
      
      if (currentItems.length === 0) {
        return;
      }

      // Set loading state for all items
      setInventoryItems((prevItems) =>
        prevItems.map((item) => ({
          ...item,
          freshnessLoading: true,
        }))
      );

      // Prepare inputs for batch prediction
      const inputs = currentItems.map((item) => ({
        ingredientType: item.name,
        addedAt: item.createdAt,
        city,
        weatherApiKey,
      }));

      // Get batch predictions
      const predictions = await getBatchFreshnessPredictions(inputs);

      // Update items with freshness classifications
      // Match predictions to items by ID to handle potential reordering
      setInventoryItems((prevItems) => {
        // Create a map of item IDs to their original indices
        const itemIdMap = new Map(currentItems.map((item, idx) => [item.id, idx]));
        
        return prevItems.map((item) => {
          const originalIndex = itemIdMap.get(item.id);
          const classification = originalIndex !== undefined && originalIndex < predictions.length
            ? predictions[originalIndex]?.classification
            : undefined;
          
          return {
            ...item,
            freshnessClassification: classification,
            freshnessLoading: false,
          };
        });
      });
    } catch (error) {
      console.error('Error refreshing freshness predictions:', error);
      // Clear loading state on error
      setInventoryItems((prevItems) =>
        prevItems.map((item) => ({
          ...item,
          freshnessLoading: false,
        }))
      );
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        inventoryItems,
        loading,
        addInventoryItem,
        updateInventoryItem,
        removeInventoryItem,
        incrementCount,
        decrementCount,
        refreshInventory: fetchInventoryItems,
        refreshFreshnessPredictions,
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
