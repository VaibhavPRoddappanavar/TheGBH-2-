const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  preferences: {
    maxTripDistance: {
      type: Number,
      default: 10
    },
    minimumFare: {
      type: Number,
      default: 100
    },
    avoidTraffic: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'available'
  },
  currentLocation: {
    type: String,
    default: null
  },
  currentRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Driver', driverSchema);
