import { useState, useEffect } from 'react';
import { driverAPI, rideAPI } from '../../services/api';
import { getSocket, joinDriverRoom } from '../../services/socketService';

export default function DriverDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [rideRequests, setRideRequests] = useState([]);
  const [newDriver, setNewDriver] = useState({
    name: '',
    preferences: {
      maxTripDistance: 10,
      minimumFare: 100,
      avoidTraffic: false
    }
  });

  useEffect(() => {
    // Initialize socket connection
    const socket = getSocket();

    // Load initial data
    loadDrivers();
    loadPendingRides();

    // Socket event listeners
    socket.on('newRideRequest', (ride) => {
      setRideRequests(prev => [ride, ...prev]);
    });

    socket.on('rideStatusUpdated', (updatedRide) => {
      setRideRequests(prev => 
        prev.map(ride => 
          ride._id === updatedRide._id ? updatedRide : ride
        )
      );
    });

    return () => {
      socket.off('newRideRequest');
      socket.off('rideStatusUpdated');
    };
  }, []);

  const loadDrivers = async () => {
    try {
      const data = await driverAPI.getAllDrivers();
      setDrivers(data);
      // Join socket rooms for each driver
      data.forEach(driver => joinDriverRoom(driver._id));
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadPendingRides = async () => {
    try {
      const data = await rideAPI.getPendingRides();
      setRideRequests(data);
    } catch (error) {
      console.error('Error loading rides:', error);
    }
  };

  const addDriver = async () => {
    if (!newDriver.name) return;

    try {
      const data = await driverAPI.addDriver(newDriver);
      setDrivers(prev => [...prev, data]);
      joinDriverRoom(data._id);

      // Reset form
      setNewDriver({
        name: '',
        preferences: {
          maxTripDistance: 10,
          minimumFare: 100,
          avoidTraffic: false
        }
      });
    } catch (error) {
      console.error('Error adding driver:', error);
    }
  };

  const deleteDriver = async (driverId) => {
    try {
      await driverAPI.deleteDriver(driverId);
      setDrivers(prev => prev.filter(driver => driver._id !== driverId));
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewDriver(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [name]: type === 'checkbox' ? checked : Number(value)
      }
    }));
  };

  const acceptRide = async (rideId, driverId) => {
    try {
      const data = await rideAPI.acceptRide(rideId, driverId);
      
      // Update ride requests
      setRideRequests(prev =>
        prev.map(ride =>
          ride._id === rideId ? data.ride : ride
        )
      );

      // Update driver status
      setDrivers(prev =>
        prev.map(driver =>
          driver._id === driverId ? data.driver : driver
        )
      );
    } catch (error) {
      console.error('Error accepting ride:', error);
    }
  };

  const rejectRide = async (rideId, driverId) => {
    try {
      const data = await rideAPI.rejectRide(rideId, driverId);
      setRideRequests(prev =>
        prev.map(ride =>
          ride._id === rideId ? data : ride
        )
      );
    } catch (error) {
      console.error('Error rejecting ride:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Driver Management</h1>
        
        {/* Add Driver Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Driver</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              placeholder="Driver Name"
              value={newDriver.name}
              onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
              className="p-2 border rounded"
            />
            <input
              type="number"
              name="maxTripDistance"
              placeholder="Max Trip Distance (km)"
              value={newDriver.preferences.maxTripDistance}
              onChange={handlePreferenceChange}
              className="p-2 border rounded"
            />
            <input
              type="number"
              name="minimumFare"
              placeholder="Minimum Fare (₹)"
              value={newDriver.preferences.minimumFare}
              onChange={handlePreferenceChange}
              className="p-2 border rounded"
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                name="avoidTraffic"
                checked={newDriver.preferences.avoidTraffic}
                onChange={handlePreferenceChange}
                className="mr-2"
              />
              <label>Avoid Traffic</label>
            </div>
            <button
              onClick={addDriver}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add Driver
            </button>
          </div>
        </div>

        {/* Active Drivers List */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Active Drivers</h2>
          <div className="grid gap-4">
            {drivers.map(driver => (
              <div key={driver._id} className="border p-4 rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{driver.name}</h3>
                  <p className="text-sm text-gray-600">
                    Max Distance: {driver.preferences.maxTripDistance}km | 
                    Min Fare: ₹{driver.preferences.minimumFare} |
                    Avoid Traffic: {driver.preferences.avoidTraffic ? 'Yes' : 'No'}
                  </p>
                  <p className={`text-sm ${
                    driver.status === 'available' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    Status: {driver.status}
                  </p>
                </div>
                <button
                  onClick={() => deleteDriver(driver._id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
            {drivers.length === 0 && (
              <p className="text-gray-500 text-center">No drivers added yet</p>
            )}
          </div>
        </div>

        {/* Available Rides Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Available Ride Requests</h2>
          <div className="grid gap-4">
            {rideRequests.map(ride => (
              <div key={ride._id} className="border p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">Ride #{ride._id}</h3>
                    <p className="text-sm text-gray-600">
                      From: {ride.pickup} | To: {ride.dropoff}
                    </p>
                    <p className="text-sm text-gray-600">
                      Distance: {ride.distance}km | Fare: ₹{ride.fare}
                    </p>
                    {ride.status === 'accepted' && (
                      <p className="text-green-600">
                        Accepted by: {drivers.find(d => d._id === ride.driver)?.name}
                      </p>
                    )}
                  </div>
                  {ride.status === 'pending' && (
                    <div className="flex gap-2">
                      {drivers
                        .filter(driver => 
                          driver.status === 'available' && 
                          !ride.rejectedBy?.includes(driver._id) &&
                          ride.distance <= driver.preferences.maxTripDistance &&
                          ride.fare >= driver.preferences.minimumFare &&
                          (!driver.preferences.avoidTraffic || ride.trafficLevel !== 'high')
                        )
                        .map(driver => (
                          <div key={driver._id} className="flex gap-2">
                            <button
                              onClick={() => acceptRide(ride._id, driver._id)}
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            >
                              Accept as {driver.name}
                            </button>
                            <button
                              onClick={() => rejectRide(ride._id, driver._id)}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                            >
                              Reject
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {rideRequests.length === 0 && (
              <p className="text-gray-500 text-center">No ride requests available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
