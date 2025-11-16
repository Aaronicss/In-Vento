import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login with Supabase
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        Alert.alert('Login Successful', 'Welcome to In-Vento!');
        router.push('/(tabs)/home'); // navigate to home screen
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Sign up with Supabase
  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        Alert.alert('Sign Up Successful', 'Your account has been created! Please check your email to verify your account.');
        // Optionally navigate to home after sign up
        // router.push('/(tabs)/home');
      }
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IN-VENTO:</Text>
      <Text style={styles.subtitle}>Intelligent Inventory System</Text>

      <Text style={styles.loginText}>{isSignUp ? 'USER SIGN UP' : 'USER LOGIN'}</Text>

      <Image
        source={require('../assets/burger.png')} // replace with your burger image
        style={styles.image}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoComplete="password"
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={isSignUp ? handleSignUp : handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.switchButton} 
        onPress={() => setIsSignUp(!isSignUp)}
      >
        <Text style={styles.switchText}>
          {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  loginText: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  image: { width: 200, height: 200, borderRadius: 20, marginBottom: 20, resizeMode: "contain" },
  input: {
    width: '80%',
    backgroundColor: '#ddd',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    textAlign: 'center',
  },
  button: {
    width: '60%',
    backgroundColor: '#d9d9d9',
    borderRadius: 20,
    padding: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { textAlign: 'center', fontWeight: 'bold' },
  switchButton: {
    marginTop: 15,
    padding: 10,
  },
  switchText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});
