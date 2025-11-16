import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 🔥 Roboflow API URL (Detection or Classification)
const MODEL_NAME = "in-vento-n4vxc"; // example: "food-items"
const MODEL_VERSION = "3";
const API_KEY = "F02xuve8P2KEBhMSFZph";

const ROBOFLOW_URL = `https://detect.roboflow.com/${MODEL_NAME}/${MODEL_VERSION}?api_key=${API_KEY}`;

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.title}>Allow Camera Access</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 📸 Capture image & send to Roboflow
  const takePicture = async () => {
  if (!cameraRef.current) return;

  setLoading(true);

  try {
    // 1️⃣ Capture image
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8,
      base64: false,
    });

    if (!photo?.uri) throw new Error('Failed to capture image');

    // 2️⃣ Prepare form data for Roboflow
    const formData = new FormData();
    formData.append('file', {
      uri: photo.uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    // 3️⃣ Call Roboflow
    const response = await fetch(ROBOFLOW_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error(`Roboflow API Error: ${response.statusText}`);

    const result = await response.json();

    // 4️⃣ Process predictions safely
    const summary: { [label: string]: number } = {};

    if (Array.isArray(result.predictions)) {
      result.predictions.forEach((pred: any) => {
        const label = pred.class;
        if (label) summary[label] = (summary[label] || 0) + 1;
      });
    }

    // 5️⃣ Show summary
    if (Object.keys(summary).length > 0) {
      const summaryText = Object.entries(summary)
        .map(([label, count]) => `${label}: ${count}`)
        .join('\n');
      Alert.alert('Detected Items', summaryText);
    } else {
      Alert.alert('No detections found');
    }


    // 7️⃣ Navigate to results screen if desired
      // Compute top prediction (highest confidence) and include it in params
      let topPred: any = null;
      if (Array.isArray(result.predictions) && result.predictions.length > 0) {
        topPred = result.predictions.reduce((best: any, cur: any) => {
          if (!best || (cur.confidence || 0) > (best.confidence || 0)) return cur;
          return best;
        }, null);
      }

      // count occurrences of the top prediction class
      const topCount = topPred && Array.isArray(result.predictions)
        ? result.predictions.filter((p: any) => p.class === topPred.class).length
        : 0;

      const detectedParam = topPred
        ? {
            name: (topPred.class || '').toUpperCase(),
            confidence: topPred.confidence || 0,
            predictedHours: topPred.hours_until_expiry || undefined,
            count: topCount || 1,
          }
        : null;

      router.push({
        pathname: '/(tabs)/detection-results',
        params: { detectedItem: detectedParam ? JSON.stringify(detectedParam) : undefined },
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
      <Text style={styles.headerTitle}>SCAN INVENTORY</Text>

      <CameraView ref={cameraRef} style={styles.camera} />

      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={[styles.captureButton, loading && { opacity: 0.5 }]}
          onPress={takePicture}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>

        <Text style={styles.captureHint}>
          {loading ? "Detecting..." : "Tap to Capture"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  headerTitle: {
    textAlign: "center",
    paddingTop: 50,
    fontSize: 22,
    fontWeight: "bold",
  },
  title: {
  fontSize: 24,
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: 10,
},
  camera: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  captureContainer: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    alignItems: "center",
  },
  captureButton: {
    backgroundColor: "#4CAF50",
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "#fff",
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
  },
  captureHint: {
    marginTop: 12,
    fontSize: 14,
    color: "#333",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
  },
  permissionButtonText: { color: "#fff", fontWeight: "bold" },
});
