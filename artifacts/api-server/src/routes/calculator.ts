import { Router } from "express";
import { db, metalPricesTable, priceHistoryTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { CalculatePriceBody } from "@workspace/api-zod";

const router = Router();

/**
 * Calculate jewelry price using the defined formulas.
 *
 * Purity multipliers:
 *   10K → 0.45, 14K → 0.65, 18K → 0.75, standard → 1.0
 *
 * Total Metal Price = staticPrice * multiplier * metalWeight / 75
 * Center Diamond Price = centerDiamondWeight * 180
 * Side Diamond Price = sideDiamondWeight * 180
 * Labour = 25 * metalWeight
 * Subtotal = metalPrice + centerDiamondPrice + sideDiamondPrice + labour
 * Additional Charge = subtotal * 0.10
 * Total = subtotal + additionalCharge
 */
function getPurityMultiplier(purity: string): number {
  const map: Record<string, number> = { "10K": 0.45, "14K": 0.65, "18K": 0.75, standard: 1.0 };
  return map[purity] ?? 1.0;
}

router.post("/calculate", requireAuth, async (req, res) => {
  const parsed = CalculatePriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { metalType, purity, metalWeight, centerDiamondWeight, sideDiamondWeight, saveToHistory } = parsed.data;

  // Fetch static price for this metal/purity combo
  const [metalPriceRow] = await db
    .select()
    .from(metalPricesTable)
    .where(and(eq(metalPricesTable.metalType, metalType), eq(metalPricesTable.purity, purity)));

  if (!metalPriceRow) {
    res.status(400).json({ error: `No price configured for ${metalType} ${purity}` });
    return;
  }

  const staticPrice = parseFloat(metalPriceRow.pricePerUnit);
  const multiplier = getPurityMultiplier(purity);

  // Apply formulas
  const metalPrice = staticPrice * multiplier * metalWeight / 75;
  const centerDiamondPrice = centerDiamondWeight * 180;
  const sideDiamondPrice = sideDiamondWeight * 180;
  const labourCost = 25 * metalWeight;
  const subtotal = metalPrice + centerDiamondPrice + sideDiamondPrice + labourCost;
  const additionalCharge = subtotal * 0.10;
  const totalPrice = subtotal + additionalCharge;

  const breakdown = {
    metalPrice,
    centerDiamondPrice,
    sideDiamondPrice,
    labourCost,
    subtotal,
    additionalCharge,
    totalPrice,
    inputs: { metalType, purity, metalWeight, centerDiamondWeight, sideDiamondWeight },
  };

  // Optionally save to history
  if (saveToHistory !== false) {
    await db.insert(priceHistoryTable).values({
      userId: req.user!.userId,
      metalType,
      purity,
      metalWeight: String(metalWeight),
      centerDiamondWeight: String(centerDiamondWeight),
      sideDiamondWeight: String(sideDiamondWeight),
      totalPrice: String(totalPrice),
      breakdown,
    });
  }

  res.json(breakdown);
});

export default router;
