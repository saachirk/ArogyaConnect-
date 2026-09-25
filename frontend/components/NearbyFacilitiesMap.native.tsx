import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import * as Linking from "expo-linking";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DEFAULT_LOCATION = { latitude: 12.9716, longitude: 77.5946 };

type Facility = {
  id: number;
  name: string;
  type: string;
  village: string;
  district: string;
  latitude: number;
  longitude: number;
  connectivity_status: string;
  queue_length: number;
  specialist_count: number;
  distance_km: number | null;
};

const FACILITIES_CACHE_KEY = "nearby_facilities_cache";
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
};

export default function NearbyFacilitiesMap() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const openDirections = (facility: Facility) => {
    const origin = `${userLocation?.latitude},${userLocation?.longitude}`;
    const destination = `${facility.latitude},${facility.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    Linking.openURL(url).catch((error) => {
      console.error("Could not open directions:", error);
    });
  };

  useEffect(() => {
    getLocationAndFacilities();
  }, []);

  const loadCachedFacilities = async (
  latitude?: number,
  longitude?: number
) => {
    try {
      const cached = await AsyncStorage.getItem(
        FACILITIES_CACHE_KEY
      );

      if (!cached) {
        console.log("No cached facilities available");
        return;
      }

      let data: Facility[] = JSON.parse(cached);

if (
  latitude !== undefined &&
  longitude !== undefined
) {
  data = data.map((facility) => ({
    ...facility,
    distance_km: Number(
      calculateDistance(
        latitude,
        longitude,
        facility.latitude,
        facility.longitude
      ).toFixed(1)
    ),
  }));

  data.sort(
    (a, b) =>
      (a.distance_km ?? 9999) -
      (b.distance_km ?? 9999)
  );
}

console.log(
  "Loaded facilities from cache:",
  data
);

setFacilities(data);
    } catch (error) {
      console.error(
        "Failed to load cached facilities:",
        error
      );
    }
  };

  const getLocationAndFacilities = async () => {
  try {
    // Get the patient's current location first.
    // GPS can work without internet on many devices.
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      console.log("Location permission denied");

      setUserLocation(DEFAULT_LOCATION);
      await loadCachedFacilities();
      return;
    }

    const location =
      await Location.getCurrentPositionAsync({});

    const latitude = location.coords.latitude;
    const longitude = location.coords.longitude;

    console.log(
      "PATIENT LOCATION:",
      latitude,
      longitude
    );

    setUserLocation({
      latitude,
      longitude,
    });

    // Check network after obtaining location.
    const networkState = await NetInfo.fetch();
    const isOnline = networkState.isConnected;

    if (isOnline) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/facilities?lat=${latitude}&lon=${longitude}`
        );

        if (!response.ok) throw new Error(`Facilities API returned ${response.status}`);
        const data: Facility[] = await response.json();

        console.log(
          "FACILITIES FROM API:",
          data
        );

        setFacilities(data);

        // Save latest online data.
        await AsyncStorage.setItem(
          FACILITIES_CACHE_KEY,
          JSON.stringify(data)
        );

        console.log(
          "Facilities cached successfully"
        );
      } catch (error) {
        console.log(
          "API unavailable — loading cached facilities"
        );

        await loadCachedFacilities();
      }
    } else {
      console.log(
        "OFFLINE — loading cached facilities"
      );

      await loadCachedFacilities(latitude, longitude);
    }
  } catch (error) {
    console.error(
      "Location error:",
      error
    );

    // If location fails, still try cached facilities.
    await loadCachedFacilities();
  } finally {
    setLoading(false);
  }
};

  if (loading || !userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Finding healthcare facilities near you...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        }}
        showsUserLocation={false}
        showsMyLocationButton={true}
      >
        {/* Patient location */}
        <Marker
          coordinate={userLocation}
          title="Your Location"
          pinColor="#2563eb"
        />

        {/* Healthcare facilities */}
        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            coordinate={{
              latitude: facility.latitude,
              longitude: facility.longitude,
            }}
            title={facility.name}
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.facilityName}>
                  {facility.name}
                </Text>

                <Text>
                  {facility.type}
                </Text>

                <Text>
                  {facility.village},{" "}
                  {facility.district}
                </Text>

                <Text>
                  Queue: {facility.queue_length ?? 0}
                </Text>

                <Text>
                  Specialists:{" "}
                  {facility.specialist_count ?? 0}
                </Text>

                {facility.distance_km != null && (
                  <Text>
                    Distance:{" "}
                    {facility.distance_km} km
                  </Text>
                )}
                <Pressable
                  style={styles.directionsButton}
                  onPress={() => openDirections(facility)}
                >
                  <Text style={styles.directionsButtonText}>
                    Get directions
                  </Text>
                </Pressable>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 550,
    borderRadius: 12,
    overflow: "hidden",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  loadingContainer: {
    height: 550,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },

  loadingText: {
    marginTop: 10,
    color: "#64748b",
  },

  callout: {
    width: 220,
    padding: 8,
  },

  facilityName: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 4,
  },

  directionsButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#0d9488",
    alignItems: "center",
  },

  directionsButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});