import { Router } from "express";
import { db, eventsTable, usersTable, registrationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/admin/stats", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const [totalUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [totalEvents] = await db.select({ count: sql<number>`count(*)::int` }).from(eventsTable);
  const [activeRegistrations] = await db.select({ count: sql<number>`count(*)::int` }).from(registrationsTable);
  const [upcomingEvents] = await db.select({ count: sql<number>`count(*)::int` })
    .from(eventsTable).where(eq(eventsTable.status, "upcoming"));
  const [pendingApprovals] = await db.select({ count: sql<number>`count(*)::int` })
    .from(eventsTable).where(eq(eventsTable.approvalStatus, "pending"));

  const eventsByCategory = await db.select({
    category: eventsTable.category,
    count: sql<number>`count(*)::int`,
  }).from(eventsTable).groupBy(eventsTable.category).orderBy(sql`count(*) desc`);

  const recentRegs = await db.select({
    type: sql<string>`'registration'`,
    description: sql<string>`'User registered for ' || ${eventsTable.title}`,
    createdAt: registrationsTable.registeredAt,
  }).from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .orderBy(sql`${registrationsTable.registeredAt} desc`).limit(10);

  res.json({
    totalUsers: totalUsers?.count ?? 0,
    totalEvents: totalEvents?.count ?? 0,
    activeRegistrations: activeRegistrations?.count ?? 0,
    upcomingEvents: upcomingEvents?.count ?? 0,
    pendingApprovals: pendingApprovals?.count ?? 0,
    eventsByCategory,
    recentActivity: recentRegs.map(r => ({
      type: r.type,
      description: r.description,
      createdAt: r.createdAt,
    })),
  });
});

router.get("/admin/events/pending", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const events = await db.select().from(eventsTable)
    .where(eq(eventsTable.approvalStatus, "pending"))
    .orderBy(sql`${eventsTable.createdAt} desc`);

  const orgIds = [...new Set(events.map(e => e.organizerId))];
  const organizers = orgIds.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
        .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(orgIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const orgMap = new Map(organizers.map(o => [o.id, o.name]));

  res.json(events.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date,
    venue: e.venue,
    category: e.category,
    capacity: e.capacity,
    registrationDeadline: e.registrationDeadline,
    status: e.status,
    approvalStatus: e.approvalStatus,
    bannerUrl: e.bannerUrl,
    organizerId: e.organizerId,
    organizerName: orgMap.get(e.organizerId) ?? null,
    registrationCount: 0,
    isRegistered: false,
    createdAt: e.createdAt,
  })));
});

export default router;
