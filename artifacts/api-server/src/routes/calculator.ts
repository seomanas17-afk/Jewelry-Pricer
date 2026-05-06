import { Router } from "express";
import { db, metalPricesTable, priceHistoryTable, appSettingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { CalculatePriceBody } from "@workspace/api-zod";

const router = Router();

/**
 * Purity factors (karat / 24):
 *   10K → 10/24 ≈ 0.4167
 *   14K → 14/24 ≈ 0.5833
 *   18K → 18/24 = 0.7500
 *
 * Admin sets a single BASE price per gram for each metal (purity = "standard").
 * The calculator applies the purity factor to that base price:
 *   effectivePricePerGram = basePricePerGram × (karat / 24)
 *   metalValue            = metalWeight × effectivePricePerGram
 *
 * Full formula:
 *   labourCost     = labourChargePerGram × metalWeight
 *   subtotal       = metalValue + centerDiamondPrice + sideDiamondPrice + labourCost
 *   handlingCharge = subtotal × (handlingChargePercent / 100)
 *   cadCharge      = cadDesignCharges ? cadDesignChargeAmount : 0
 *   grandTotal     = subtotal + handlingCharge + cadCharge
 */

const PURITY_FACTORS: Record<string, number> = {
  "10K": 10 / 24,
  "14K": 14 / 24,
  "18K": 18 / 24,
};

router.post("/calculate", requireAuth, async (req, res) => {
  const parsed = CalculatePriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { metalType, metalPurity, metalWeight, centerDiamondWeight, sideDiamondWeight, cadDesignCharges, saveToHistory } =
    parsed.data;

  // Purity is required for all metals
  if (!metalPurity || !(metalPurity in PURITY_FACTORS)) {
    res.status(400).json({ error: "metalPurity must be one of: 10K, 14K, 18K" });
    return;
  }

  const purityFactor = PURITY_FACTORS[metalPurity];

  // Fetch the base (standard) price for the selected metal
  const [metalPriceRow] = await db
    .select()
    .from(metalPricesTable)
    .where(and(eq(metalPricesTable.metalType, metalType), eq(metalPricesTable.purity, "standard")));

  if (!metalPriceRow) {
    res.status(400).json({
      error: `Base price for ${metalType} not configured. Please contact admin.`,
    });
    return;
  }

  // Fetch app settings
  const settings = await db.select().from(appSettingsTable);
  const getSetting = (key: string, fallback: number) => {
    const row = settings.find((s) => s.key === key);
    return row ? parseFloat(row.value) : fallback;
  };

  const basePricePerGram = parseFloat(metalPriceRow.pricePerUnit);
  const effectivePricePerGram = basePricePerGram * purityFactor;
  const labourRatePerGram = getSetting("labour_charge_per_gram", 25);
  const diamondPricePerCarat = getSetting("diamond_price_per_carat", 180);
  const cadDesignChargeAmount = getSetting("cad_design_charge", 80);
  const handlingChargePercent = getSetting("handling_charge_percent", 5);

  // Apply formulas
  const metalValue = metalWeight * effectivePricePerGram;
  const centerDiamondPrice = centerDiamondWeight * diamondPricePerCarat;
  const sideDiamondPrice = sideDiamondWeight * diamondPricePerCarat;
  const labourCost = labourRatePerGram * metalWeight;
  const subtotal = metalValue + centerDiamondPrice + sideDiamondPrice + labourCost;
  const handlingCharge = subtotal * (handlingChargePercent / 100);
  const cadDesignCharge = cadDesignCharges ? cadDesignChargeAmount : 0;
  const totalPrice = subtotal + handlingCharge + cadDesignCharge;

  const breakdown = {
    metalValue,
    metalPricePerUnit: effectivePricePerGram,
    metalPurity,
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
      metalPurity,
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
      purity: metalPurity,
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
