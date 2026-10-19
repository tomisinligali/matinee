const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding initial pilot cinema, screens, seats, movie, and showtimes...');

  // 1. Cinema
  let cinema = await prisma.cinema.findFirst({ where: { name: 'Silverbird Galleria (Pilot)' } });
  if (!cinema) {
    cinema = await prisma.cinema.create({
      data: {
        name: 'Silverbird Galleria (Pilot)',
        location: 'Victoria Island, Lagos',
        status: 'ACTIVE'
      }
    });
  }

  // 2. Screen
  let screen = await prisma.screen.findFirst({ where: { cinemaId: cinema.id, name: 'Screen 1 - IMAX Laser' } });
  if (!screen) {
    screen = await prisma.screen.create({
      data: {
        cinemaId: cinema.id,
        name: 'Screen 1 - IMAX Laser',
        capacity: 300
      }
    });

    // Generate 300 seats: 15 Rows (A to O) x 20 seats
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
    const seatData = [];

    for (let r = 0; r < rows.length; r++) {
      const rowChar = rows[r];
      for (let c = 1; c <= 20; c++) {
        const isWheelchair = r === 0 && (c <= 3 || c >= 18);
        seatData.push({
          screenId: screen.id,
          row: rowChar,
          col: c,
          seatLabel: `${rowChar}${c}`,
          seatType: isWheelchair ? 'WHEELCHAIR' : 'STANDARD'
        });
      }
    }

    await prisma.seat.createMany({ data: seatData, skipDuplicates: true });
    console.log(`Created 300 seats for screen ${screen.id}`);
  }

  // 3. Movie
  let movie = await prisma.movie.findFirst({ where: { title: 'Dune: Part Two' } });
  if (!movie) {
    movie = await prisma.movie.create({
      data: {
        tmdbId: 693134,
        title: 'Dune: Part Two',
        overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
        posterPath: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        runtimeMinutes: 166
      }
    });
  }

  // 4. Showtime
  let showtime = await prisma.showtime.findFirst({
    where: { screenId: screen.id, movieId: movie.id, status: 'SCHEDULED' }
  });

  if (!showtime) {
    const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const endTime = new Date(startTime.getTime() + 166 * 60 * 1000);

    showtime = await prisma.showtime.create({
      data: {
        screenId: screen.id,
        movieId: movie.id,
        startTime,
        endTime,
        priceMinor: 450000, // ₦4,500.00
        currency: 'NGN',
        status: 'SCHEDULED'
      }
    });
    console.log(`Created showtime ${showtime.id} at ${startTime.toISOString()}`);
  }

  console.log('Seed completed successfully!');
  console.log({
    cinemaId: cinema.id,
    screenId: screen.id,
    movieId: movie.id,
    showtimeId: showtime.id
  });
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
