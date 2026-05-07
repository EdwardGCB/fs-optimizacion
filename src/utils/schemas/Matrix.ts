import { z } from "zod"

export const MatrixSchema = z.object({
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
          coefficients: z.array(
            z.number({ error: "Debe ser un número" }).nullable()
          ),
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
        .refine((data) => data.coefficients.some((c) => c !== null), {
          message: "Debe ingresar al menos un coeficiente",
          path: ["coefficients"],
        })
    )
    .min(1, "Agrega al menos una restricción"),
})
