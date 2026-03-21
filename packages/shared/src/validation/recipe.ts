import { z } from "zod";
import { MeasurementUnit, YieldUnit } from "../types/units";

/**
 * Zod schemas for API input validation.
 * These enforce type safety at the HTTP boundary — invalid data
 * never reaches the service layer.
 */

const measurementUnitValues = Object.values(MeasurementUnit) as [
  string,
  ...string[],
];
const yieldUnitValues = Object.values(YieldUnit) as [string, ...string[]];

/** Validate a single ingredient in a create/update request */
export const IngredientInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ingredient name is required")
    .max(200, "Ingredient name too long"),
  quantity: z
    .number()
    .positive("Quantity must be positive")
    .finite("Quantity must be finite"),
  unit: z.enum(measurementUnitValues, {
    errorMap: () => ({
      message: `Unit must be one of: ${measurementUnitValues.join(", ")}`,
    }),
  }),
  sortOrder: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).nullable().optional(),
});

/** Validate a single instruction in a create/update request */
export const InstructionInputSchema = z.object({
  stepNumber: z.number().int().positive("Step number must be positive"),
  description: z
    .string()
    .trim()
    .min(1, "Instruction description is required")
    .max(2000, "Instruction too long"),
  durationSeconds: z
    .number()
    .int()
    .nonnegative("Duration cannot be negative")
    .nullable()
    .optional(),
});

/** Validate a full recipe create request */
export const CreateRecipeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Recipe name is required")
    .max(300, "Recipe name too long"),
  description: z
    .string()
    .trim()
    .max(2000, "Description too long")
    .default(""),
  yieldAmount: z
    .number()
    .positive("Yield must be positive")
    .finite("Yield must be finite"),
  yieldUnit: z.enum(yieldUnitValues, {
    errorMap: () => ({
      message: `Yield unit must be one of: ${yieldUnitValues.join(", ")}`,
    }),
  }),
  ingredients: z
    .array(IngredientInputSchema)
    .min(1, "Recipe must have at least one ingredient"),
  instructions: z
    .array(InstructionInputSchema)
    .min(1, "Recipe must have at least one instruction"),
});

/** Validate a recipe update — all fields optional, but at least one required */
export const UpdateRecipeSchema = z
  .object({
    name: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(2000).optional(),
    yieldAmount: z.number().positive().finite().optional(),
    yieldUnit: z.enum(yieldUnitValues).optional(),
    ingredients: z.array(IngredientInputSchema).min(1).optional(),
    instructions: z.array(InstructionInputSchema).min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/** Search query validation */
export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(200),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/** List query validation */
export const ListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/** Inferred types from schemas */
export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;
export type IngredientInput = z.infer<typeof IngredientInputSchema>;
export type InstructionInput = z.infer<typeof InstructionInputSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type ListQuery = z.infer<typeof ListQuerySchema>;
