import { Router } from "express";
import { db, registrationsTable, eventsTable, usersTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";
import QRCode from "qrcode";

const router = Router();

router.post("/events/:id/register", authenticate, async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id as string);
  const userId = req.user!.userId;

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  if (event.approvalStatus !== "approved") { res.status(400).json({ error: "Event is not open for registration" }); return; }
  if (new Date() > event.registrationDeadline) { res.status(400).json({ error: "Registration deadline has passed" }); return; }

  const [regCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(registrationsTable).where(eq(registrationsTable.eventId, eventId));
  if ((regCount?.count ?? 0) >= event.capacity) { res.status(400).json({ error: "Event is at full capacity" }); return; }

  const [existing] = await db.select().from(registrationsTable)
    .where(and(eq(registrationsTable.eventId, eventId), eq(registrationsTable.userId, userId))).limit(1);
  if (existing) { res.status(400).json({ error: "Already registered for this event" }); return; }

  const qrPayload = JSON.stringify({ eventId, userId, timestamp: Date.now() });
  const qrCode = await QRCode.toDataURL(qrPayload);

  const [registration] = await db.insert(registrationsTable).values({
    eventId,
    userId,
    qrCode,
  }).returning();

  res.status(201).json({
    id: registration.id,
    eventId: registration.eventId,
    userId: registration.userId,
    registeredAt: registration.registeredAt,
    attended: registration.attended,
    qrCode: registration.qrCode,
  });
});

router.get("/registrations/my", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const offset = (page - 1) * limit;

  const [registrations, countResult, regCounts] = await Promise.all([
    db.select({
      id: registrationsTable.id,
      eventId: registrationsTable.eventId,
      userId: registrationsTable.userId,
      registeredAt: registrationsTable.registeredAt,
      attended: registrationsTable.attended,
      qrCode: registrationsTable.qrCode,
      event: {
        id: eventsTable.id,
        title: eventsTable.title,
        description: eventsTable.description,
        date: eventsTable.date,
        venue: eventsTable.venue,
        category: eventsTable.category,
        capacity: eventsTable.capacity,
        registrationDeadline: eventsTable.registrationDeadline,
        status: eventsTable.status,
        approvalStatus: eventsTable.approvalStatus,
        bannerUrl: eventsTable.bannerUrl,
        organizerId: eventsTable.organizerId,
        createdAt: eventsTable.createdAt,
      },
    }).from(registrationsTable)
      .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
      .where(eq(registrationsTable.userId, userId))
      .orderBy(desc(registrationsTable.registeredAt))
      .limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(registrationsTable).where(eq(registrationsTable.userId, userId)),
    db.select({ eventId: registrationsTable.eventId, count: sql<number>`count(*)::int` })
      .from(registrationsTable).groupBy(registrationsTable.eventId),
  ]);

  const countMap = new Map(regCounts.map(r => [r.eventId, r.count]));
  const orgIds = [...new Set(registrations.map(r => r.event.organizerId))];
  const organizers = orgIds.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
        .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(orgIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : [];
  const orgMap = new Map(organizers.map(o => [o.id, o.name]));

  const total = countResult[0]?.count ?? 0;
  const result = registrations.map(r => ({
    id: r.id,
    eventId: r.eventId,
    userId: r.userId,
    registeredAt: r.registeredAt,
    attended: r.attended,
    qrCode: r.qrCode,
    event: {
      ...r.event,
      organizerName: orgMap.get(r.event.organizerId) ?? null,
      registrationCount: countMap.get(r.event.id) ?? 0,
      isRegistered: true,
    },
  }));

  res.json({ registrations: result, total, page, totalPages: Math.ceil(total / limit) });
});

router.delete("/registrations/:id", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.user!.userId;
  const [reg] = await db.select().from(registrationsTable)
    .where(and(eq(registrationsTable.id, id), eq(registrationsTable.userId, userId))).limit(1);
  if (!reg) { res.status(404).json({ error: "Registration not found" }); return; }
  await db.delete(registrationsTable).where(eq(registrationsTable.id, id));
  res.status(204).send();
});

router.get("/registrations/:id/qr", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.user!.userId;
  const [reg] = await db.select({
    id: registrationsTable.id,
    qrCode: registrationsTable.qrCode,
    eventId: registrationsTable.eventId,
    userId: registrationsTable.userId,
    eventTitle: eventsTable.title,
  }).from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .where(and(eq(registrationsTable.id, id), eq(registrationsTable.userId, userId)))
    .limit(1);
  if (!reg) { res.status(404).json({ error: "Registration not found" }); return; }

  let qrCode = reg.qrCode;
  if (!qrCode) {
    qrCode = await QRCode.toDataURL(JSON.stringify({ regId: id, eventId: reg.eventId, userId: reg.userId }));
    await db.update(registrationsTable).set({ qrCode }).where(eq(registrationsTable.id, id));
  }
  res.json({ qrCode, registrationId: reg.id, eventTitle: reg.eventTitle });
});

export default router;
