import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Load seeded 500 users and 50 target seats
const users = JSON.parse(open('./k6_users.json'));
const config = JSON.parse(open('./k6_config.json'));

const showtimeId = config.showtimeId;
const targetSeats = config.seats; // exactly 50 seats

// Custom Metrics
const successfulHolds = new Counter('successful_holds');
const conflictRejections = new Counter('conflict_rejections_409');
const waitingRoomQueued = new Counter('waiting_room_queued_429');
const rateLimitThrottled = new Counter('rate_limited_429');
const unhandledErrors = new Counter('unhandled_errors_5xx');
const holdResponseDuration = new Trend('hold_response_duration');

export const options = {
  scenarios: {
    traffic_surge: {
      executor: 'per-vu-iterations',
      vus: 500,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    // Zero 500 internal server errors allowed: server must stay up under surge
    unhandled_errors_5xx: ['count==0'],
    // 95% of requests handled within 2000ms
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  // Each VU (1..500) gets its dedicated authenticated user credentials
  const vuIndex = (__VU - 1) % users.length;
  const user = users[vuIndex];

  // Each VU targets 1 of the 50 contested seats
  // This causes 10 concurrent users to compete for each seat simultaneously!
  const seatIndex = Math.floor(Math.random() * targetSeats.length);
  const targetSeat = targetSeats[seatIndex];

  const url = 'http://localhost:4000/api/v1/payments/hold';
  const payload = JSON.stringify({
    showtimeId: showtimeId,
    seatIds: [targetSeat.id]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`,
    },
    timeout: '10s'
  };

  const startTime = Date.now();
  const res = http.post(url, payload, params);
  const duration = Date.now() - startTime;
  holdResponseDuration.add(duration);

  // Track outcome
  if (res.status === 200 || res.status === 201) {
    successfulHolds.add(1);
    check(res, {
      'hold succeeded (200)': (r) => r.status === 200 || r.status === 201,
      'hold payload valid': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.heldSeatsCount === 1;
        } catch (_) {
          return false;
        }
      }
    });
  } else if (res.status === 409) {
    // Expected: Another concurrent VU acquired the seat first
    conflictRejections.add(1);
    check(res, {
      'seat conflict properly handled with 409': (r) => r.status === 409,
    });
  } else if (res.status === 429) {
    // Waiting room or Rate limiter active
    try {
      const body = JSON.parse(res.body);
      if (body.error && body.error.code === 'WAITING_ROOM_REQUIRED') {
        waitingRoomQueued.add(1);
      } else {
        rateLimitThrottled.add(1);
      }
    } catch (_) {
      rateLimitThrottled.add(1);
    }
  } else if (res.status >= 500) {
    unhandledErrors.add(1);
  }
}
