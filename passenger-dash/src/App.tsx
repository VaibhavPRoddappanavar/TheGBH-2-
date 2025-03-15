import  { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { Icon, LatLng } from "leaflet";
import { MapPin, Navigation, Car } from "lucide-react";
import { rideAPI } from "./api";
import { getSocket, joinPassengerRoom } from "./socket";
import "leaflet/dist/leaflet.css";
import { Polyline } from "react-leaflet";
// Fix for default marker icons in Leaflet with Vite
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import { FaRegUser } from "react-icons/fa";

const defaultIcon = new Icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const pickupIcon = new Icon({
  ...defaultIcon.options,
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
});

const dropoffIcon = new Icon({
  ...defaultIcon.options,
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconSize: [25, 41],
});

const defaultCenter = { lat: 12.9716, lng: 77.5946 }; // New York City

function LocationMarkers({
  isSelectingPickup,
  setIsSelectingPickup,
  pickupLocation,
  setPickupLocation,
  dropoffLocation,
  setDropoffLocation,
  calculateRoute,
}) {
  const map = useMapEvents({
    click: async (e) => {
      const clickedLocation = e.latlng;
      if (isSelectingPickup) {
        setPickupLocation(clickedLocation);
        setIsSelectingPickup(false);
      } else {
        setDropoffLocation(clickedLocation);
        if (pickupLocation) {
          calculateRoute(pickupLocation, clickedLocation);
        }
      }
    },
  });

  return (
    <>
      {pickupLocation && (
        <Marker position={pickupLocation} icon={pickupIcon}>
          <Popup>Pickup Location</Popup>
        </Marker>
      )}
      {dropoffLocation && (
        <Marker position={dropoffLocation} icon={dropoffIcon}>
          <Popup>Dropoff Location</Popup>
        </Marker>
      )}
    </>
  );
}

function App() {
  const [activeRides, setActiveRides] = useState([]);
  const [newRide, setNewRide] = useState({
    pickup: "",
    dropoff: "",
    distance: "",
    fare: "",
    trafficLevel: "low",
  });
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LatLng | null>(null);
  const [isSelectingPickup, setIsSelectingPickup] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    loadActiveRides();

    socket.on("rideStatusUpdated", (updatedRide) => {
      setActiveRides((prev) =>
        prev.map((ride) => (ride._id === updatedRide._id ? updatedRide : ride))
      );
    });

    return () => {
      socket.off("rideStatusUpdated");
    };
  }, []);

  const loadActiveRides = async () => {
    try {
      const data = await rideAPI.getAllRides();
      setActiveRides(data);
      data.forEach((ride) => joinPassengerRoom(ride._id));
    } catch (error) {
      console.error("Error loading rides:", error);
    }
  };

  const calculateRoute = async (pickup: LatLng, dropoff: LatLng) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
  
      if (data.routes && data.routes[0]) {
        const distance = (data.routes[0].distance / 1000).toFixed(2); // Convert to km
        const estimatedFare = calculateFare(data.routes[0].distance);
  
        setNewRide({
          ...newRide,
          pickup: `${pickup.lat.toFixed(6)}, ${pickup.lng.toFixed(6)}`,
          dropoff: `${dropoff.lat.toFixed(6)}, ${dropoff.lng.toFixed(6)}`,
          distance: distance,
          fare: estimatedFare.toString(),
        });
  
        // Store route coordinates
        const coordinates = data.routes[0].geometry.coordinates.map(coord => ({
          lat: coord[1],
          lng: coord[0]
        }));
        setRouteCoordinates(coordinates);
      }
    } catch (error) {
      console.error("Error calculating route:", error);
    }
  };
  

  const calculateFare = (distanceInMeters: number): number => {
    const baseRate = 2.5; // Base fare in dollars
    const perKmRate = 1.5; // Rate per kilometer
    const distanceInKm = distanceInMeters / 1000;
    return Math.round((baseRate + distanceInKm * perKmRate) * 100) / 100;
  };

  const createRideRequest = async () => {
    if (
      !newRide.pickup ||
      !newRide.dropoff ||
      !newRide.distance ||
      !newRide.fare
    )
      return;

    try {
      const data = await rideAPI.createRide(newRide);

      console.log(data);
      setActiveRides((prev) => [data.ride, ...prev]);
      joinPassengerRoom(data.ride._id);

      // Reset form and map
      setNewRide({
        pickup: "",
        dropoff: "",
        distance: "",
        fare: "",
        trafficLevel: "low",
      });
      setPickupLocation(null);
      setDropoffLocation(null);
      setIsSelectingPickup(true);
    } catch (error) {
      console.error("Error creating ride:", error);
    }
  };

  const resetLocations = () => {
    setPickupLocation(null);
    setDropoffLocation(null);
    setIsSelectingPickup(true);
    setRouteCoordinates([]);
    setNewRide({
      pickup: "",
      dropoff: "",
      distance: "",
      fare: "",
      trafficLevel: "low",
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex py-2 space-x-2 bg-white items-center justify-center">
      <FaRegUser size={25} />
      <h1 className="text-3xl font-bold text-center py-3 px-4 rounded-3xl  w-fit">Passenger Dashboard</h1>
      </div>
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-xl font-semibold mb-4">Select Locations</h2>
              <div className="w-full h-[500px] rounded-lg overflow-hidden">
                <MapContainer
                  center={[defaultCenter.lat, defaultCenter.lng]}
                  zoom={13}
                  className="w-full h-full"
                >
                  <Polyline positions={routeCoordinates} color="blue" weight={5} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarkers
                    isSelectingPickup={isSelectingPickup}
                    setIsSelectingPickup={setIsSelectingPickup}
                    pickupLocation={pickupLocation}
                    setPickupLocation={setPickupLocation}
                    dropoffLocation={dropoffLocation}
                    setDropoffLocation={setDropoffLocation}
                    calculateRoute={calculateRoute}
                  />
                </MapContainer>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Ride Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pickup Location
                  </label>
                  <div className="mt-1 flex items-center">
                    <MapPin className="h-5 w-5 text-green-500 mr-2" />
                    <input
                      type="text"
                      value={newRide.pickup}
                      readOnly
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Click on map to select pickup"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dropoff Location
                  </label>
                  <div className="mt-1 flex items-center">
                    <Navigation className="h-5 w-5 text-red-500 mr-2" />
                    <input
                      type="text"
                      value={newRide.dropoff}
                      readOnly
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Click on map to select dropoff"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Distance
                  </label>
                  <div className="mt-1 flex items-center">
                    <Car className="h-5 w-5 text-gray-500 mr-2" />
                    <input
                      type="text"
                      value={newRide.distance}
                      readOnly
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estimated Fare
                  </label>
                  <div className="mt-1 flex items-center">
                    <span className="h-5 w-5 text-gray-500 mr-2">$</span>
                    <input
                      type="text"
                      value={newRide.fare}
                      readOnly
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={createRideRequest}
                    disabled={!newRide.pickup || !newRide.dropoff}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Request Ride
                  </button>
                  <button
                    onClick={resetLocations}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>
                  Click on the map to select your pickup location (green marker)
                </li>
                <li>
                  Click again to select your dropoff location (red marker)
                </li>
                <li>Review the calculated route and estimated fare</li>
                <li>Click "Request Ride" to create your ride request</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Active Rides Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Your Ride Requests</h2>
          <div className="grid gap-4">
            {activeRides.map((ride) => (
              <div key={ride._id} className="border p-4 rounded-lg">
                <h3 className="font-semibold">Ride #{ride._id}</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    From: {ride.pickup} | To: {ride.dropoff}
                  </p>
                  <p className="text-sm text-gray-600">
                    Distance: {ride.distance}km | Fare: ₹{ride.fare}
                  </p>
                  <p className="text-sm text-gray-600">
                    Traffic Level:{" "}
                    {ride.trafficLevel.charAt(0).toUpperCase() +
                      ride.trafficLevel.slice(1)}
                  </p>
                  <p
                    className={`text-sm mt-2 ${
                      ride.status === "pending"
                        ? "text-yellow-600"
                        : ride.status === "accepted"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Status:{" "}
                    {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                  </p>
                  {ride.driver && (
                    <p className="text-sm text-green-600 mt-1">
                      Driver: {ride.driver.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {activeRides.length === 0 && (
              <p className="text-gray-500 text-center">No ride requests yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
