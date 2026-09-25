import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import NearbyFacilitiesMap from '../../components/NearbyFacilitiesMap';

export default function PatientMapScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>

        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Nearby Healthcare Facilities
          </Text>

          <Text style={styles.subtitle}>
            Find healthcare facilities near you
          </Text>
        </View>

      </View>

      <View style={styles.mapContainer}>
        <NearbyFacilitiesMap />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },

  header: {
    paddingTop: 45,
    paddingHorizontal: 24,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#d5dfe7',
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef7fb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  backText: {
    fontSize: 24,
    color: '#143b61',
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#143b61',
  },

  subtitle: {
    fontSize: 13,
    color: '#667b8f',
    marginTop: 3,
  },

  mapContainer: {
    flex: 1,
    padding: 24,
  },
});