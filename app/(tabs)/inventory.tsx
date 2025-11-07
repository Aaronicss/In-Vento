import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ProgressBar } from "react-native-paper";
import { useInventory } from "../../contexts/InventoryContext";

export default function InventoryScreen() {
  const router = useRouter();
  const {
    inventoryItems,
    incrementCount,
    decrementCount,
    updateInventoryItem,
  } = useInventory();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second to recalculate progress and time remaining
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      // Update progress and time remaining for each item
      inventoryItems.forEach((item) => {
        const progress = (item.expiresAt.getTime() - now) / (item.expiresAt.getTime() - item.createdAt.getTime());
        const newProgress = Math.max(0, Math.min(1, progress));
        
        // Calculate time remaining
        const diff = item.expiresAt.getTime() - now;
        let timeRemaining = 'Expired';
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          timeRemaining = days > 0 ? `${days}d ${hours}hrs` : `${hours}hrs`;
        }

        const status = newProgress > 0.5 ? 'Fresh' : 'Warning';

        // Only update if changed
        if (
          item.progress !== newProgress ||
          item.timeRemaining !== timeRemaining ||
          item.status !== status
        ) {
          updateInventoryItem(item.id, {
            progress: newProgress,
            timeRemaining,
            status,
          });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inventoryItems, updateInventoryItem]);

  // Helper function to get progress bar color based on status
  const getProgressColor = (status: 'Fresh' | 'Warning') => {
    return status === 'Fresh' ? '#4CAF50' : '#FF9800';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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
          <Text style={styles.buttonText}>ADD ITEM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/camera')}
        >
          <Text style={styles.buttonText}>UPDATE INVENTORY</Text>
        </TouchableOpacity>
      </View>

      {/* Inventory Items Section */}
      <Text style={styles.sectionTitle}>INVENTORY ITEMS</Text>

      {inventoryItems.length === 0 ? (
        <View style={styles.emptyInventory}>
          <Text style={styles.emptyInventoryText}>
            No inventory items yet. Tap "ADD ITEM" to add one!
          </Text>
        </View>
      ) : (
        inventoryItems.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Image source={item.icon} style={styles.icon} />
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
            <ProgressBar
              progress={item.progress}
              color={getProgressColor(item.status)}
              style={styles.progressBar}
            />
            <View style={styles.infoRow}>
              <Text style={styles.timeLeft}>{item.timeRemaining}</Text>
              <View
                style={[
                  styles.statusTag,
                  {
                    backgroundColor:
                      item.status === "Fresh" ? "#4CAF50" : "#FF9800",
                  },
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => incrementCount(item.id)}
              >
                <Text style={styles.smallButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => decrementCount(item.id)}
              >
                <Text style={styles.smallButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.countText}>{item.count}</Text>
            </View>
          </View>
        ))
      )}

      {/* Demand Section */}
      <View style={styles.demandSection}>
        <Image
          source={require("../../assets/burger.png")}
          style={styles.largeIcon}
        />
        <Text style={styles.demandText}>
          You haven't set your demand yet!
        </Text>
        <TouchableOpacity style={styles.demandButton}>
          <Text style={styles.demandButtonText}>SET NOW!</Text>
        </TouchableOpacity>
        <Text style={styles.financesText}>FINANCES - Cooking Soon</Text>
      </View>
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
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 12,
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
  smallButton: {
    backgroundColor: "#66BB6A",
    paddingHorizontal: 10,
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
    fontSize: 16,
  },
  countText: {
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 15,
    color: "#2D5016",
    minWidth: 30,
    textAlign: "center",
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
});
