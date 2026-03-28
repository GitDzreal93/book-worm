import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/stats — returns cumulative and daily reading statistics */
export async function GET() {
  // Cumulative stats
  const [
    totalBooks,
    completedBooks,
    totalSessions,
    totalVocabularyWords,
    totalHighlights,
  ] = await Promise.all([
    prisma.book.count(),
    prisma.book.count({ where: { readPercentage: { gte: 100 } } }),
    prisma.readingSession.count(),
    prisma.vocabularyWord.count(),
    prisma.highlight.count(),
  ]);

  // Total reading time in minutes
  const sessions = await prisma.readingSession.findMany({
    select: { startedAt: true, endedAt: true },
  });

  let totalReadingMinutes = 0;
  for (const s of sessions) {
    if (s.endedAt) {
      totalReadingMinutes += (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
    }
  }

  // Total word count across all books
  const books = await prisma.book.findMany({
    select: { totalParagraphs: true },
  });
  const totalWords = books.reduce((sum, b) => sum + b.totalParagraphs, 0);

  // Daily stats (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSessions = await prisma.readingSession.findMany({
    where: {
      endedAt: { gte: thirtyDaysAgo },
    },
    orderBy: { startedAt: "asc" },
  });

  // Group by date
  const dailyMap = new Map<string, { date: string; minutes: number; sessions: number }>();
  for (const s of recentSessions) {
    const dateKey = s.startedAt.toISOString().slice(0, 10);
    const existing = dailyMap.get(dateKey);
    const minutes = s.endedAt
      ? (s.endedAt.getTime() - s.startedAt.getTime()) / 60000
      : 0;
    if (existing) {
      existing.minutes += minutes;
      existing.sessions += 1;
    } else {
      dailyMap.set(dateKey, { date: dateKey, minutes, sessions: 1 });
    }
  }

  const daily = Array.from(dailyMap.values());

  // Streak: consecutive days with at least one session
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateKey = checkDate.toISOString().slice(0, 10);
    if (dailyMap.has(dateKey)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // Today might not have a session yet, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      // Don't break, check if yesterday had a session
      const yesterdayKey = checkDate.toISOString().slice(0, 10);
      if (!dailyMap.has(yesterdayKey)) break;
      // If yesterday had one, we already set checkDate back, continue
    } else {
      break;
    }
  }

  return NextResponse.json({
    overview: {
      totalBooks,
      completedBooks,
      totalReadingMinutes: Math.round(totalReadingMinutes),
      totalWords,
      totalVocabularyWords,
      totalHighlights,
      currentStreak: streak,
    },
    daily,
  });
}
