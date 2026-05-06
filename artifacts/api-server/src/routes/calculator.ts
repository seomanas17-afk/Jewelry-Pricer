import { Router } from "express";
import { db, metalPricesTable, priceHistoryTable, appSettingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { CalculatePriceBody } from "@workspace/api-zod";

const router = Router();

/**
 * New calculation formula (simplified to Gold only):
 *
 * goldValue         = goldWeight * goldPricePerGram
 * centerDiamond     = centerDiamondWeight * diamondPricePerCarat
 * sideDiamond       = sideDiamondWeight * diamondPricePerCarat
 * labourCost        = labourChargePerGram * goldWeight
 * subtotal          = goldValue + centerDiamond + sideDiamond + labourCost
 * handlingCharge    = subtotal * 0.05  (5%)
 * cadDesignCharge   = cadDesignCharges ? cadDesignChargeAmount : 0
 * grandTotal        = subtotal + handlingCharge + cadDesignCharge
 */
router.post("/calculate", requireAuth, async (req, res) => {
  const parsed = CalculatePriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { goldWeight, centerDiamondWeight, sideDiamondWeight, cadDesignCharges, saveToHistory } = parsed.data;

  // Fetch gold price per gram
  const [goldPriceRow] = await db
    .select()
    .from(metalPricesTable)
    .where(and(eq(metalPricesTable.metalType, "gold"), eq(metalPricesTable.purity, "standard")));

  if (!goldPriceRow) {
    res.status(400).json({ error: "Gold price not configured. Please contact admin." });
    return;
  }

  // Fetch app settings (labour rate, diamond price, CAD charge)
  const settings = await db.select().from(appSettingsTable);
  const getSetting = (key: string, fallback: number) => {
    const row = settings.find((s) => s.key === key);
    return row ? parseFloat(row.value) : fallback;
  };

  const goldPricePerGram = parseFloat(goldPriceRow.pricePerUnit);
  const labourRatePerGram = getSetting("labour_charge_per_gram", 25);
  const diamondPricePerCarat = getSetting("diamond_price_per_carat", 180);
  const cadDesignChargeAmount = getSetting("cad_design_charge", 80);

  // Apply formulas
  const goldValue = goldWeight * goldPricePerGram;
  const centerDiamondPrice = centerDiamondWeight * diamondPricePerCarat;
  const sideDiamondPrice = sideDiamondWeight * diamondPricePerCarat;
  const labourCost = labourRatePerGram * goldWeight;
  const subtotal = goldValue + centerDiamondPrice + sideDiamondPrice + labourCost;
  const handlingCharge = subtotal * 0.05;
  const cadDesignCharge = cadDesignCharges ? cadDesignChargeAmount : 0;
  const totalPrice = subtotal + handlingCharge + cadDesignCharge;

  const breakdown = {
    goldValue,
    centerDiamondPrice,
    sideDiamondPrice,
    labourCost,
    subtotal,
    handlingCharge,
    cadDesignCharge,
    totalPrice,
    goldPricePerGram,
    labourRatePerGram,
    diamondPricePerCarat,
    inputs: { goldWeight, centerDiamondWeight, sideDiamondWeight, cadDesignCharges: !!cadDesignCharges },
  };

  // Save to history if requested
  if (saveToHistory === true) {
    await db.insert(priceHistoryTable).values({
      userId: req.user!.userId,
      metalType: "gold",
      purity: "standard",
      metalWeight: String(goldWeight),
      centerDiamondWeight: String(centerDiamondWeight),
      sideDiamondWeight: String(sideDiamondWeight),
      totalPrice: String(totalPrice),
      breakdown,
    });
  }

  res.json(breakdown);
});

export default router;
