import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import GraficService from "@/services/Service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

function formatFraction(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"

  const rounded = Math.round(value)
  if (Math.abs(value - rounded) < 1e-9) return String(rounded)

  const sign = value < 0 ? "-" : ""
  let x = Math.abs(value)

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

function ResultTwoSteps() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    setLoading(true)

    GraficService.get("two_steps", id)
      .then((res) => {
        setData(res)
      })
      .catch((err) => {
        console.error("Error consultando resultado:", err)
      })
      .finally(() => setLoading(false))
  }, [])

  if (!id) {
    return <div>Parámetros inválidos</div>
  }

  if (loading) {
    return <div>Cargando resultado...</div>
  }

  const result = data?.data?.result
  const iterations = result?.iterations ?? []
  const payload = data?.data?.payload
  const phaseOneSetup = result?.phase_one_setup
  const phaseTwoSetup = result?.phase_two_setup

  const status = result?.status
  const z = result?.z
  const solution = result?.solution ?? {}

  return (
    <div className="min-h-svh p-8 space-y-4">
      <Button variant="outline" asChild>
        <Link to="/">
          <ArrowLeftIcon className="size-4" />
          Volver
        </Link>
      </Button>
      <Separator />
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Método dos pasos
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Resultado de optimización
          </h1>
        </div>

        {payload && (
          <Card>
            <CardHeader>
              <CardTitle>Modelo ingresado</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">Método:</span>{" "}
                  {payload.type_optimization}
                </div>

                <div>
                  <span className="text-muted-foreground">Optimización:</span>{" "}
                  {payload.optimization}
                </div>

                <div>
                  <span className="text-muted-foreground">Variables:</span>{" "}
                  {payload.nro_variables}
                </div>

                <div>
                  <span className="text-muted-foreground">Restricciones:</span>{" "}
                  {payload.nro_restrictions}
                </div>
              </div>

              <div className="rounded-none border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Función objetivo
                </p>

                <p className="text-sm">
                  {payload.optimization} z ={" "}
                  {payload.coefficients.map((value: number, index: number) => (
                    <span key={index}>
                      {index > 0 && " + "}
                      {formatFraction(value)}X{index + 1}
                    </span>
                  ))}
                </p>
              </div>

              <div className="rounded-none border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Restricciones
                </p>

                <div className="space-y-2 text-sm">
                  {payload.restrictions.map(
                    (restriction: any, rowIndex: number) => (
                      <div key={rowIndex}>
                        <span className="text-muted-foreground">
                          R{rowIndex + 1}:{" "}
                        </span>

                        {restriction.coefficients.map(
                          (value: number, colIndex: number) => (
                            <span key={colIndex}>
                              {colIndex > 0 && " + "}
                              {formatFraction(value)}X{colIndex + 1}
                            </span>
                          )
                        )}

                        <span>
                          {" "}
                          {restriction.operator}{" "}
                          {formatFraction(restriction.value)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Solución</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Estado:</span>{" "}
                  <Badge variant={status === "optimal" ? "default" : "outline"}>
                    {status === "optimal" ? "Óptimo" : "No factible"}
                  </Badge>
                </div>

                <div>
                  <span className="text-muted-foreground">Valor óptimo Z:</span>{" "}
                  {formatFraction(z)}
                </div>
              </div>

              <div className="rounded-none border p-3">
                <div className="flex flex-col gap-2 text-sm">
                  {Object.entries(solution).map(([variable, value]) => (
                    <p key={variable}>
                      <span className="font-medium">{variable}</span> ={" "}
                      {formatFraction(value as number)}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {phaseOneSetup && (
          <Card>
            <CardHeader>
              <CardTitle>Planteamiento de la Fase 1</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-none border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Función objetivo auxiliar
                </p>

                <p className="text-sm font-medium">
                  {phaseOneSetup.objective_text}
                </p>
              </div>

              <div className="rounded-none border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Restricciones transformadas
                </p>

                <div className="space-y-2 text-sm">
                  {phaseOneSetup.restrictions.map(
                    (restriction: any, index: number) => (
                      <p key={index}>
                        <span className="text-muted-foreground">
                          R{index + 1}:{" "}
                        </span>
                        {restriction.text}
                      </p>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {iterations.map((iteration: any, index: number) => {
          const showPhaseTwoSetup =
            iteration.phase === 2 &&
            iterations[index - 1]?.phase !== 2 &&
            phaseTwoSetup
          return (
            <div
              key={`${iteration.phase}-${iteration.iteration}`}
              className="flex flex-col gap-4"
            >
              {showPhaseTwoSetup && (
                <Card>
                  <CardHeader>
                    <CardTitle>Fase 2 - Planteamiento</CardTitle>
                    <CardContent className="space-y-4">
                      <div className="rounded-none border p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Función objetivo auxiliar
                        </p>

                        <p className="text-sm font-medium">
                          {showPhaseTwoSetup.objective_text}
                        </p>
                      </div>

                      <div className="rounded-none border p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Restricciones transformadas
                        </p>

                        <div className="space-y-2 text-sm">
                          {showPhaseTwoSetup.restrictions.map(
                            (restriction: any, index: number) => (
                              <p key={index}>
                                <span className="text-muted-foreground">
                                  R{index + 1}:{" "}
                                </span>
                                {restriction.text}
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CardHeader>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Fase {iteration.phase} - Iteración {iteration.iteration + 1}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    {iteration.description}
                  </p>

                  <div className="overflow-x-auto">
                    <Table className="w-full table-fixed border">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20 border text-center">
                            Cb
                          </TableHead>

                          {iteration.variables.map(
                            (variable: string, colIndex: number) => {
                              const isPivotColumn =
                                iteration.pivot?.column_index === colIndex

                              return (
                                <TableHead
                                  key={variable}
                                  className={[
                                    "w-24 border text-center",
                                    isPivotColumn
                                      ? "bg-primary/40 text-primary-foreground"
                                      : "",
                                  ].join(" ")}
                                >
                                  {variable}
                                </TableHead>
                              )
                            }
                          )}
                          <TableHead className="w-24 border text-center">
                            Base
                          </TableHead>
                          <TableHead className="w-24 border text-center">
                            bi
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {iteration.rows.map((row: any, rowIndex: number) => {
                          const isPivotRow =
                            iteration.pivot?.row_index === rowIndex

                          return (
                            <TableRow
                              key={row.label}
                              className={isPivotRow ? "bg-primary/40" : ""}
                            >
                              <TableCell className="border text-center">
                                {formatFraction(row.cb)}
                              </TableCell>

                              {row.coefficients.map(
                                (value: number, colIndex: number) => {
                                  const isPivotColumn =
                                    iteration.pivot?.column_index === colIndex
                                  const isPivotCell =
                                    isPivotColumn && isPivotRow

                                  return (
                                    <TableCell
                                      key={colIndex}
                                      className={[
                                        "border text-center",
                                        isPivotColumn ? "bg-primary/40" : "",
                                        isPivotRow ? "bg-primary/40" : "",
                                        isPivotCell
                                          ? "bg-primary/40 font-bold ring-2 ring-primary"
                                          : "",
                                      ].join(" ")}
                                    >
                                      {formatFraction(value)}
                                    </TableCell>
                                  )
                                }
                              )}

                              <TableCell className="border text-center font-medium">
                                {row.basic_var}
                              </TableCell>
                              <TableCell className="border text-center">
                                {formatFraction(row.bi)}
                              </TableCell>
                            </TableRow>
                          )
                        })}

                        <TableRow>
                          <TableCell
                            colSpan={1}
                            className="border text-center font-medium"
                          >
                            Zj - Cj
                          </TableCell>

                          {iteration.zj_cj.map(
                            (value: number, colIndex: number) => {
                              const isPivotColumn =
                                iteration.pivot?.column_index === colIndex

                              return (
                                <TableCell
                                  key={colIndex}
                                  className={[
                                    "border text-center",
                                    isPivotColumn ? "bg-primary/40" : "",
                                  ].join(" ")}
                                >
                                  {formatFraction(value)}
                                </TableCell>
                              )
                            }
                          )}

                          <TableCell
                            colSpan={2}
                            className="border text-center font-medium"
                          >
                            Z = {formatFraction(iteration.z)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ResultTwoSteps
