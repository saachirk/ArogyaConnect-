import { useEffect, useState } from "react";
import * as Location from "expo-location";
export default function NearbyFacilitiesMap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          height: "100%",
          minHeight: 500,
          width: "100%",
          backgroundColor: "#f1f5f9",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading map...
      </div>
    );
  }

  return <LeafletMap />;
}

function LeafletMap() {
  const [components, setComponents] = useState<any>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );

  useEffect(() => {
    const reactLeaflet = require("react-leaflet");
    const leaflet = require("leaflet");
    require("leaflet/dist/leaflet.css");

    const L = leaflet.default || leaflet;
    
   

    const icon = L.icon({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    L.Marker.prototype.options.icon = icon;

    setComponents(reactLeaflet);

    getLocationAndFacilities();
  }, []);

  const getLocationAndFacilities = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Location permission denied");

        // Fallback to Bengaluru
        const fallback: [number, number] = [12.9716, 77.5946];
        setUserLocation(fallback);

        const response = await fetch(
          "http://127.0.0.1:8000/api/facilities"
        );

        const data = await response.json();
        setFacilities(data);

        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      console.log("PATIENT LOCATION:", latitude, longitude);

      setUserLocation([latitude, longitude]);

      const response = await fetch(
        `http://127.0.0.1:8000/api/facilities?lat=${latitude}&lon=${longitude}`
      );

      const data = await response.json();

      console.log("FACILITIES WITH DISTANCE:", data);

      setFacilities(data);
    } catch (error) {
      console.error("Location/facility error:", error);
    }
  };

  if (!components || !userLocation) {
    return (
      <div
        style={{
          height: "100%",
          minHeight: 500,
          width: "100%",
          backgroundColor: "#f1f5f9",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Getting your location...
      </div>
    );
  }

  const {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
} = components;

  return (
  <div
    style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}
  >
    {/* MAP */}
    <div
      style={{
        width: "100%",
        height: 550,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={userLocation}
        zoom={10}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Patient location */}
        <CircleMarker
          center={userLocation}
          radius={10}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#2563eb",
            fillOpacity: 1,
          }}
        >
          <Popup>
            <strong>Your Location</strong>
          </Popup>
        </CircleMarker>

        {/* Healthcare facilities */}
        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.latitude, facility.longitude]}
          >
            <Popup>
              <strong>{facility.name}</strong>
              <br />
              {facility.type}
              <br />
              {facility.village}, {facility.district}
              <br />
              Queue: {facility.queue_length ?? 0}
              <br />
              Specialists: {facility.specialist_count ?? 0}
              {facility.distance_km != null && (
                <>
                  <br />
                  Distance: {facility.distance_km} km
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>

    {/* NEAREST FACILITIES */}
    <div
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 20,
        boxSizing: "border-box",
        border: "1px solid #e2e8f0",
      }}
    >
      <h2
        style={{
          margin: "0 0 16px 0",
          fontSize: 20,
          color: "#12385b",
        }}
      >
        Nearest Healthcare Facilities
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {facilities.slice(0, 5).map((facility) => (
          <div
            key={facility.id}
            style={{
              border: "1px solid #dbe4ec",
              borderRadius: 10,
              padding: 16,
              backgroundColor: "#f8fafc",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#12385b",
                marginBottom: 6,
              }}
            >
              {facility.name}
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                marginBottom: 10,
              }}
            >
              {facility.type} • {facility.district}
            </div>

            <div
              style={{
                fontSize: 14,
                color: "#334155",
                lineHeight: 1.7,
              }}
            >
              📍 {facility.distance_km ?? "—"} km
              <br />
              Queue: {facility.queue_length ?? 0}
              <br />
              Specialists: {facility.specialist_count ?? 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
}