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
    backgroundColor: '#0F2E08',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 24,
    backgroundColor: 'rgba(26, 61, 15, 0.4)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1A3D0F',
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerWrapper: {
    backgroundColor: '#1A3D0F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: 12,
  },
  predictionCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  predictionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  predictionDate: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  predictionShelfLife: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
});
