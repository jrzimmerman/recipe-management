/**
 * Measurement units for a robotics kitchen.
 * We enforce precise, machine-readable units — no "pinch" or "dash."
 * All quantities must be numeric with a defined unit.
 */

/** Mass units */
export const MassUnit = {
  GRAMS: "g",
  KILOGRAMS: "kg",
} as const;

/** Volume units */
export const VolumeUnit = {
  MILLILITERS: "mL",
  LITERS: "L",
} as const;

/** Count-based units */
export const CountUnit = {
  EACH: "each",
} as const;

/**
 * All valid measurement units.
 * Intentionally restrictive — a robot dispenses by mass, volume, or count.
 * Kitchen colloquialisms (cup, tbsp, pinch) are excluded to prevent
 * ambiguity in automated preparation.
 */
export const MeasurementUnit = {
  ...MassUnit,
  ...VolumeUnit,
  ...CountUnit,
} as const;

export type MeasurementUnit =
  (typeof MeasurementUnit)[keyof typeof MeasurementUnit];

/** Yield units — what the recipe produces */
export const YieldUnit = {
  GRAMS: "g",
  KILOGRAMS: "kg",
  MILLILITERS: "mL",
  LITERS: "L",
  SERVINGS: "servings",
  PIECES: "pieces",
} as const;

export type YieldUnit = (typeof YieldUnit)[keyof typeof YieldUnit];

/** Set of all valid measurement unit values for runtime validation */
export const VALID_MEASUREMENT_UNITS = new Set<string>(
  Object.values(MeasurementUnit)
);

export const VALID_YIELD_UNITS = new Set<string>(Object.values(YieldUnit));
