import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// ✅ Update this to your Flask server IP address (not localhost)
const FLASK_API_URL = 'http://192.168.1.11:5000/predict'; // Example — change to your own IP

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Handle permissions
  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.title}>IN-VENTO:</Text>
          <Text style={styles.subtitle}>Intelligent Inventory System</Text>
          <Text style={styles.permissionText}>
            We need your permission to use the camera for inventory detection
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 📸 Capture image and send to Flask API
  const takePicture = async () => {
    if (!cameraRef.current) return;

    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo?.uri) throw new Error('Failed to capture image');

      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      const response = await fetch(FLASK_API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

      const result = await response.json();
      console.log('✅ Flask result:', result);

      // 🧮 Show detected item summary
      if (result.summary) {
        const summaryText = Object.entries(result.summary)
          .map(([label, count]) => `${label}: ${count}`)
          .join('\n');
        Alert.alert('Detected Items', summaryText);
      } else {
        Alert.alert('No detections found');
      }

      // 🗄️ Optionally save detection data to Supabase
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id || null;

      const { error: supabaseError } = await supabase
        .from('detection_results')
        .insert({
          user_id: userId,
          image_url: photo.uri,
          detected_items: result.detections || [],
          created_at: new Date().toISOString(),
        });

      if (supabaseError) console.error('Error saving to Supabase:', supabaseError);

      // Navigate to results screen if desired
      router.push({
        pathname: '/(tabs)/detection-results',
        params: { detectionId: 'latest' },
      });
    } catch (error: any) {
      console.error('Error processing image:', error);
      Alert.alert('Error', error.message || 'Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SCAN INVENTORY</Text>
        <Text style={styles.headerSubtitle}>Capture an image to detect items</Text>
      </View>

      <CameraView ref={cameraRef} style={styles.camera} />

      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={[styles.captureButton, loading && styles.captureButtonDisabled]}
          onPress={takePicture}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="large" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>
        <Text style={styles.captureHint}>{loading ? 'Processing...' : 'Tap to capture'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 4 },
  camera: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureContainer: { position: 'absolute', bottom: 40, alignSelf: 'center', alignItems: 'center' },
  captureButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 45,
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 5,
    borderColor: '#FFFFFF',
  },
  captureButtonDisabled: { opacity: 0.7 },
  captureButtonInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFFFFF' },
  captureHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 350,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2D5016', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  permissionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  permissionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
});
