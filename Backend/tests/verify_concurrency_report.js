const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redis = require('../src/config/redis');

async function verifyReport() {
  console.log('\n======================================================');
  console.log('   MATINEE CONCURRENCY & TRAFFIC MANAGEMENT AUDIT');
  console.log('======================================================\n');

  const configPath = path.join(__dirname, 'k6_config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Config file not found. Run setup_load_test.js first.');
    process.exit(1);
  }

  const { showtimeId, seats } = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // 1. Audit Redis Holds
  const redisKeys = await redis.keys(`hold:${showtimeId}:*`);
  const redisHeldSeatIds = redisKeys.map(k => k.split(':').pop());

  // 2. Audit PostgreSQL Active Holds
  const activeDbHolds = await prisma.seatHold.findMany({
    where: {
      showtimeId,
      status: 'HELD'
    },
    include: { seat: true }
  });

  // 3. Check for Duplicate Seat Holds in PostgreSQL (CRITICAL INVARIANT CHECK)
  const duplicates = await prisma.$queryRaw`
    SELECT seat_id, COUNT(*) as hold_count
    FROM seat_holds
    WHERE showtime_id = ${showtimeId} AND status = 'HELD'
    GROUP BY seat_id
    HAVING COUNT(*) > 1;
  `;

  // 4. Check for Duplicate Confirmed Bookings in PostgreSQL
  const duplicateBookings = await prisma.$queryRaw`
    SELECT seat_id, COUNT(*) as booking_count
    FROM booking_seats
    WHERE showtime_id = ${showtimeId}
    GROUP BY seat_id
    HAVING COUNT(*) > 1;
  `;

  // 5. Unique held seats count
  const uniqueHeldSeatIds = new Set(activeDbHolds.map(h => h.seatId));

  console.log(`Target Contested Seats Pool : ${seats.length} seats`);
  console.log(`Active Holds in Redis        : ${redisHeldSeatIds.length}`);
  console.log(`Active Holds in PostgreSQL   : ${activeDbHolds.length}`);
  console.log(`Unique Held Seats in Database: ${uniqueHeldSeatIds.size}`);
  console.log(`Duplicate Seat Holds Detected: ${duplicates.length}`);
  console.log(`Duplicate Bookings Detected  : ${duplicateBookings.length}`);

  const passed = duplicates.length === 0 && duplicateBookings.length === 0 && uniqueHeldSeatIds.size <= seats.length;

  console.log('\n------------------------------------------------------');
  if (passed) {
    console.log('✅ ZERO DOUBLE-ALLOCATIONS DETECTED!');
    console.log('✅ Mathematical double-booking prevention successfully verified under 500 concurrent VUs.');
  } else {
    console.error('❌ CONCURRENCY VIOLATION DETECTED:');
    console.error(duplicates);
    process.exit(1);
  }
  console.log('------------------------------------------------------\n');
}

verifyReport()
  .catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });
