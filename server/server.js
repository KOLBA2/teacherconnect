require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pool = require('./config/db');
const { sendDbError } = require('./utils/dbErrors');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const slotRoutes = require('./routes/slotRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const bookingRequestRoutes = require('./routes/bookingRequestRoutes');
const referralRoutes = require('./routes/referralRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const { startVipSweepScheduler } = require('./utils/vipSweep');

const app = express();

// დაშვებული დომენების სია
const allowedOrigins = [
  'https://teacherconnect-one.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

const LOCAL_DEV_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // 1. თუ მოთხოვნა სერვერიდანვეა ან Postman-იდან (!origin) -> გაატარე
      if (!origin) return callback(null, true);

      // 2. თუ ლოკალური დეველოპმენტია (localhost) -> გაატარე
      if (LOCAL_DEV_ORIGIN_REGEX.test(origin)) return callback(null, true);

      // 3. თუ დაშვებულ სიას ემთხვევა -> გაატარე
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // 4. თუ Vercel-ის ნებისმიერი დომენია (.vercel.app) -> გაატარე
      if (origin.endsWith('.vercel.app')) return callback(null, true);

      return callback(new Error('არ არის დაშვებული CORS პოლიტიკით'));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    res.json({ status: 'ok', serverTime: result.rows[0].server_time });
  } catch (err) {
    console.error('Database health check failed:', err.message);
    return sendDbError(res, err, 'Database connection failed');
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/booking-requests', bookingRequestRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/teachers', teacherRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'მოთხოვნილი მისამართი ვერ მოიძებნა' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'ფაილის ზომა აღემატება დასაშვებ ლიმიტს (5MB)'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'ატვირთული ფაილების რაოდენობა აღემატება დასაშვებ ლიმიტს'
        : err.message;
    return res.status(400).json({ message });
  }
  if (err) {
    console.error('Unhandled request error:', err);
    return res.status(400).json({ message: err.message || 'მოთხოვნის დამუშავება ვერ მოხერხდა' });
  }
  return next();
});

const PORT = process.env.PORT || 5050;
let server;

const MAX_LISTEN_RETRIES = 12;
const LISTEN_RETRY_MS = 500;

function startServer(attempt = 0) {
  server = app.listen(PORT, () => {
    console.log(`TeacherConnection API server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (attempt < MAX_LISTEN_RETRIES) {
        if (attempt === 0) {
          console.warn(`Port ${PORT} busy (previous instance still shutting down) — waiting for it to free up...`);
        }
        setTimeout(() => startServer(attempt + 1), LISTEN_RETRY_MS);
        return;
      }
      console.error(
        `\nPort ${PORT} is still in use after ${MAX_LISTEN_RETRIES} retries — a leftover ` +
          `process is holding it.\nStop it, then restart:\n` +
          `  PowerShell: Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ` +
          `Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }\n`,
      );
      process.exit(1);
    }
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}

startServer();

// Automatic VIP/VIP+ expiration engine: periodically NULL out any lapsed
// premium window in bulk (the persistent-process equivalent of a cron job).
// Access is additionally enforced at read time via NOW() comparisons.
const stopVipSweep = startVipSweepScheduler();

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — closing server and draining DB pool...`);
  const forceExit = setTimeout(() => process.exit(0), 4000);
  forceExit.unref();
  try {
    stopVipSweep();
    await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
    await pool.end();
  } catch (err) {
    console.error('Error during shutdown:', err.message);
  }
  process.exit(0);
}

['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((sig) => process.once(sig, () => shutdown(sig)));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});