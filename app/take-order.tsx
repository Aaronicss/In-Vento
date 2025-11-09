import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useOrders, OrderItem } from '../contexts/OrdersContext';

export default function TakeOrderScreen() {
  const router = useRouter();
  const { addOrder } = useOrders();
  const [tableNumber, setTableNumber] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { id: 'item-1', name: '', quantity: 1 },
  ]);

  const addItem = () => {
    setItems([...items, { id: `item-${Date.now()}`, name: '', quantity: 1 }]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== itemId));
    }
  };

  const updateItem = (itemId: string, field: 'name' | 'quantity', value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, [field]: field === 'quantity' ? Number(value) : value } : item
      )
    );
  };

  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    // Validation
    if (!tableNumber || isNaN(Number(tableNumber)) || Number(tableNumber) <= 0) {
      Alert.alert('Invalid Table Number', 'Please enter a valid table number.');
      return;
    }

    const validItems = items.filter((item) => item.name.trim() !== '' && item.quantity > 0);
    if (validItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one item to the order.');
      return;
    }

    setLoading(true);
    try {
      // Add order to context
      await addOrder(Number(tableNumber), validItems);
      
      Alert.alert('Order Added', `Order for Table #${tableNumber} has been added!`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TAKE ORDER</Text>
        <Text style={styles.subtitle}>Enter order details below</Text>
      </View>

      {/* Table Number Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Table Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter table number"
          value={tableNumber}
          onChangeText={setTableNumber}
          keyboardType="number-pad"
        />
      </View>

      {/* Items Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Order Items</Text>
          <TouchableOpacity style={styles.addButton} onPress={addItem}>
            <Text style={styles.addButtonText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        {items.map((item, index) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>Item {index + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeItem(item.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Item name (e.g., Cheeseburger)"
              value={item.name}
              onChangeText={(value) => updateItem(item.id, 'name', value)}
            />

            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantity:</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() =>
                    updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))
                  }
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateItem(item.id, 'quantity', item.quantity + 1)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Confirm Button */}
      <TouchableOpacity 
        style={[styles.confirmButton, loading && styles.buttonDisabled]} 
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.confirmButtonText}>CONFIRM ORDER</Text>
        )}
      </TouchableOpacity>

      {/* Cancel Button */}
      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A3D0F',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5016',
  },
  removeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FF5252',
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    backgroundColor: '#66BB6A',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#66BB6A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  quantityButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    minWidth: 30,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
