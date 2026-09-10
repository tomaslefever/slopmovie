import { NextResponse } from 'next/server';
import { countVisitsByDayFromDb, countActiveViewersFromDb } from '@/lib/supabase/db';

export async function GET() {
  const [visitsByDay, activeViewers] = await Promise.all([
    countVisitsByDayFromDb(14),
    countActiveViewersFromDb(5)
  ]);

  const totalVisits = visitsByDay.reduce((sum, d) => sum + d.count, 0);
  const todayVisits = visitsByDay.find(d => d.date === new Date().toISOString().slice(0, 10))?.count || 0;

  return NextResponse.json({
    visitsByDay,
    totalVisits,
    todayVisits,
    activeViewers: activeViewers ?? 0
  });
}
