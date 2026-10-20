const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redis = require('../src/config/redis');

const JWT_SECRET = process.env.JWT_SECRET || 'matinee_development_jwt_secret_key_84920491823';
const NUM_USERS = 500;
const NUM_SEATS = 50;

async function setupLoadTest() {
  console.log('[Setup Load Test] Initializing 500 virtual users and 50 target seats...');

  // 1. Find or create target showtime
  let showtime = await prisma.showtime.findFirst({
    where: { status: 'SCHEDULED' },
    include: { screen: { include: { seats: { orderBy: [{ row: 'asc' }, { col: 'asc' }] } } } }
  });

  if (!showtime) {
    throw new Error('No scheduled showtime found. Please seed showtimes first.');
  }

  console.log(`[Setup Load Test] Target Showtime: ${showtime.id} (${showtime.screen.name})`);

  // Clean up any stale holds in Redis and PostgreSQL for this showtime
  const redisKeys = await redis.keys(`hold:${showtime.id}:*`);
  if (redisKeys.length > 0) {
    await redis.del(...redisKeys);
    console.log(`[Setup Load Test] Cleaned ${redisKeys.length} stale Redis hold keys.`);
  }

  // Clear waiting room
  await redis.del(`waiting_room:active:${showtime.id}`);
  await redis.del(`waiting_room:queue:${showtime.id}`);

  // Clear rate limit keys for clean load test run
  const rateLimitKeys = await redis.keys('ratelimit:*');
  if (rateLimitKeys.length > 0) {
    await redis.del(...rateLimitKeys);
    console.log(`[Setup Load Test] Cleared ${rateLimitKeys.length} rate limit keys.`);
  }

  await prisma.seatHold.updateMany({
    where: { showtimeId: showtime.id, status: 'HELD' },
    data: { status: 'RELEASED' }
  });

  // Pick exactly 50 available seats (unbooked)
  const bookedSeats = await prisma.bookingSeat.findMany({
    where: { showtimeId: showtime.id }
  });
  const bookedSeatIds = new Set(bookedSeats.map(b => b.seatId));

  const targetSeats = showtime.screen.seats
    .filter(s => !bookedSeatIds.has(s.id))
    .slice(0, NUM_SEATS)
    .map(s => ({
      id: s.id,
      label: s.seatLabel
    }));

  if (targetSeats.length < NUM_SEATS) {
    throw new Error(`Screen only has ${targetSeats.length} available seats, but ${NUM_SEATS} required.`);
  }

  console.log(`[Setup Load Test] Selected ${targetSeats.length} seats (from ${targetSeats[0].label} to ${targetSeats[targetSeats.length - 1].label})`);

  // 2. Seed 500 test users in PostgreSQL with authentic bcrypt cost factor 12
  const defaultPasswordHash = bcrypt.hashSync('LoadTestPass123!', 12);
  const usersToCreate = [];
  for (let i = 1; i <= NUM_USERS; i++) {
    usersToCreate.push({
      email: `loadtest_vu_${i}@matinee.local`,
      name: `Virtual User ${i}`,
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER'
    });
  }

  // Batch create users
  await prisma.user.createMany({
    data: usersToCreate,
    skipDuplicates: true
  });

  const createdUsers = await prisma.user.findMany({
    where: {
      email: { startsWith: 'loadtest_vu_' }
    },
    take: NUM_USERS,
    orderBy: { email: 'asc' }
  });

  console.log(`[Setup Load Test] ${createdUsers.length} test users confirmed in PostgreSQL.`);

  // 3. Generate JWT tokens for all 500 VUs
  const vuTokens = createdUsers.map(u => {
    const token = jwt.sign(
      { sub: u.id, email: u.email, role: u.role, name: u.name },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    return {
      userId: u.id,
      email: u.email,
      token
    };
  });

  // 4. Save to files for k6 to consume
  const testsDir = path.join(__dirname);
  fs.writeFileSync(
    path.join(testsDir, 'k6_users.json'),
    JSON.stringify(vuTokens, null, 2)
  );
  fs.writeFileSync(
    path.join(testsDir, 'k6_config.json'),
    JSON.stringify({
      showtimeId: showtime.id,
      seats: targetSeats
    }, null, 2)
  );

  console.log('[Setup Load Test] Successfully exported k6_users.json and k6_config.json!');
}

setupLoadTest()
  .catch(err => {
    console.error('[Setup Load Test Error]:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });
