import { Router } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { UpdateSettingBody } from "@workspace/api-zod";

const router = Router();

const DEFAULT_SETTINGS = {
  labour_charge_per_gram: 25,
  diamond_price_per_carat: 180,
  cad_design_charge: 80,
};

// Helper: build AppSettings response from DB rows
async function buildSettingsResponse() {
  const rows = await db.select().from(appSettingsTable);
  const get = (key: string) => {
    const row = rows.find((r) => r.key === key);
    return row ? parseFloat(row.value) : DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] ?? 0;
  };
  return {
    labourChargePerGram: get("labour_charge_per_gram"),
    diamondPricePerCarat: get("diamond_price_per_carat"),
    cadDesignCharge: get("cad_design_charge"),
  };
}

// GET /api/settings — return all app settings
router.get("/", requireAuth, async (_req, res) => {
  const settings = await buildSettingsResponse();
  res.json(settings);
});

// PUT /api/settings/:key — update a single setting (Admin only)
router.put("/:key", requireAuth, requireAdmin, async (req, res) => {
  const { key } = req.params;
  const validKeys = Object.keys(DEFAULT_SETTINGS);
  if (!validKeys.includes(key)) {
    res.status(400).json({ error: `Invalid setting key. Valid keys: ${validKeys.join(", ")}` });
    return;
  }

  const parsed = UpdateSettingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { value } = parsed.data;
  if (value < 0) {
    res.status(400).json({ error: "Value must be non-negative" });
    return;
  }

  // Upsert the setting
  const existing = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  if (existing.length > 0) {
    await db
      .update(appSettingsTable)
      .set({ value: String(value), updatedAt: new Date() })
      .where(eq(appSettingsTable.key, key));
  } else {
    await db.insert(appSettingsTable).values({ key, value: String(value) });
  }

  const settings = await buildSettingsResponse();
  res.json(settings);
});

export default router;
