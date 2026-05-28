import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import GraficService from "@/services/Service"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { FormSchema } from "@/utils/schemas/Form"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"

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

// Parsea un string aceptando enteros, decimales y fracciones tipo "1/4" o "-3/2".
// "" → undefined (vacío). Si es inválido devuelve NaN.
const parseFractionOrNumber = (raw: string): number | undefined => {
  const s = raw.trim().replace(",", ".")
  if (s === "") return undefined
  const m = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(s)
  if (m) {
    const den = Number(m[2])
    if (den === 0) return NaN
    return Number(m[1]) / den
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

const formatFraction = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"

  const rounded = Math.round(value)
  if (Math.abs(value - rounded) < 1e-9) return String(rounded)

  const sign = value < 0 ? "-" : ""
  const x = Math.abs(value)
  const maxDenominator = 1000
  let bestNumerator = 1
  let bestDenominator = 1
  let bestError = Math.abs(x - 1)

  for (let denominator = 1; denominator <= maxDenominator; denominator++) {
    const numerator = Math.round(x * denominator)
    const error = Math.abs(x - numerator / denominator)

    if (error < bestError) {
      bestError = error
      bestNumerator = numerator
      bestDenominator = denominator
    }

    if (error < 1e-9) break
  }

  return `${sign}${bestNumerator}/${bestDenominator}`
}

const formatLinearExpression = (coefficients: number[]) => {
  const terms = coefficients
    .map((value, index) => {
      if (Math.abs(value) < 1e-9) return null

      const sign = value < 0 ? "-" : "+"
      const absValue = Math.abs(value)
      const coefficient =
        Math.abs(absValue - 1) < 1e-9 ? "" : formatFraction(absValue)

      return {
        sign,
        text: `${coefficient}X${index + 1}`,
      }
    })
    .filter(Boolean) as { sign: string; text: string }[]

  if (!terms.length) return "0"

  return terms
    .map((term, index) => {
      if (index === 0) return term.sign === "-" ? `- ${term.text}` : term.text
      return ` ${term.sign} ${term.text}`
    })
    .join("")
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))

export function Home() {
  const [loading, setLoading] = useState(false)
  const [numVariables, setNumVariables] = useState(DEFAULT_VARIABLES)
  const [graphicDialogOpen, setGraphicDialogOpen] = useState(false)
  // Texto crudo por celda para permitir entradas intermedias como "1/" mientras
  // el usuario escribe una fracción. Clave: "obj-i" | "res-i-j" | "val-i".
  const [rawCells, setRawCells] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 10
  const [totalPages, setTotalPages] = useState(1)
  const [items, setItems] = useState<any[]>([])
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      nro_variables: DEFAULT_VARIABLES,
      nro_restrictions: 1,
      type_optimization: "graphical",
      optimization: "MIN",
      coefficients: Array(DEFAULT_VARIABLES).fill(0),
      restrictions: [
        {
          coefficients: Array(DEFAULT_VARIABLES).fill(0),
          operator: "<=",
          value: 0,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "restrictions",
  })

  const resizeVariables = (newCount: number) => {
    if (newCount < 2) return

    const coeffs = form.getValues("coefficients") ?? []
    if (newCount > coeffs.length) {
      form.setValue("coefficients", [
        ...coeffs,
        ...Array(newCount - coeffs.length).fill(0),
      ])
    } else {
      form.setValue("coefficients", coeffs.slice(0, newCount))
    }

    const restrictions = form.getValues("restrictions") ?? []
    restrictions.forEach((_, i) => {
      const c = form.getValues(`restrictions.${i}.coefficients`) ?? []
      if (newCount > c.length) {
        form.setValue(`restrictions.${i}.coefficients`, [
          ...c,
          ...Array(newCount - c.length).fill(0),
        ])
      } else {
        form.setValue(`restrictions.${i}.coefficients`, c.slice(0, newCount))
      }
    })

    setNumVariables(newCount)
  }

  const resizeRestrictions = (newCount: number) => {
    if (newCount < 1) return
    const current = fields.length
    if (newCount > current) {
      for (let i = 0; i < newCount - current; i++) {
        append({
          coefficients: Array(numVariables).fill(0),
          operator: "<=",
          value: 0,
        })
      }
    } else if (newCount < current) {
      for (let i = current - 1; i >= newCount; i--) {
        remove(i)
      }
    }
  }

  const handleMethodChange = (
    value: string,
    fieldOnChange: (v: string) => void
  ) => {
    if (value === "graphical" && numVariables > 2) {
      setGraphicDialogOpen(true)
      return
    }
    fieldOnChange(value)
  }

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    setLoading(true)
    GraficService.create(data)
      .then((res) => {
        console.log(res)
        if (!res.success) {
          //toast.error(res.data.message)
          return
        }
        navigate(`/optimization/${res.data.type_optimization}/${res.data.id}`)
      })
      .catch((err) => console.error("❌ error:", err))
      .finally(() => setLoading(false))
  }

  const onInvalid = (errors: unknown) => {
    console.log("❌ validación:", errors)
  }

  // Obtiene el valor a mostrar en una celda: texto crudo si existe, si no el
  // número actual del form (o "" si es undefined/NaN).
  const cellDisplay = (key: string, value: number | undefined): string => {
    if (rawCells[key] !== undefined) return rawCells[key]
    if (value === undefined || Number.isNaN(value)) return ""
    return String(value)
  }

  const handleFractionChange = (
    key: string,
    raw: string,
    onChange: (v: number | undefined) => void
  ) => {
    setRawCells((prev) => ({ ...prev, [key]: raw }))
    const parsed = parseFractionOrNumber(raw)
    onChange(parsed)
  }

  // Helper para errores top-level del array de coeficientes objetivo
  const coefficientsErrors = form.formState.errors.coefficients

  useEffect(()=>{
    GraficService.search({page: currentPage, limit: limit}).then((res)=>{
      if(!res.success){
        return
      }
      setItems(res.data.items)
      setTotalPages(res.data.total_pages)
    }).catch((err)=>console.error("❌ error:", err))
  },[currentPage, limit]);


  return (
    <div className="min-h-svh space-y-4 p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        {/* ── Dialog: método gráfico ──────────────────────────────── */}
        <Dialog open={graphicDialogOpen} onOpenChange={setGraphicDialogOpen}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Método gráfico</DialogTitle>
              <DialogDescription>
                El método gráfico únicamente es aplicable con 2 variables. Si
                continúas, las variables se reducirán a 2. ¿Deseas continuar?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setGraphicDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  resizeVariables(2)
                  form.setValue("nro_variables", 2)
                  form.setValue("type_optimization", "graphical")
                  setGraphicDialogOpen(false)
                }}
              >
                Aceptar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Encabezado ─────────────────────────────────────────── */}
        <div>
          <p className="mb-1 text-xs tracking-widest text-muted-foreground uppercase">
            Investigación de Operaciones
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Programación Lineal
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Ingresa las dimensiones, el método y los coeficientes del modelo.
          </p>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          className="flex flex-col gap-6"
        >
          {/* ── Configuración ──────────────────────────────────────── */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Configuración del modelo</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel>Variables</FieldLabel>
                  <FieldContent>
                    <Controller
                      name="nro_variables"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Input
                          type="number"
                          placeholder="2"
                          min={2}
                          aria-invalid={fieldState.invalid}
                          disabled={loading}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.valueAsNumber
                            if (isNaN(val) || val < 2) {
                              field.onChange(val)
                              return
                            }
                            const rounded = Math.round(val)
                            if (
                              form.getValues("type_optimization") ===
                                "graphical" &&
                              rounded > 2
                            ) {
                              field.onChange(2)
                              setGraphicDialogOpen(true)
                              return
                            }
                            field.onChange(rounded)
                            resizeVariables(rounded)
                          }}
                        />
                      )}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Restricciones</FieldLabel>
                  <FieldContent>
                    <Controller
                      name="nro_restrictions"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Input
                          type="number"
                          placeholder="1"
                          min={1}
                          aria-invalid={fieldState.invalid}
                          disabled={loading}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.valueAsNumber
                            field.onChange(val)
                            if (!isNaN(val) && val >= 1) {
                              resizeRestrictions(Math.round(val))
                            }
                          }}
                        />
                      )}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Método</FieldLabel>
                  <FieldContent>
                    <Controller
                      name="type_optimization"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Select
                          onValueChange={(val) =>
                            handleMethodChange(val, field.onChange)
                          }
                          value={field.value}
                          disabled={loading}
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-invalid={fieldState.invalid}
                          >
                            <SelectValue placeholder="Seleccionar…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="graphical">
                              Método gráfico
                            </SelectItem>
                            <SelectItem value="two_steps">
                              Método 2 pasos
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldContent>
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* ── Función objetivo ───────────────────────────────────── */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Función objetivo</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
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
                        className="w-[90px]"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MIN">MIN</SelectItem>
                        <SelectItem value="MAX">MAX</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />

                <span className="text-sm font-medium text-muted-foreground">
                  z(x) =
                </span>

                {Array.from({ length: numVariables }).map((_, varIndex) => {
                  const key = `obj-${varIndex}`
                  return (
                    <div key={varIndex} className="flex items-center gap-2">
                      <Controller
                        name={`coefficients.${varIndex}`}
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            className="w-20"
                            aria-invalid={fieldState.invalid}
                            disabled={loading}
                            value={cellDisplay(key, field.value)}
                            onChange={(e) =>
                              handleFractionChange(
                                key,
                                e.target.value,
                                field.onChange
                              )
                            }
                          />
                        )}
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        x{subscript(varIndex + 1)}
                        {varIndex < numVariables - 1 && (
                          <span className="ml-2 text-muted-foreground">+</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>

              {(form.formState.errors.optimization || coefficientsErrors) && (
                <div className="mt-3 flex flex-col gap-1 border-l-2 border-destructive pl-3">
                  {form.formState.errors.optimization && (
                    <FieldError>
                      <span className="font-medium">MIN/MAX:</span>{" "}
                      {form.formState.errors.optimization.message}
                    </FieldError>
                  )}
                  {Array.isArray(coefficientsErrors) &&
                    coefficientsErrors.map(
                      (err, i) =>
                        err && (
                          <FieldError key={i}>
                            <span className="font-medium">
                              x{subscript(i + 1)}:
                            </span>{" "}
                            {err.message}
                          </FieldError>
                        )
                    )}
                  {coefficientsErrors &&
                    !Array.isArray(coefficientsErrors) &&
                    "message" in coefficientsErrors && (
                      <FieldError>{coefficientsErrors.message}</FieldError>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Divisor "Sujeto a" ─────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs tracking-widest text-muted-foreground uppercase">
              Sujeto a
            </span>
            <Separator className="flex-1" />
          </div>

          {/* ── Restricciones ──────────────────────────────────────── */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>
                Restricciones
                <span className="ml-2 font-normal text-muted-foreground">
                  ({fields.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center divide-y pt-0">
              {fields.map((fieldItem, index) => {
                const rowErrors = form.formState.errors.restrictions?.[index]
                const coeffsError = rowErrors?.coefficients

                return (
                  <div key={fieldItem.id} className="py-4 first:pt-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      {/* Índice de restricción */}
                      <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                        R{subscript(index + 1)}
                      </span>

                      {Array.from({ length: numVariables }).map(
                        (_, varIndex) => {
                          const key = `res-${index}-${varIndex}`
                          return (
                            <div
                              key={varIndex}
                              className="flex items-center gap-2"
                            >
                              <Controller
                                name={`restrictions.${index}.coefficients.${varIndex}`}
                                control={form.control}
                                render={({ field, fieldState }) => (
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    className="w-20"
                                    aria-invalid={fieldState.invalid}
                                    disabled={loading}
                                    value={cellDisplay(key, field.value)}
                                    onChange={(e) =>
                                      handleFractionChange(
                                        key,
                                        e.target.value,
                                        field.onChange
                                      )
                                    }
                                  />
                                )}
                              />
                              <span className="text-sm font-medium whitespace-nowrap">
                                x{subscript(varIndex + 1)}
                                {varIndex < numVariables - 1 && (
                                  <span className="ml-2 text-muted-foreground">
                                    +
                                  </span>
                                )}
                              </span>
                            </div>
                          )
                        }
                      )}

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
                              className="w-[64px]"
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
                        render={({ field, fieldState }) => {
                          const key = `val-${index}`
                          return (
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              className="w-24"
                              aria-invalid={fieldState.invalid}
                              disabled={loading}
                              value={cellDisplay(key, field.value)}
                              onChange={(e) =>
                                handleFractionChange(
                                  key,
                                  e.target.value,
                                  field.onChange
                                )
                              }
                            />
                          )
                        }}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        disabled={fields.length === 1 || loading}
                        onClick={() => {
                          remove(index)
                          form.setValue("nro_restrictions", fields.length - 1)
                        }}
                        aria-label="Eliminar restricción"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {rowErrors && (
                      <div className="mt-2 flex flex-col gap-1 border-l-2 border-destructive pl-3">
                        {Array.isArray(coeffsError) &&
                          coeffsError.map(
                            (err, i) =>
                              err && (
                                <FieldError key={i}>
                                  <span className="font-medium">
                                    x{subscript(i + 1)}:
                                  </span>{" "}
                                  {err.message}
                                </FieldError>
                              )
                          )}
                        {coeffsError &&
                          !Array.isArray(coeffsError) &&
                          "message" in coeffsError && (
                            <FieldError>
                              <span className="font-medium">
                                R{subscript(index + 1)}:
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
            </CardContent>
          </Card>

          {/* ── Calcular ───────────────────────────────────────────── */}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando…
              </>
            ) : (
              "Calcular"
            )}
          </Button>
        </form>

        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Historial de resultados
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Aquí puedes ver los resultados de tus modelos anteriores.
          </p>
        </div>

        {items.length > 0 ? (
          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const payload = item.payload
              const result = item.result
              const isOptimal = result?.status === "optimal"
              const methodLabel =
                item.type_optimization === "graphical"
                  ? "Método gráfico"
                  : "Método 2 pasos"

              return (
                <Card key={item.id}>
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{methodLabel}</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.created_at ? formatDate(item.created_at) : "-"}
                        </p>
                      </div>
                      <Badge variant={isOptimal ? "default" : "destructive"}>
                        {isOptimal ? "Óptimo" : result?.status ?? "Sin estado"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>{" "}
                        {payload?.optimization ?? "-"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Restricciones:
                        </span>{" "}
                        {payload?.nro_restrictions ?? "-"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Variables:
                        </span>{" "}
                        {payload?.nro_variables ?? "-"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Z:</span>{" "}
                        {formatFraction(result?.z)}
                      </div>
                    </div>

                    {payload?.coefficients && (
                      <div className="rounded-none border p-3 text-xs">
                        <p className="mb-1 font-medium text-muted-foreground">
                          Función objetivo
                        </p>
                        <p>
                          {payload.optimization} z ={" "}
                          {formatLinearExpression(payload.coefficients)}
                        </p>
                      </div>
                    )}

                    <div className="rounded-none border p-3 text-xs">
                      <p className="mb-1 font-medium text-muted-foreground">
                        Solución
                      </p>
                      {result?.solution &&
                      Object.keys(result.solution).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(result.solution).map(
                            ([variable, value]) => (
                              <Badge key={variable} variant="outline">
                                {variable} = {formatFraction(value as number)}
                              </Badge>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          Sin solución disponible
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      onClick={() =>
                        navigate(`/optimization/${item.type_optimization}/${item.id}`)
                      }
                    >
                      Ver más
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No hay resultados guardados todavía.
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            Anterior
          </Button>
          <p className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Home
