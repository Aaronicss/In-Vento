import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useInventory } from '../../contexts/InventoryContext';

interface DetectionResult {
  id: string;
  user_id: string;
  image_url: string;
  detected_items: any[];
  primary_item: string;
  mold_detected: boolean;
  confidence_scores: number[];
  created_at: string;
}

export default function DetectionResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addInventoryItem } = useInventory();
  const [loading, setLoading] = useState(true);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [shelfLife, setShelfLife] = useState(7);

  // Helper to get icon from item name
  const getItemIcon = (itemName: string) => {
    const name = itemName.toLowerCase().replace('_', '');
    const iconMap: { [key: string]: any } = {
      burgerbun: require('../../assets/burgerbun.png'),
      burger_bun: require('../../assets/burgerbun.png'),
      beef: require('../../assets/beef.png'),
      ground_beef: require('../../assets/beef.png'),
      lettuce: require('../../assets/lettuce.png'),
      cheese: require('../../assets/cheese.png'),
      tomato: require('../../assets/tomato.png'),
      tomatoes: require('../../assets/tomato.png'),
      onion: require('../../assets/onion.png'),
    };
    return iconMap[name] || require('../../assets/burger.png');
  };

  // Fetch detection result from Supabase
  useEffect(() => {
    const fetchDetectionResult = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          Alert.alert('Error', 'User not authenticated');
          router.back();
          return;
        }

        // Fetch latest detection result for this user
        let query = supabase
          .from('detection_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // If detection_id is provided, fetch that specific one
        if (params.detectionId && params.detectionId !== 'latest') {
          query = supabase
            .from('detection_results')
            .select('*')
            .eq('id', params.detectionId)
            .eq('user_id', user.id)
            .single();
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching detection result:', error);
          Alert.alert('Error', 'Failed to fetch detection results');
          return;
        }

        if (data) {
          const result = Array.isArray(data) ? data[0] : data;
          setDetectionResult(result);
          
          // Set default values from detection
          if (result.detected_items && result.detected_items.length > 0) {
            // Use primary item if available
            const primaryItem = result.primary_item || result.detected_items[0].item_name;
            // You can extract quantity from detection if available
          }
        }
      } catch (error: any) {
        console.error('Error:', error);
        Alert.alert('Error', error.message || 'Failed to load detection results');
      } finally {
        setLoading(false);
      }
    };

    fetchDetectionResult();
  }, [params.detectionId]);

  const handleConfirm = async () => {
    if (!detectionResult) return;

    try {
      const primaryItem = detectionResult.primary_item || 
        (detectionResult.detected_items?.[0]?.item_name || 'unknown_item');
      
      const icon = getItemIcon(primaryItem);
      const itemName = primaryItem.toUpperCase().replace('_', ' ');

      // Add to inventory
      addInventoryItem(itemName, icon, quantity, shelfLife);

      Alert.alert('Success', 'Item added to inventory!', [
        {
          text: 'OK',
          onPress: () => router.push('/(tabs)/inventory'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add item to inventory');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>IN-VENTO:</Text>
          <Text style={styles.subtitle}>Intelligent Inventory System</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading detection results...</Text>
        </View>
      </View>
    );
  }

  if (!detectionResult) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>IN-VENTO:</Text>
          <Text style={styles.subtitle}>Intelligent Inventory System</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No detection results found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const primaryItem = detectionResult.primary_item || 
    (detectionResult.detected_items?.[0]?.item_name || 'unknown_item');
  const itemName = primaryItem.toUpperCase().replace('_', ' ');
  const itemIcon = getItemIcon(primaryItem);
  const avgConfidence = detectionResult.confidence_scores?.length > 0
    ? (detectionResult.confidence_scores.reduce((a, b) => a + b, 0) / detectionResult.confidence_scores.length * 100).toFixed(1)
    : 'N/A';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>IN-VENTO:</Text>
        <Text style={styles.subtitle}>Intelligent Inventory System</Text>
      </View>

      <Text style={styles.sectionTitle}>DETECTION RESULTS</Text>

      {/* Mold Detection Status */}
      <View style={[styles.moldCard, detectionResult.mold_detected && styles.moldCardWarning]}>
        <Text style={[styles.moldText, detectionResult.mold_detected && styles.moldTextWarning]}>
          {detectionResult.mold_detected ? '⚠️ MOLD DETECTED!' : '✅ NO MOLD DETECTED'}
        </Text>
      </View>

      {/* Detection Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Confidence: {avgConfidence}%</Text>
        <Text style={styles.infoLabel}>
          Items Detected: {detectionResult.detected_items?.length || 0}
        </Text>
      </View>

      {/* Item Container */}
      <View style={styles.itemContainer}>
        <View style={styles.itemHeader}>
          <Image source={itemIcon} style={styles.icon} />
          <Text style={styles.itemText}>{itemName}</Text>
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.label}>Quantity:</Text>
          <View style={styles.controlGroup}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.adjustText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.valueText}>{quantity} pc</Text>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.adjustText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.label}>Shelf Life:</Text>
          <View style={styles.controlGroup}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => setShelfLife(Math.max(1, shelfLife - 1))}
            >
              <Text style={styles.adjustText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.valueText}>{shelfLife} days</Text>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => setShelfLife(shelfLife + 1)}
            >
              <Text style={styles.adjustText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleConfirm}
      >
        <Text style={styles.confirmText}>ADD TO INVENTORY</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.push('/(tabs)/inventory')}
      >
        <Text style={styles.cancelText}>Cancel</Text>
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
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D5016',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    color: '#2D5016',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  moldCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    alignItems: 'center',
  },
  moldCardWarning: {
    backgroundColor: '#FFF3E0',
    borderLeftColor: '#FF9800',
  },
  moldText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  moldTextWarning: {
    color: '#E65100',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  itemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  itemText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A3D0F',
    flex: 1,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjustButton: {
    backgroundColor: '#66BB6A',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#66BB6A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  adjustText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    minWidth: 60,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  confirmText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
  },
});
