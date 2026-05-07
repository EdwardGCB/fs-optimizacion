import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraficSchema } from "@/utils/schemas/Grafic"
import {
  Controller,
  useFieldArray,
  useForm,
  type FieldArrayWithId,
} from "react-hook-form"
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
import { Loader2, Plus, Trash2 } from "lucide-react"
import GraficService from "@/services/GraficService"
import { useEffect, useState } from "react"

function Grafic() {
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof GraficSchema>>({
    resolver: zodResolver(GraficSchema),
    defaultValues: {
      restrictions: [
        {
          coefficient1: null,
          coefficient2: null,
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
  const onSubmit = (data: z.infer<typeof GraficSchema>) => {
    setLoading(true)
    GraficService.create(data)
      .then((res) => {
        /* TODO: Mostrar el resultado en el grafico */
        console.log("✅ Grafico:", res)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    console.log(JSON.stringify(form.formState.errors, null, 2))
  }, [form.formState.errors])

  const parseNullable = (v: string) =>
    v === "" ? null : Number.isNaN(Number(v)) ? null : Number(v)

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-4"
    >
      <h1 className="text-2xl font-bold">Grafico</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            Usuario, por favor complete el formulario, unicamente se utilizan 2
            variables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel>Funcion objetivo</FieldLabel>
            <FieldContent>
              {/* Fila con todo en línea */}
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

                <Controller
                  name="coefficient1"
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

                <span className="text-lg font-medium whitespace-nowrap">
                  x₁ +
                </span>

                <Controller
                  name="coefficient2"
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

                <span className="text-lg font-medium">x₂</span>
              </div>

              {/* Errores debajo de la fila */}
              {(form.formState.errors.optimization ||
                form.formState.errors.coefficient1 ||
                form.formState.errors.coefficient2) && (
                <div className="mt-2 flex flex-col gap-1">
                  {form.formState.errors.optimization && (
                    <FieldError>
                      <span className="font-medium">MIN/MAX:</span>{" "}
                      {form.formState.errors.optimization.message}
                    </FieldError>
                  )}
                  {form.formState.errors.coefficient1 && (
                    <FieldError>
                      <span className="font-medium">Coeficiente x₁:</span>{" "}
                      {form.formState.errors.coefficient1.message}
                    </FieldError>
                  )}
                  {form.formState.errors.coefficient2 && (
                    <FieldError>
                      <span className="font-medium">Coeficiente x₂:</span>{" "}
                      {form.formState.errors.coefficient2.message}
                    </FieldError>
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

      <Card>
        <CardHeader>
          <CardTitle>Restricciones</CardTitle>
        </CardHeader>
        <CardContent className="flex w-full flex-col items-center justify-center gap-3">
          {fields.map(
            (
              fieldItem: FieldArrayWithId<
                z.infer<typeof GraficSchema>,
                "restrictions",
                "id"
              >,
              index: number
            ) => {
              const rowErrors = form.formState.errors.restrictions?.[index]

              return (
                <div key={fieldItem.id} className="flex flex-col gap-1">
                  {/* Fila de inputs */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Controller
                      name={`restrictions.${index}.coefficient1`}
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
                      x₁ +
                    </span>

                    <Controller
                      name={`restrictions.${index}.coefficient2`}
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
                    <span className="text-lg font-medium">x₂</span>

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

                  {/* Errores de esta fila */}
                  {rowErrors && (
                    <div className="flex flex-col gap-1 pl-1">
                      {rowErrors.coefficient1 && (
                        <FieldError>
                          <span className="font-medium">
                            Restricción {index + 1}:
                          </span>{" "}
                          {rowErrors.coefficient1.message}
                        </FieldError>
                      )}
                      {rowErrors.coefficient2 && (
                        <FieldError>
                          <span className="font-medium">Coeficiente x₂:</span>{" "}
                          {rowErrors.coefficient2.message}
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
            }
          )}

          <Button
            type="button"
            className="w-full"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() =>
              append({
                coefficient1: null,
                coefficient2: null,
                operator: "<=",
                value: undefined,
              })
            }
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

export default Grafic
