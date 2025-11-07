import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { OrdersProvider } from '../contexts/OrdersContext';
import { InventoryProvider } from '../contexts/InventoryContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <OrdersProvider>
      <InventoryProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Login Screen */}
            <Stack.Screen name="login" />

            {/* Tabs Group (Dashboard) */}
            <Stack.Screen name="(tabs)" />

            {/* Take Order Screen */}
            <Stack.Screen name="take-order" />

            {/* Add Inventory Item Screen */}
            <Stack.Screen name="add-inventory-item" />

            {/* Optional Modal */}
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>

          <StatusBar style="auto" />
        </ThemeProvider>
      </InventoryProvider>
    </OrdersProvider>
  );
}
