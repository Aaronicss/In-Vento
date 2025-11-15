import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useInventory } from '../contexts/InventoryContext';

// Available icons mapping
const availableIcons: { [key: string]: any } = {
  burgerbun: require('../assets/burgerbun.png'),
  beef: require('../assets/beef.png'),
  lettuce: require('../assets/lettuce.png'),
  cheese: require('../assets/cheese.png'),
  tomato: require('../assets/tomato.png'),
  onion: require('../assets/onion.png'),
  burger: require('../assets/burger.png'),
  drink: require('../assets/drink.png'),
};

const nameToIconMap: { [key: string]: string } = {
  "BURGER BUN": "burgerbun",
  "BEEF": "beef",
  "LETTUCE": "lettuce",
  "CHEESE": "cheese",
  "TOMATO": "tomato",
  "ONION": "onion",
  "BURGER": "burger",
  "DRINK": "drink",
};

export default function AddInventoryItemScreen() {
  const router = useRouter();
  const { addInventoryItem } = useInventory();
  const [loading, setLoading] = useState(false);
  const [itemName, setItemName] = useState('');
  const [count, setCount] = useState('1');
  const [shelfLifeDays, setShelfLifeDays] = useState('7');
  const [iconKey, setIconKey] = useState('burger');

  const handleConfirm = async () => {
    // Validation
    if (!itemName.trim()) {
      Alert.alert('Invalid Item Name', 'Please enter an item name.');
      return;
    }

    const countNum = Number(count);
    if (isNaN(countNum) || countNum <= 0) {
      Alert.alert('Invalid Count', 'Please enter a valid count (greater than 0).');
      return;
    }

    const shelfLifeNum = Number(shelfLifeDays);
    if (isNaN(shelfLifeNum) || shelfLifeNum <= 0) {
      Alert.alert('Invalid Shelf Life', 'Please enter a valid shelf life in days (greater than 0).');
      return;
    }

    setLoading(true);
    try {
      // Add item to inventory (pass icon key as string)
      await addInventoryItem(itemName.trim().toUpperCase(), iconKey.toLowerCase(), countNum, shelfLifeNum);
      Alert.alert('Item Added', `${itemName} has been added to inventory!`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add inventory item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ADD INVENTORY ITEM</Text>
        <Text style={styles.subtitle}>Enter item details below</Text>
      </View>

      {/* Item Name Input */}
      <View style={styles.section}>
  <Text style={styles.label}>Item Name</Text>

  <View style={styles.pickerWrapper}>
  <Picker
  selectedValue={itemName}
  onValueChange={(value) => {
    setItemName(value);

    if (value && nameToIconMap[value]) {
      setIconKey(nameToIconMap[value]);
    }
  }}
>
  <Picker.Item label="Select an item..." value="" />

  <Picker.Item label="BURGER BUN" value="BURGER BUN" />
  <Picker.Item label="BEEF" value="BEEF" />
  <Picker.Item label="LETTUCE" value="LETTUCE" />
  <Picker.Item label="CHEESE" value="CHEESE" />
  <Picker.Item label="TOMATO" value="TOMATO" />
  <Picker.Item label="ONION" value="ONION" />
  <Picker.Item label="BURGER" value="BURGER" />
  <Picker.Item label="DRINK" value="DRINK" />
</Picker>

  </View>
</View>

      {/* Count Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter quantity"
          value={count}
          onChangeText={setCount}
          keyboardType="number-pad"
        />
      </View>

      {/* Shelf Life Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Shelf Life (Days)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter shelf life in days (e.g., 7)"
          value={shelfLifeDays}
          onChangeText={setShelfLifeDays}
          keyboardType="number-pad"
        />
      </View>

      

      {/* Confirm Button */}
      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>CONFIRM ADD</Text>
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
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
});
