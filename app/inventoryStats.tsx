import { useRouter } from "expo-router";
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useInventory } from '../contexts/InventoryContext';

const screenWidth = Dimensions.get('window').width;


export default function InventoryStats() {
    const router = useRouter();
  const { inventoryItems } = useInventory();

  // --- Bar chart data ---
  const barData = {
    labels: inventoryItems.map(item => item.name),
    datasets: [
      {
        data: inventoryItems.map(item => item.count),
      },
    ],
  };

  // Helper to shorten long labels for the X axis
  const truncateLabel = (label: string, max = 8) => {
    if (!label) return '';
    return label.length > max ? label.slice(0, max - 1) + '…' : label;
  };

  const shortLabels = inventoryItems.map(item => truncateLabel(item.name, 8));

  const barChartConfig = {
    backgroundGradientFrom: '#F5F7FA',
    backgroundGradientTo: '#F5F7FA',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // green
    labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  // --- Pie chart data ---
  const pieData = inventoryItems.map((item, index) => ({
    name: item.name,
    count: item.count,
    color: `hsl(${(index / inventoryItems.length) * 360}, 70%, 50%)`,
    legendFontColor: '#333',
    legendFontSize: 14,
    value: item.count,
  }));

  // --- Summary stats ---
  const totalItems = inventoryItems.reduce((acc, item) => acc + item.count, 0);
  const totalTypes = inventoryItems.length;
  const avgCount = totalTypes > 0 ? (totalItems / totalTypes).toFixed(1) : 0;

  return (
    <ScrollView style={styles.container}> 
      <View style={styles.headerContainer}>
  <TouchableOpacity
    style={styles.backButton}
    onPress={() => router.push('/inventory')}
  >
    <Text style={styles.backButtonText}>← Back</Text>
  </TouchableOpacity>

  <Text style={styles.title}>Inventory Statistics</Text>
</View>
      <View style={styles.chartSection}>
  <Text style={styles.chartTitle}>Item Counts (Bar Chart)</Text>
  {inventoryItems.length > 0 ? (
    <ScrollView 
      horizontal 
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }} // reduced vertical scroll space to tighten layout
      >
        <BarChart
          data={{
            labels: shortLabels,
            datasets: [
              { data: inventoryItems.map(item => item.count) },
            ],
          }}
          width={Math.max(screenWidth - 40, inventoryItems.length * 60)} // dynamic width
          height={300} // enough vertical space for bars
          chartConfig={{
            backgroundGradientFrom: '#F5F7FA',
            backgroundGradientTo: '#F5F7FA',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
            style: { borderRadius: 12, paddingBottom: 12 }, // smaller padding now sufficient for rotated labels
            propsForBackgroundLines: { stroke: '#E0E0E0', strokeDasharray: '' },
          }}
          verticalLabelRotation={45} // reduce rotation so labels don't get clipped
          fromZero
          showValuesOnTopOfBars
          style={{
            marginVertical: 8,
            borderRadius: 12,
            paddingBottom: 8, // smaller padding to reduce gap below chart
            marginBottom: 8,
          }}
        />

        
      </ScrollView>
    </ScrollView>
  ) : (
    <Text style={styles.noData}>No inventory items</Text>
  )}
</View>

      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Item Distribution (Pie Chart)</Text>
        {inventoryItems.length > 0 ? (
          <PieChart
            data={pieData}
            width={screenWidth - 40}
            height={220}
            chartConfig={barChartConfig}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        ) : (
          <Text style={styles.noData}>No inventory items</Text>
        )}
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.statsTitle}>Summary Stats</Text>
        <Text>Total Items: {totalItems}</Text>
        <Text>Total Types: {totalTypes}</Text>
        <Text>Average Count per Item: {avgCount}</Text>
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
headerContainer: {
    position: 'relative',
    marginBottom: 10,
    alignItems: 'center', // centers the title horizontally
},
backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
    margin: 16,
},
      
backButtonText: {
    color: "#2D5016",
    fontWeight: "600",
    fontSize: 14,
},
      
title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
    textAlign: 'center',
    paddingTop: 40,
    paddingVertical: 8,
    margin:30,
},
      
  chartSection: {
    marginBottom: 24,
    overflow: "visible",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A3D0F',
    marginBottom: 8,
  },
  statsSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2D5016',
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },
  legendContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
});
