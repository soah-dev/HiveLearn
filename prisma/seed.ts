import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const badges = [
  { name: "First Steps", description: "Complete your first assignment", icon: "🎯", criteria: "first_assignment" },
  { name: "Perfect Score", description: "Score 100% on any assignment", icon: "💯", criteria: "perfect_score" },
  { name: "Week Warrior", description: "7-day completion streak", icon: "🔥", criteria: "streak_7" },
  { name: "Monthly Master", description: "30-day completion streak", icon: "⚡", criteria: "streak_30" },
  { name: "Math Whiz", description: "Complete 10 math assignments with 80%+", icon: "🧮", criteria: "mastery_math" },
  { name: "Science Star", description: "Complete 10 science assignments with 80%+", icon: "🔬", criteria: "mastery_science" },
  { name: "Bookworm", description: "Complete 10 reading assignments with 80%+", icon: "📚", criteria: "mastery_reading" },
  { name: "History Buff", description: "Complete 10 history assignments with 80%+", icon: "🏛️", criteria: "mastery_history" },
  { name: "Wordsmith", description: "Complete 10 English assignments with 80%+", icon: "✍️", criteria: "mastery_english" },
  { name: "Explorer", description: "Complete 10 geography assignments with 80%+", icon: "🌍", criteria: "mastery_geography" },
  { name: "Speed Demon", description: "Score 90%+ on a timed quiz with 50%+ time left", icon: "⚡", criteria: "speed_demon" },
  { name: "Hardmode Hero", description: "Complete 10 hard assignments with 80%+", icon: "💪", criteria: "hardmode_hero" },
  { name: "Century Club", description: "Earn 1000 total points", icon: "🏆", criteria: "points_1000" },
  { name: "All-Rounder", description: "Complete assignments in 5 different subjects", icon: "🌟", criteria: "all_rounder" },
];

async function main() {
  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
  }
  console.log('Seeded badges');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
