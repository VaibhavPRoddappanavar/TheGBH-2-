import { useState, useEffect } from 'react';
import { rideAPI } from '../../services/api';
import { getSocket, joinPassengerRoom } from '../../services/socketService';

export default function PassengerDashboard() {
  const [newRide, setNewRide] = useState({
    pickup: '',
    dropoff: '',
    distance: '',
    fare: '',
    trafficLevel: 'low'
  });

  const [activeRides, setActiveRides] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const socket = getSocket();

    // Load active rides
    loadActiveRides();

    // Socket event listeners
    socket.on('rideStatusUpdated', (updatedRide) => {
      setActiveRides(prev =>
        prev.map(ride =>
          ride._id === updatedRide._id ? updatedRide : ride
        )
      );
    });

    return () => {
      socket.off('rideStatusUpdated');
    };
  }, []);

  const loadActiveRides = async () => {
    try {
      const data = await rideAPI.getAllRides();
      setActiveRides(data);
      // Join socket rooms for each ride
      data.forEach(ride => joinPassengerRoom(ride._id));
    } catch (error) {
      console.error('Error loading rides:', error);
    }
  };

  const createRide = async () => {
    if (!newRide.pickup || !newRide.dropoff || !newRide.distance || !newRide.fare) return;

    try {
      const data = await rideAPI.createRide(newRide);
      setActiveRides(prev => [data.ride, ...prev]);
      joinPassengerRoom(data.ride._id);

      // Reset form
      setNewRide({
        pickup: '',
        dropoff: '',
        distance: '',
        fare: '',
        trafficLevel: 'low'
      });
    } catch (error) {
      console.error('Error creating ride:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Request a Ride</h1>

        {/* Create Ride Request Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">New Ride Request</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Pickup Location"
              value={newRide.pickup}
              onChange={(e) => setNewRide({...newRide, pickup: e.target.value})}
              className="p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Dropoff Location"
              value={newRide.dropoff}
              onChange={(e) => setNewRide({...newRide, dropoff: e.target.value})}
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Distance (km)"
              value={newRide.distance}
              onChange={(e) => setNewRide({...newRide, distance: e.target.value})}
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Fare (₹)"
              value={newRide.fare}
              onChange={(e) => setNewRide({...newRide, fare: e.target.value})}
              className="p-2 border rounded"
            />
            <select
              value={newRide.trafficLevel}
              onChange={(e) => setNewRide({...newRide, trafficLevel: e.target.value})}
              className="p-2 border rounded"
            >
              <option value="low">Low Traffic</option>
              <option value="medium">Medium Traffic</option>
              <option value="high">High Traffic</option>
            </select>
            <button
              onClick={createRide}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Create Ride Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
