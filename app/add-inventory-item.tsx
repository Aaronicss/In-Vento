import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useInventory } from '../contexts/InventoryContext';
import { getShelfLifePrediction } from '../services/freshnessApi';
import { fetchWeatherData } from '../services/weatherApi';

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

// Small helper to format a Date into a readable date + time string
const formatDateTime = (d: Date) => {
  try {
    return d.toLocaleString();
  } catch (e) {
    // Fallback: ISO string
    return d.toISOString();
  }
};

export default function AddInventoryItemScreen() {
  const router = useRouter();
  const { addInventoryItem } = useInventory();
  const [loading, setLoading] = useState(false);
  const [itemName, setItemName] = useState('');
  const [count, setCount] = useState('1');
  const [shelfLifeDays, setShelfLifeDays] = useState('7');
  const [iconKey, setIconKey] = useState('burger');
  const [predictedExpiryDate, setPredictedExpiryDate] = useState<Date | null>(null);
  const [fetchingPrediction, setFetchingPrediction] = useState(false);
  const lastRequestedRef = useRef<string | null>(null);

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
      // If we have a predictedExpiryDate from the ML API, pass it so it's stored directly.
      await addInventoryItem(
        itemName.trim().toUpperCase(),
        iconKey.toLowerCase(),
        countNum,
        shelfLifeNum,
        predictedExpiryDate || undefined
      );
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

    // Fetch predicted shelf life from API (ML returns hours_until_expiry)
    if (value) {
      // record the item we requested prediction for — prevents race conditions
      lastRequestedRef.current = value;
      setFetchingPrediction(true);

      // Try to read weather API key and city from Expo Constants or env
      const extra = Constants.expoConfig?.extra as { weatherCity?: string; weatherApiKey?: string } | undefined;
      const city = extra?.weatherCity || process.env.EXPO_PUBLIC_WEATHER_CITY || '';
      const apiKey = extra?.weatherApiKey || process.env.EXPO_PUBLIC_WEATHER_API_KEY || '';

      // Fetch weather if key and city are available; otherwise use defaults
      const weatherPromise = apiKey && city ? fetchWeatherData(city, apiKey).catch(err => {
        console.error('Weather fetch failed, using defaults:', err);
        return { temperature: 5, humidity: 50 };
      }) : Promise.resolve({ temperature: 5, humidity: 50 });

      weatherPromise
        .then(({ temperature, humidity }) => {
          return getShelfLifePrediction(value, temperature, humidity, 0);
        })
        .then((predictedHours) => {
          // ignore stale responses
          if (lastRequestedRef.current !== value) return;
          // Convert hours to days for display (round up)
          const days = Math.max(1, Math.ceil(predictedHours / 24));
          setShelfLifeDays(days.toString());

          // Calculate expiry date by adding hours
          const now = new Date();
          const expiryDate = new Date(now.getTime() + predictedHours * 60 * 60 * 1000);
          setPredictedExpiryDate(expiryDate);
        })
        .catch((error) => {
          console.error('Error fetching shelf life:', error);
          // Only apply fallback if this is the latest requested item
          if (lastRequestedRef.current !== value) return;
          // Fall back to 7 days if API call fails
          setShelfLifeDays('7');
          const now = new Date();
          const expiryDate = new Date(now);
          expiryDate.setDate(expiryDate.getDate() + 7);
          setPredictedExpiryDate(expiryDate);
        })
        .finally(() => {
          // clear request marker and fetching flag
          if (lastRequestedRef.current === value) lastRequestedRef.current = null;
          setFetchingPrediction(false);
        });
    } else {
      lastRequestedRef.current = null;
      setShelfLifeDays('7');
      setPredictedExpiryDate(null);
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
</Picker></View>

  {/* Prediction UI: show loading while fetching, otherwise show the computed expiry */}
  {itemName && fetchingPrediction && (
    <View style={styles.predictionCard}>
      <Text style={styles.predictionLabel}>Fetching Prediction...</Text>
      <Text style={styles.predictionDate}>Loading...</Text>
      <Text style={styles.predictionShelfLife}>Please wait</Text>
    </View>
  )}

  {itemName && !fetchingPrediction && predictedExpiryDate && (
    <View style={styles.predictionCard}>
      <Text style={styles.predictionLabel}>Predicted Expiry</Text>
      <Text style={styles.predictionDate}>{formatDateTime(predictedExpiryDate)}</Text>
      <Text style={styles.predictionShelfLife}>Shelf life: {shelfLifeDays} day{Number(shelfLifeDays) === 1 ? '' : 's'}</Text>
    </View>
  )}

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
  predictionCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  predictionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D5016',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  predictionDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A3D0F',
    marginBottom: 4,
  },
  predictionShelfLife: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
});
