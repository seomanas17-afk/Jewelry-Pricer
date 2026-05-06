import { Router } from "express";
import { db, metalPricesTable, priceHistoryTable, appSettingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { CalculatePriceBody } from "@workspace/api-zod";

const router = Router();

/**
 * Calculation formula:
 *
 * metalValue        = metalWeight * metalPricePerUnit (by metalType + purity)
 * centerDiamond     = centerDiamondWeight * diamondPricePerCarat
 * sideDiamond       = sideDiamondWeight * diamondPricePerCarat
 * labourCost        = labourChargePerGram * metalWeight
 * subtotal          = metalValue + centerDiamond + sideDiamond + labourCost
 * handlingCharge    = subtotal * (handlingChargePercent / 100)
 * cadDesignCharge   = cadDesignCharges ? cadDesignChargeAmount : 0
 * grandTotal        = subtotal + handlingCharge + cadDesignCharge
 *
 * Gold uses purity = "standard" (no purity selection needed in UI).
 * Silver and Platinum use purity = e.g. "10K", "14K", "18K", "24K".
 */
router.post("/calculate", requireAuth, async (req, res) => {
  const parsed = CalculatePriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { metalType, metalPurity, metalWeight, centerDiamondWeight, sideDiamondWeight, cadDesignCharges, saveToHistory } =
    parsed.data;

  // Determine purity to look up
  const resolvedPurity = metalType === "gold" ? "standard" : (metalPurity ?? "");

  if (metalType !== "gold" && !resolvedPurity) {
    res.status(400).json({ error: "metalPurity is required for silver and platinum." });
    return;
  }

  // Fetch metal price
  const [metalPriceRow] = await db
    .select()
    .from(metalPricesTable)
    .where(and(eq(metalPricesTable.metalType, metalType), eq(metalPricesTable.purity, resolvedPurity)));

  if (!metalPriceRow) {
    res.status(400).json({
      error: `Price for ${metalType}${resolvedPurity ? ` (${resolvedPurity})` : ""} not configured. Please contact admin.`,
    });
    return;
  }

  // Fetch app settings
  const settings = await db.select().from(appSettingsTable);
  const getSetting = (key: string, fallback: number) => {
    const row = settings.find((s) => s.key === key);
    return row ? parseFloat(row.value) : fallback;
  };

  const metalPricePerUnit = parseFloat(metalPriceRow.pricePerUnit);
  const labourRatePerGram = getSetting("labour_charge_per_gram", 25);
  const diamondPricePerCarat = getSetting("diamond_price_per_carat", 180);
  const cadDesignChargeAmount = getSetting("cad_design_charge", 80);
  const handlingChargePercent = getSetting("handling_charge_percent", 5);

  // Apply formulas
  const metalValue = metalWeight * metalPricePerUnit;
  const centerDiamondPrice = centerDiamondWeight * diamondPricePerCarat;
  const sideDiamondPrice = sideDiamondWeight * diamondPricePerCarat;
  const labourCost = labourRatePerGram * metalWeight;
  const subtotal = metalValue + centerDiamondPrice + sideDiamondPrice + labourCost;
  const handlingCharge = subtotal * (handlingChargePercent / 100);
  const cadDesignCharge = cadDesignCharges ? cadDesignChargeAmount : 0;
  const totalPrice = subtotal + handlingCharge + cadDesignCharge;

  const breakdown = {
    metalValue,
    metalPricePerUnit,
    metalPurity: resolvedPurity,
    centerDiamondPrice,
    sideDiamondPrice,
    labourCost,
    subtotal,
    handlingCharge,
    handlingChargePercent,
    cadDesignCharge,
    totalPrice,
    labourRatePerGram,
    diamondPricePerCarat,
    inputs: {
      metalType,
      metalPurity: resolvedPurity,
      metalWeight,
      centerDiamondWeight,
      sideDiamondWeight,
      cadDesignCharges: !!cadDesignCharges,
    },
  };

  if (saveToHistory === true) {
    await db.insert(priceHistoryTable).values({
      userId: req.user!.userId,
      metalType,
      purity: resolvedPurity,
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
