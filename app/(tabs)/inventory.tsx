import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ProgressBar } from "react-native-paper";
import { getIconSource, useInventory } from "../../contexts/InventoryContext";

export default function InventoryScreen() {
  const router = useRouter();
  const {
    inventoryItems,
    loading,
    incrementCount,
    decrementCount,
    removeInventoryItem,
    refreshFreshnessPredictions,
  } = useInventory();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [freshnessLoading, setFreshnessLoading] = useState(false);

  // Get configuration from environment variables or Constants
  const city = Constants.expoConfig?.extra?.weatherCity || process.env.EXPO_PUBLIC_WEATHER_CITY || 'Dasmarinas';
  const weatherApiKey = Constants.expoConfig?.extra?.weatherApiKey || process.env.EXPO_PUBLIC_WEATHER_API_KEY || '';

  // Fetch freshness predictions when inventory items are loaded
  useEffect(() => {
    if (!loading && inventoryItems.length > 0 && weatherApiKey) {
      setFreshnessLoading(true);
      refreshFreshnessPredictions()
        .catch((error) => {
          console.error('Error refreshing freshness predictions:', error);
        })
        .finally(() => {
          setFreshnessLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, inventoryItems.length, city, weatherApiKey]);

  // Helper functions to calculate progress, time remaining, and status
  const calculateProgress = useCallback((createdAt: Date, expiresAt: Date): number => {
    const now = Date.now();
    const created = createdAt.getTime();
    const expires = expiresAt.getTime();
    const total = expires - created;
    if (total <= 0) return 0;
    const remaining = Math.max(0, expires - now);
    return Math.max(0, Math.min(1, remaining / total));
  }, []);

  const calculateTimeRemaining = useCallback((expiresAt: Date): string => {
    const now = Date.now();
    const diff = expiresAt.getTime() - now;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}hrs`;
    return `${hours}hrs`;
  }, []);

  const getEstimatedRemaining = useCallback(
    (expiresAt?: Date) => {
      if (!expiresAt) return 'Unknown';
      return calculateTimeRemaining(expiresAt);
    },
    [calculateTimeRemaining]
  );

  const getStatus = useCallback((progress: number): 'Fresh' | 'Stale' | 'Expired' => {
    if (progress <= 0) return 'Expired';
    if (progress <= 0.5) return 'Stale';
    return 'Fresh';
  }, []);

  // Helper function to get freshness classification color
  const getFreshnessColor = useCallback((classification?: 'Fresh' | 'Stale' | 'Expired') => {
    if (!classification) return '#9E9E9E'; // Gray for unknown
    switch (classification) {
      case 'Fresh':
        return '#4CAF50'; // Green
      case 'Stale':
        return '#FF9800'; // Orange
      case 'Expired':
        return '#F44336'; // Red
      default:
        return '#9E9E9E';
    }
  }, []);
  const estimateTimeFromFreshness = (
    freshness: 'Fresh' | 'Stale' | 'Expired',
    timeInFridge: number, // in hours
    temp: number,
    humidity: number
  ): string => {
    let remainingHours = 0;
  
    if (freshness === 'Expired') {
      remainingHours = 0;
    } else if (freshness === 'Stale') {
      // Time left until Expired (72 hours max)
      remainingHours = 72 - timeInFridge;
    } else if (freshness === 'Fresh') {
      // Time left until Stale threshold
      if (temp > 10 || humidity > 80) {
        remainingHours = 24 - timeInFridge;
      } else {
        remainingHours = 48 - timeInFridge;
      }
    }
  
    if (remainingHours <= 0) return 'Expired';
  
    const days = Math.floor(remainingHours / 24);
    const hours = Math.round(remainingHours % 24);
  
    if (days > 0) return `${days}d ${hours}hrs`;
    return `${hours}hrs`;
  };
  // Calculate display values for all items once and memoize them
  // This ensures values are only calculated when inventoryItems change, not on every render
  const itemsWithDisplayData = useMemo(() => {
    return inventoryItems.map((item) => {
      const progress = calculateProgress(item.createdAt, item.expiresAt);
      const status = getStatus(progress);

      // Use actual expiresAt - createdAt math to estimate remaining time
      const displayTimeRemaining = item.expiresAt
        ? calculateTimeRemaining(item.expiresAt)
        : 'Unknown';

      return {
        ...item,
        displayProgress: progress,
        displayTimeRemaining,
        displayStatus: status,
      };
    });
  }, [inventoryItems, calculateProgress, getStatus, calculateTimeRemaining]);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>IN-VENTO:</Text>
        <Text style={styles.subtitle}>Intelligent Inventory System</Text>
      </View>

      {/* Greeting */}
      <Text style={styles.greeting}>DASHBOARD</Text>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/add-inventory-item')}
        >
          <Text style={styles.buttonText}>ADD ITEM MANUALLY</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/camera')}
        >
          <Text style={styles.buttonText}>USE COMPUTER VISION</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/inventoryStats')}
        >
          <Text style={styles.buttonText}>INVENTORY SATISTICS</Text>
        </TouchableOpacity>
      </View>

      {/* Inventory Items Section */}
      <Text style={styles.sectionTitle}>INVENTORY ITEMS</Text>

      {loading ? (
        <View style={styles.emptyInventory}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.emptyInventoryText}>Loading inventory...</Text>
        </View>
      ) : inventoryItems.length === 0 ? (
        <View style={styles.emptyInventory}>
          <Text style={styles.emptyInventoryText}>
            No inventory items yet. Tap "ADD ITEM" to add one!
          </Text>
        </View>
      ) : (
        itemsWithDisplayData.map((item) => {
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Image source={getIconSource(item.icon)} style={styles.icon} />
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <ProgressBar
                progress={item.displayProgress}
                color={getFreshnessColor(item.displayStatus)}
                style={styles.progressBar}
              />
              <View style={styles.infoRow}>
  {/* Estimated Remaining Time (computed from expiresAt) */}
  <Text style={styles.timeLeft}>
    Est. Remaining: {item.displayTimeRemaining}
  </Text>

  {/* Computed Freshness Classification */}
  {item.freshnessLoading ? (
    <ActivityIndicator size="small" color="#666" style={styles.freshnessLoader} />
  ) : (
    <View
      style={[
        styles.statusTag,
        styles.freshnessTag,
        { backgroundColor: getFreshnessColor(item.displayStatus) },
      ]}
    >
      <Text style={styles.statusText}>{item.displayStatus}</Text>
    </View>
  )}

</View>

              <View style={styles.infoRow}>
                <TouchableOpacity
                  style={[styles.smallButton, updatingItems.has(item.id) && styles.smallButtonDisabled]}
                  onPress={async () => {
                    setUpdatingItems((prev) => new Set(prev).add(item.id));
                    try {
                      await incrementCount(item.id);
                    } catch (error) {
                      console.error('Error incrementing count:', error);
                    } finally {
                      setUpdatingItems((prev) => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                    }
                  }}
                  disabled={updatingItems.has(item.id)}
                >
                  {updatingItems.has(item.id) ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.smallButtonText}>+</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, updatingItems.has(item.id) && styles.smallButtonDisabled]}
                  onPress={async () => {
                    setUpdatingItems((prev) => new Set(prev).add(item.id));
                    try {
                      await decrementCount(item.id);
                    } catch (error) {
                      console.error('Error decrementing count:', error);
                    } finally {
                      setUpdatingItems((prev) => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                    }
                  }}
                  disabled={updatingItems.has(item.id)}
                >
                  {updatingItems.has(item.id) ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.smallButtonText}>-</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.countText}>{item.count}</Text>
              </View>

              {/* Remove button positioned bottom-right under freshness tag */}
              <TouchableOpacity
                style={[styles.removeButton, updatingItems.has(item.id) && styles.smallButtonDisabled]}
                onPress={async () => {
                  // Use same updatingItems set to show loading state
                  setUpdatingItems((prev) => new Set(prev).add(item.id));
                  try {
                    await removeInventoryItem(item.id);
                  } catch (error) {
                    console.error('Error removing item:', error);
                  } finally {
                    setUpdatingItems((prev) => {
                      const next = new Set(prev);
                      next.delete(item.id);
                      return next;
                    });
                  }
                }}
                disabled={updatingItems.has(item.id)}
              >
                {updatingItems.has(item.id) ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.removeButtonText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Freshness Prediction Info */}
      {!loading && inventoryItems.length > 0 && !weatherApiKey && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            ⚠️ WeatherAPI key not configured. Freshness predictions are disabled.
          </Text>
        </View>
      )}

      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 10,
  },
  headerTop: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  backButtonText: {
    color: "#2D5016",
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D5016",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  greeting: {
    fontSize: 18,
    marginTop: 24,
    marginBottom: 16,
    fontWeight: "600",
    color: "#1A3D0F",
    letterSpacing: 0.3,
  },
  buttonContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 25,
    marginVertical: 6,
    minWidth: 280,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    fontWeight: "bold",
    color: "#FFFFFF",
    fontSize: 15,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    color: "#2D5016",
    letterSpacing: 0.3,
  },
  itemCard: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    position: 'relative',
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  icon: {
    width: 50,
    height: 50,
    marginRight: 12,
    resizeMode: 'contain',
  },
  itemName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#1A3D0F",
    flex: 1,
    letterSpacing: 0.3,
  },
  progressBar: {
    height: 10,
    borderRadius: 10,
    marginVertical: 8,
    backgroundColor: "#E8F5E9",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  timeLeft: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    flex: 1,
  },
  statusTag: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  freshnessTag: {
    marginLeft: 4,
  },
  freshnessLoader: {
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: "#FFF3CD",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  infoText: {
    fontSize: 12,
    color: "#856404",
    lineHeight: 18,
  },
  smallButton: {
    backgroundColor: "#66BB6A",
    paddingHorizontal: 25,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 36,
    alignItems: "center",
    shadowColor: "#66BB6A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  smallButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 20,
  },
  countText: {
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 20,
    color: "#2D5016",
    minWidth: 30,
    textAlign: "center",
  },
  smallButtonDisabled: {
    opacity: 0.6,
  },
  emptyInventory: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyInventoryText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  demandSection: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  largeIcon: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  demandText: {
    marginVertical: 12,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  demandButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginVertical: 8,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  demandButtonText: {
    fontWeight: "bold",
    color: "#FFFFFF",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  financesText: {
    marginTop: 12,
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  removeButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
});
