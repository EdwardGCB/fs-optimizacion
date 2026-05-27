import { z } from "zod"

export const FormSchema = z.object({
  nro_variables: z.number().int().min(2).optional(),
  nro_restrictions: z.number().int().min(1).optional(),
  type_optimization: z.enum(["graphical", "two_steps"]).optional(),
  optimization: z.enum(["MIN", "MAX"], {
    error: "Selecciona MIN o MAX",
  }),
  coefficients: z
    .array(
      z.number({
        error: (issue) =>
          issue.input === undefined
            ? "El coeficiente es requerido"
            : "Debe ser un número",
      })
    )
    .min(2, "Debe haber al menos 2 variables"),
  restrictions: z
    .array(
      z
        .object({
          coefficients: z.array(z.number({ error: "Debe ser un número" })),
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
        .refine((data) => data.coefficients.some((c) => c !== 0), {
          message: "Debe ingresar al menos un coeficiente distinto de 0",
          path: ["coefficients"],
        })
    )
    .min(1, "Agrega al menos una restricción"),
})
