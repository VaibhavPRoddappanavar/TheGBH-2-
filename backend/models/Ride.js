const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  pickup: {
    type: String,
    required: true
  },
  dropoff: {
    type: String,
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  fare: {
    type: Number,
    required: true
  },
  trafficLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'cancelled'],
    default: 'pending'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  rejectedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Ride', rideSchema);
