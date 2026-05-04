import { Router } from "express";
import { db, metalPricesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { UpdateMetalPriceParams, UpdateMetalPriceBody } from "@workspace/api-zod";

const router = Router();

// GET /api/metal-prices — return all metal price configurations
router.get("/", requireAuth, async (req, res) => {
  const prices = await db.select().from(metalPricesTable).orderBy(metalPricesTable.metalType, metalPricesTable.purity);
  res.json(
    prices.map((p) => ({
      id: p.id,
      metalType: p.metalType,
      purity: p.purity,
      pricePerUnit: parseFloat(p.pricePerUnit),
      updatedAt: p.updatedAt.toISOString(),
    }))
  );
});

// PUT /api/metal-prices/:id — update a price (Admin only)
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const paramsParsed = UpdateMetalPriceParams.safeParse({ id: req.params.id });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid price ID" });
    return;
  }
  const bodyParsed = UpdateMetalPriceBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { id } = paramsParsed.data;
  const { pricePerUnit } = bodyParsed.data;

  const [updated] = await db
    .update(metalPricesTable)
    .set({ pricePerUnit: String(pricePerUnit), updatedAt: new Date() })
    .where(eq(metalPricesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Metal price not found" });
    return;
  }

  res.json({
    id: updated.id,
    metalType: updated.metalType,
    purity: updated.purity,
    pricePerUnit: parseFloat(updated.pricePerUnit),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
