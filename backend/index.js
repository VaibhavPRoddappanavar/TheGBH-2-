const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Enable CORS for Express (Allow Any Origin)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());

// Enable CORS for Socket.IO (Allow Any Origin)
const io = new Server(httpServer, {
  cors: {
    origin: "*",  // Allow requests from any origin
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinDriverRoom', (driverId) => {
    socket.join(`driver_${driverId}`);
  });

  socket.on('joinPassengerRoom', (rideId) => {
    socket.join(`ride_${rideId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to route handlers
app.set('io', io);

// Routes
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/rides', require('./routes/rideRoutes'));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
