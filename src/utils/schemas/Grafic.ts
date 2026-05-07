// @/utils/schemas/Grafic.ts
import { z } from "zod"

export const GraficSchema = z.object({
  optimization: z.enum(["MIN", "MAX"], {
    error: "Selecciona MIN o MAX",
  }),
  coefficient1: z.number({
    error: (issue) =>
      issue.input === undefined
        ? "El coeficiente es requerido"
        : "Debe ser un número",
  }),
  coefficient2: z.number({
    error: (issue) =>
      issue.input === undefined
        ? "El coeficiente es requerido"
        : "Debe ser un número",
  }),
  restrictions: z
    .array(
      z
        .object({
          coefficient1: z.number({ error: "Debe ser un número" }).nullable(),
          coefficient2: z.number({ error: "Debe ser un número" }).nullable(),
          operator: z.enum(["<=", ">=", "="], {
            error: "Selecciona un operador",
          }),
          value: z.number({
            error: (issue) =>
              issue.input === undefined
                ? "El valor es requerido"
                : "Debe ser un número",
          }),
        })
        .refine(
          (data) => data.coefficient1 !== null || data.coefficient2 !== null,
          {
            message: "Debe ingresar al menos un coeficiente (x₁ o x₂)",
            path: ["coefficient1"],
          }
        )
    )
    .min(1, "Agrega al menos una restricción"),
})
