import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MatrixSchema } from "@/utils/schemas/Matrix"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import type z from "zod"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "../ui/button"
import { Loader2, Minus, Plus, Trash2 } from "lucide-react"
import GraficService from "@/services/GraficService"
import { useState } from "react"

const DEFAULT_VARIABLES = 2

// Convierte un número a su representación en subíndice unicode (1 → ₁, 12 → ₁₂)
const subscript = (n: number): string => {
  const map = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"]
  return n
    .toString()
    .split("")
    .map((d) => map[parseInt(d)])
    .join("")
}

function Matrix() {
  const [loading, setLoading] = useState(false)
  const [numVariables, setNumVariables] = useState(DEFAULT_VARIABLES)

  const form = useForm<z.infer<typeof MatrixSchema>>({
    resolver: zodResolver(MatrixSchema),
    defaultValues: {
      coefficients: Array(DEFAULT_VARIABLES).fill(undefined),
      restrictions: [
        {
          coefficients: Array(DEFAULT_VARIABLES).fill(null),
          operator: "<=",
          value: undefined,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "restrictions",
  })

  // ─── Manejo de variables (columnas) ─────────────────────────────
  const addVariable = () => {
    setNumVariables((n) => n + 1)

    const coeffs = form.getValues("coefficients") ?? []
    form.setValue("coefficients", [...coeffs, undefined as unknown as number])

    const restrictions = form.getValues("restrictions") ?? []
    restrictions.forEach((_, i) => {
      const c = form.getValues(`restrictions.${i}.coefficients`) ?? []
      form.setValue(`restrictions.${i}.coefficients`, [...c, null])
    })
  }

  const removeVariable = () => {
    if (numVariables <= 2) return
    setNumVariables((n) => n - 1)

    const coeffs = form.getValues("coefficients") ?? []
    form.setValue("coefficients", coeffs.slice(0, -1))

    const restrictions = form.getValues("restrictions") ?? []
    restrictions.forEach((_, i) => {
      const c = form.getValues(`restrictions.${i}.coefficients`) ?? []
      form.setValue(`restrictions.${i}.coefficients`, c.slice(0, -1))
    })
  }

  const addRestriction = () => {
    append({
      coefficients: Array(numVariables).fill(null),
      operator: "<=",
      value: undefined as unknown as number,
    })
  }

  const onSubmit = (data: z.infer<typeof MatrixSchema>) => {
    console.log("✅ data:", data)
    setLoading(true)
    GraficService.create(data)
      .then((res) => console.log("✅ respuesta:", res))
      .catch((err) => console.error("❌ error:", err))
      .finally(() => setLoading(false))
  }

  const onInvalid = (errors: unknown) => {
    console.log("❌ validación:", errors)
  }

  const parseNullable = (v: string) =>
    v === "" ? null : Number.isNaN(Number(v)) ? null : Number(v)

  // Helper para errores top-level del array de coeficientes objetivo
  const coefficientsErrors = form.formState.errors.coefficients

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      className="flex w-full flex-col gap-4"
    >
      <h1 className="text-2xl font-bold">Matrices</h1>

      {/* ─── Función Objetivo ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>
            Usuario, por favor complete el formulario ({numVariables} variables)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel>Funcion objetivo</FieldLabel>
            <FieldContent>
              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                <Controller
                  name="optimization"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loading}
                    >
                      <SelectTrigger
                        className="w-[100px]"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="MIN/MAX" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MIN">MIN</SelectItem>
                        <SelectItem value="MAX">MAX</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />

                <span className="text-lg font-medium whitespace-nowrap">
                  (z) =
                </span>

                {Array.from({ length: numVariables }).map((_, varIndex) => (
                  <div key={varIndex} className="flex items-center gap-2">
                    <Controller
                      name={`coefficients.${varIndex}`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-20"
                          aria-invalid={fieldState.invalid}
                          disabled={loading}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? undefined
                                : e.target.valueAsNumber
                            )
                          }
                        />
                      )}
                    />
                    <span className="text-lg font-medium whitespace-nowrap">
                      x{subscript(varIndex + 1)}
                      {varIndex < numVariables - 1 && " +"}
                    </span>
                  </div>
                ))}

                {/* Botones para añadir/quitar variables */}
                <div className="ml-2 flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={addVariable}
                    disabled={loading}
                    aria-label="Agregar variable"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={removeVariable}
                    disabled={loading || numVariables <= 2}
                    aria-label="Quitar última variable"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Errores */}
              {(form.formState.errors.optimization || coefficientsErrors) && (
                <div className="mt-2 flex flex-col gap-1">
                  {form.formState.errors.optimization && (
                    <FieldError>
                      <span className="font-medium">MIN/MAX:</span>{" "}
                      {form.formState.errors.optimization.message}
                    </FieldError>
                  )}
                  {/* Errores por coeficiente */}
                  {Array.isArray(coefficientsErrors) &&
                    coefficientsErrors.map(
                      (err, i) =>
                        err && (
                          <FieldError key={i}>
                            <span className="font-medium">
                              Coeficiente x{subscript(i + 1)}:
                            </span>{" "}
                            {err.message}
                          </FieldError>
                        )
                    )}
                  {/* Error global del array (ej: min(2)) */}
                  {coefficientsErrors &&
                    !Array.isArray(coefficientsErrors) &&
                    "message" in coefficientsErrors && (
                      <FieldError>{coefficientsErrors.message}</FieldError>
                    )}
                </div>
              )}
            </FieldContent>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-center">Sujeto a:</CardContent>
      </Card>

      {/* ─── Restricciones ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Restricciones</CardTitle>
        </CardHeader>
        <CardContent className="flex w-full flex-col items-center justify-center gap-3">
          {fields.map((fieldItem, index) => {
            const rowErrors = form.formState.errors.restrictions?.[index]
            const coeffsError = rowErrors?.coefficients

            return (
              <div key={fieldItem.id} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from({ length: numVariables }).map((_, varIndex) => (
                    <div key={varIndex} className="flex items-center gap-2">
                      <Controller
                        name={`restrictions.${index}.coefficients.${varIndex}`}
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Input
                            type="number"
                            placeholder="—"
                            className="w-20"
                            aria-invalid={fieldState.invalid}
                            disabled={loading}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(parseNullable(e.target.value))
                            }
                          />
                        )}
                      />
                      <span className="text-lg font-medium whitespace-nowrap">
                        x{subscript(varIndex + 1)}
                        {varIndex < numVariables - 1 && " +"}
                      </span>
                    </div>
                  ))}

                  <Controller
                    name={`restrictions.${index}.operator`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loading}
                      >
                        <SelectTrigger
                          className="w-[70px]"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<=">≤</SelectItem>
                          <SelectItem value=">=">≥</SelectItem>
                          <SelectItem value="=">=</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />

                  <Controller
                    name={`restrictions.${index}.value`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Input
                        type="number"
                        placeholder="0"
                        className="w-24"
                        aria-invalid={fieldState.invalid}
                        disabled={loading}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : e.target.valueAsNumber
                          )
                        }
                      />
                    )}
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={fields.length === 1 || loading}
                    onClick={() => remove(index)}
                    aria-label="Eliminar restricción"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Errores de la fila */}
                {rowErrors && (
                  <div className="flex flex-col gap-1 pl-1">
                    {/* Errores por coeficiente individual */}
                    {Array.isArray(coeffsError) &&
                      coeffsError.map(
                        (err, i) =>
                          err && (
                            <FieldError key={i}>
                              <span className="font-medium">
                                Restricción {index + 1}, x{subscript(i + 1)}:
                              </span>{" "}
                              {err.message}
                            </FieldError>
                          )
                      )}
                    {/* Error del refine (al menos un coeficiente) */}
                    {coeffsError &&
                      !Array.isArray(coeffsError) &&
                      "message" in coeffsError && (
                        <FieldError>
                          <span className="font-medium">
                            Restricción {index + 1}:
                          </span>{" "}
                          {coeffsError.message}
                        </FieldError>
                      )}
                    {rowErrors.operator && (
                      <FieldError>
                        <span className="font-medium">Operador:</span>{" "}
                        {rowErrors.operator.message}
                      </FieldError>
                    )}
                    {rowErrors.value && (
                      <FieldError>
                        <span className="font-medium">Valor:</span>{" "}
                        {rowErrors.value.message}
                      </FieldError>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <Button
            type="button"
            className="w-full"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={addRestriction}
          >
            <Plus /> Agregar Restriccion
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
      </Button>
    </form>
  )
}

export default Matrix
