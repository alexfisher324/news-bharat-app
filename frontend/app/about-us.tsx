import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';

export default function AboutUs() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>About Us</Text>
        <Text style={styles.body}>
          The Bharat Evolution brings you the latest news, insights, and updates from across India.
        </Text>
        <Text style={styles.body}>
          Our mission is to keep readers informed with fast, reliable, and engaging coverage.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1F2937',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 14,
  },
});
