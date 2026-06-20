import { Router } from "express";
import { db, eventsTable, usersTable, registrationsTable } from "@workspace/db";
import { eq, ilike, sql, and, gte, lte, desc, asc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

const EventInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string(),
  venue: z.string().min(1),
  category: z.string().min(1),
  capacity: z.number().int().positive(),
  registrationDeadline: z.string(),
  bannerUrl: z.string().optional(),
});

const EventUpdateSchema = EventInputSchema.partial().extend({
  status: z.enum(["upcoming", "ongoing", "completed"]).optional(),
});

const EventStatusUpdateSchema = z.object({
  approvalStatus: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

function formatEvent(event: any, organizerName: string | null, registrationCount: number, isRegistered: boolean) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    venue: event.venue,
    category: event.category,
    capacity: event.capacity,
    registrationDeadline: event.registrationDeadline,
    status: event.status,
    approvalStatus: event.approvalStatus,
    bannerUrl: event.bannerUrl,
    organizerId: event.organizerId,
    organizerName,
    registrationCount,
    isRegistered,
    createdAt: event.createdAt,
  };
}

router.get("/events", async (req, res): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const offset = (page - 1) * limit;
  const category = req.query.category as string | undefined;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const sortOrder = req.query.sortOrder === "desc" ? desc : asc;

  const conditions: any[] = [eq(eventsTable.approvalStatus, "approved")];
  if (category) conditions.push(eq(eventsTable.category, category));
  if (status) conditions.push(eq(eventsTable.status, status));
  if (search) conditions.push(ilike(eventsTable.title, `%${search}%`));
  if (dateFrom) conditions.push(gte(eventsTable.date, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(eventsTable.date, new Date(dateTo)));

  const whereClause = and(...conditions);

  const [events, countResult, regCounts] = await Promise.all([
    db.select().from(eventsTable).where(whereClause)
      .limit(limit).offset(offset).orderBy(sortOrder(eventsTable.date)),
    db.select({ count: sql<number>`count(*)::int` }).from(eventsTable).where(whereClause),
    db.select({
      eventId: registrationsTable.eventId,
      count: sql<number>`count(*)::int`,
    }).from(registrationsTable).groupBy(registrationsTable.eventId),
  ]);

  const countMap = new Map(regCounts.map(r => [r.eventId, r.count]));
  const organizerIds = [...new Set(events.map(e => e.organizerId))];
  const organizers = organizerIds.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
        .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(organizerIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const orgMap = new Map(organizers.map(o => [o.id, o.name]));

  const total = countResult[0]?.count ?? 0;
  const formattedEvents = events.map(e =>
    formatEvent(e, orgMap.get(e.organizerId) ?? null, countMap.get(e.id) ?? 0, false)
  );
  res.json({ events: formattedEvents, total, page, totalPages: Math.ceil(total / limit) });
});

router.get("/events/recommendations", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const myRegs = await db.select({ eventId: registrationsTable.eventId })
    .from(registrationsTable).where(eq(registrationsTable.userId, userId));
  const myEventIds = myRegs.map(r => r.eventId);

  let categoryQuery: any[] | undefined;
  if (myEventIds.length > 0) {
    const myEvents = await db.select({ category: eventsTable.category }).from(eventsTable)
      .where(sql`${eventsTable.id} = ANY(ARRAY[${sql.join(myEventIds.map(id => sql`${id}`), sql`, `)}]::int[])`);
    const cats = [...new Set(myEvents.map(e => e.category))];
    if (cats.length > 0) {
      categoryQuery = cats;
    }
  }

  const conditions: any[] = [
    eq(eventsTable.approvalStatus, "approved"),
    eq(eventsTable.status, "upcoming"),
  ];
  if (myEventIds.length > 0) {
    conditions.push(sql`${eventsTable.id} != ALL(ARRAY[${sql.join(myEventIds.map(id => sql`${id}`), sql`, `)}]::int[])`);
  }
  if (categoryQuery && categoryQuery.length > 0) {
    conditions.push(sql`${eventsTable.category} = ANY(ARRAY[${sql.join(categoryQuery.map(c => sql`${c}`), sql`, `)}]::text[])`);
  }

  const events = await db.select().from(eventsTable).where(and(...conditions)).limit(6).orderBy(asc(eventsTable.date));
  const regCounts = await db.select({ eventId: registrationsTable.eventId, count: sql<number>`count(*)::int` })
    .from(registrationsTable).groupBy(registrationsTable.eventId);
  const countMap = new Map(regCounts.map(r => [r.eventId, r.count]));
  res.json(events.map(e => formatEvent(e, null, countMap.get(e.id) ?? 0, false)));
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const authHeader = req.headers.authorization;
  let userId: number | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const jwt = await import("jsonwebtoken");
      const secret = process.env.SESSION_SECRET || "fallback_secret_change_me";
      const payload = jwt.default.verify(authHeader.slice(7), secret) as { userId: number };
      userId = payload.userId;
    } catch {}
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const [organizer] = await db.select({ name: usersTable.name, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, event.organizerId)).limit(1);
  const [regCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(registrationsTable).where(eq(registrationsTable.eventId, id));
  let isRegistered = false;
  let registrationId: number | null = null;
  if (userId) {
    const [reg] = await db.select({ id: registrationsTable.id })
      .from(registrationsTable)
      .where(and(eq(registrationsTable.eventId, id), eq(registrationsTable.userId, userId)))
      .limit(1);
    if (reg) { isRegistered = true; registrationId = reg.id; }
  }
  res.json({
    ...formatEvent(event, organizer?.name ?? null, regCount?.count ?? 0, isRegistered),
    organizerEmail: organizer?.email ?? null,
    registrationId,
  });
});

router.post("/events", authenticate, requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const parsed = EventInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { date, registrationDeadline, ...rest } = parsed.data;
  const approvalStatus = req.user!.role === "admin" ? "approved" : "pending";
  const [event] = await db.insert(eventsTable).values({
    ...rest,
    date: new Date(date),
    registrationDeadline: new Date(registrationDeadline),
    organizerId: req.user!.userId,
    approvalStatus,
  }).returning();
  res.status(201).json(formatEvent(event, null, 0, false));
});

router.patch("/events/:id", authenticate, requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Event not found" }); return; }
  if (req.user!.role === "organizer" && existing.organizerId !== req.user!.userId) {
    res.status(403).json({ error: "Not your event" }); return;
  }
  const parsed = EventUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { date, registrationDeadline, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (date) updateData.date = new Date(date);
  if (registrationDeadline) updateData.registrationDeadline = new Date(registrationDeadline);
  const [updated] = await db.update(eventsTable).set(updateData).where(eq(eventsTable.id, id)).returning();
  res.json(formatEvent(updated, null, 0, false));
});

router.delete("/events/:id", authenticate, requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Event not found" }); return; }
  if (req.user!.role === "organizer" && existing.organizerId !== req.user!.userId) {
    res.status(403).json({ error: "Not your event" }); return;
  }
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.status(204).send();
});

router.patch("/events/:id/status", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const parsed = EventStatusUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(eventsTable)
    .set({ approvalStatus: parsed.data.approvalStatus, rejectionReason: parsed.data.rejectionReason })
    .where(eq(eventsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(formatEvent(updated, null, 0, false));
});

router.get("/events/:id/attendees", authenticate, requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id as string);
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  if (req.user!.role === "organizer" && event.organizerId !== req.user!.userId) {
    res.status(403).json({ error: "Not your event" }); return;
  }
  const attendees = await db.select({
    registrationId: registrationsTable.id,
    userId: registrationsTable.userId,
    name: usersTable.name,
    email: usersTable.email,
    registeredAt: registrationsTable.registeredAt,
    attended: registrationsTable.attended,
  }).from(registrationsTable)
    .innerJoin(usersTable, eq(registrationsTable.userId, usersTable.id))
    .where(eq(registrationsTable.eventId, eventId))
    .orderBy(desc(registrationsTable.registeredAt));
  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(registrationsTable).where(eq(registrationsTable.eventId, eventId));
  const total = countResult?.count ?? 0;
  res.json({ attendees, total, page: 1, totalPages: 1 });
});

router.get("/events/:id/analytics", authenticate, requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id as string);
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  if (req.user!.role === "organizer" && event.organizerId !== req.user!.userId) {
    res.status(403).json({ error: "Not your event" }); return;
  }
  const [totalRegs] = await db.select({ count: sql<number>`count(*)::int` })
    .from(registrationsTable).where(eq(registrationsTable.eventId, eventId));
  const [attendedCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(registrationsTable)
    .where(and(eq(registrationsTable.eventId, eventId), eq(registrationsTable.attended, true)));
  const regsByDay = await db.select({
    date: sql<string>`DATE(registered_at)::text`,
    count: sql<number>`count(*)::int`,
  }).from(registrationsTable).where(eq(registrationsTable.eventId, eventId))
    .groupBy(sql`DATE(registered_at)`).orderBy(sql`DATE(registered_at)`);

  const total = totalRegs?.count ?? 0;
  const attended = attendedCount?.count ?? 0;
  res.json({
    eventId,
    totalRegistrations: total,
    capacity: event.capacity,
    attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 0,
    registrationsByDay: regsByDay,
    categoryBreakdown: [{ category: event.category, count: total }],
  });
});

router.get("/organizer/stats", authenticate, requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const organizerId = req.user!.userId;
  const [totalEvents] = await db.select({ count: sql<number>`count(*)::int` })
    .from(eventsTable).where(eq(eventsTable.organizerId, organizerId));
  const [upcomingEvents] = await db.select({ count: sql<number>`count(*)::int` })
    .from(eventsTable).where(and(eq(eventsTable.organizerId, organizerId), eq(eventsTable.status, "upcoming")));
  const [completedEvents] = await db.select({ count: sql<number>`count(*)::int` })
    .from(eventsTable).where(and(eq(eventsTable.organizerId, organizerId), eq(eventsTable.status, "completed")));
  const [pendingApproval] = await db.select({ count: sql<number>`count(*)::int` })
    .from(eventsTable).where(and(eq(eventsTable.organizerId, organizerId), eq(eventsTable.approvalStatus, "pending")));

  const myEvents = await db.select({ id: eventsTable.id }).from(eventsTable)
    .where(eq(eventsTable.organizerId, organizerId));
  const myEventIds = myEvents.map(e => e.id);

  let totalRegistrations = 0;
  let topEvents: any[] = [];
  if (myEventIds.length > 0) {
    const [regsCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(registrationsTable)
      .where(sql`${registrationsTable.eventId} = ANY(ARRAY[${sql.join(myEventIds.map(id => sql`${id}`), sql`, `)}]::int[])`);
    totalRegistrations = regsCount?.count ?? 0;

    const topEventRows = await db.select({
      id: eventsTable.id,
      title: eventsTable.title,
      capacity: eventsTable.capacity,
      count: sql<number>`count(${registrationsTable.id})::int`,
    }).from(eventsTable)
      .leftJoin(registrationsTable, eq(eventsTable.id, registrationsTable.eventId))
      .where(eq(eventsTable.organizerId, organizerId))
      .groupBy(eventsTable.id)
      .orderBy(desc(sql`count(${registrationsTable.id})`))
      .limit(5);
    topEvents = topEventRows.map(e => ({ id: e.id, title: e.title, registrationCount: e.count, capacity: e.capacity }));
  }

  res.json({
    totalEvents: totalEvents?.count ?? 0,
    totalRegistrations,
    upcomingEvents: upcomingEvents?.count ?? 0,
    completedEvents: completedEvents?.count ?? 0,
    pendingApproval: pendingApproval?.count ?? 0,
    topEvents,
  });
});

export default router;
