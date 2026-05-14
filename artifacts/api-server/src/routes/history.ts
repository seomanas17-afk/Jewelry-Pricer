import { Router } from "express";
import { db, priceHistoryTable } from "@workspace/db";
import { eq, desc, count, avg } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { GetPriceHistoryQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /api/history — paginated history for the current user
router.get("/", requireAuth, async (req, res) => {
  const parsed = GetPriceHistoryQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

  const userId = req.user!.userId;

  const [{ total }] = await db
    .select({ total: count() })
    .from(priceHistoryTable)
    .where(eq(priceHistoryTable.userId, userId));

  const items = await db
    .select()
    .from(priceHistoryTable)
    .where(eq(priceHistoryTable.userId, userId))
    .orderBy(desc(priceHistoryTable.timestamp))
    .limit(limit)
    .offset(offset);

  res.json({
    total,
    items: items.map((h) => ({
      id: h.id,
      userId: h.userId,
      timestamp: h.timestamp.toISOString(),
      metalType: h.metalType,
      purity: h.purity,
      metalWeight: parseFloat(h.metalWeight),
      centerDiamondWeight: parseFloat(h.centerDiamondWeight),
      sideDiamondWeight: parseFloat(h.sideDiamondWeight),
      totalPrice: parseFloat(h.totalPrice),
      breakdown: h.breakdown,
    })),
  });
});

// DELETE /api/history/:id — admin only
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(priceHistoryTable)
    .where(eq(priceHistoryTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "History item not found" });
    return;
  }

  res.status(204).send();
});

// GET /api/history/stats — aggregated stats for current user
router.get("/stats", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const [totals] = await db
    .select({ totalCalculations: count(), averagePrice: avg(priceHistoryTable.totalPrice) })
    .from(priceHistoryTable)
    .where(eq(priceHistoryTable.userId, userId));

  const byMetal = await db
    .select({
      metalType: priceHistoryTable.metalType,
      count: count(),
      avgPrice: avg(priceHistoryTable.totalPrice),
    })
    .from(priceHistoryTable)
    .where(eq(priceHistoryTable.userId, userId))
    .groupBy(priceHistoryTable.metalType)
    .orderBy(desc(count()));

  const topMetalType = byMetal.length > 0 ? byMetal[0].metalType : "gold";

  res.json({
    totalCalculations: totals.totalCalculations,
    averagePrice: parseFloat(totals.averagePrice ?? "0"),
    topMetalType,
    totalByMetal: byMetal.map((b) => ({
      metalType: b.metalType,
      count: b.count,
      avgPrice: parseFloat(b.avgPrice ?? "0"),
    })),
  });
});

export default router;
