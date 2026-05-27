import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import GraficService from "@/services/Service"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"

type Point = {
  x: number
  y: number
}

function formatFraction(value: number | null | undefined) {
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

function formatPoint(point?: Point | null) {
  if (!point) return "-"
  return `(${formatFraction(point.x)}, ${formatFraction(point.y)})`
}

function formatLinearExpression(coefficients: number[], variables: string[]) {
  const terms = coefficients
    .map((value, index) => {
      if (Math.abs(value) < 1e-9) return null

      const sign = value < 0 ? "-" : "+"
      const absValue = Math.abs(value)
      const coefficient = Math.abs(absValue - 1) < 1e-9 ? "" : formatFraction(absValue)

      return {
        sign,
        text: `${coefficient}${variables[index] ?? `X${index + 1}`}`,
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

function GraphicalPlot({ result }: { result: any }) {
  const restrictions = result?.restrictions ?? []
  const intersections = result?.intersection_points ?? []
  const feasibleVertices = result?.feasible_vertices ?? []
  const optimalPoint = result?.optimal_point
  const objectiveLine = result?.objective_line

  const allPoints: Point[] = [
    { x: 0, y: 0 },
    ...restrictions.flatMap((restriction: any) => restriction.plot_points ?? []),
    ...intersections,
    ...feasibleVertices,
    ...(objectiveLine?.plot_points ?? []),
    ...(optimalPoint ? [optimalPoint] : []),
  ].filter(
    (point) =>
      Number.isFinite(point?.x) &&
      Number.isFinite(point?.y)
  )

  const minX = Math.min(0, ...allPoints.map((point) => point.x))
  const maxX = Math.max(1, ...allPoints.map((point) => point.x))
  const minY = Math.min(0, ...allPoints.map((point) => point.y))
  const maxY = Math.max(1, ...allPoints.map((point) => point.y))
  const padX = Math.max((maxX - minX) * 0.12, 1)
  const padY = Math.max((maxY - minY) * 0.12, 1)

  const domain = {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
  }

  const width = 760
  const height = 420
  const padding = 44
  const plotWidth = width - padding * 2
  const plotHeight = height - padding * 2

  const toSvgX = (x: number) =>
    padding + ((x - domain.minX) / (domain.maxX - domain.minX)) * plotWidth
  const toSvgY = (y: number) =>
    height - padding - ((y - domain.minY) / (domain.maxY - domain.minY)) * plotHeight

  const axisX = toSvgY(0)
  const axisY = toSvgX(0)

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[760px] text-xs"
        role="img"
        aria-label="Gráfico del método gráfico"
      >
        <rect width={width} height={height} className="fill-background" />

        {Array.from({ length: 7 }).map((_, index) => {
          const x = padding + (plotWidth / 6) * index
          const y = padding + (plotHeight / 6) * index

          return (
            <g key={index} className="text-muted-foreground/40">
              <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="currentColor" />
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" />
            </g>
          )
        })}

        <line
          x1={padding}
          y1={axisX}
          x2={width - padding}
          y2={axisX}
          className="stroke-foreground"
          strokeWidth="1.5"
        />
        <line
          x1={axisY}
          y1={padding}
          x2={axisY}
          y2={height - padding}
          className="stroke-foreground"
          strokeWidth="1.5"
        />

        <text x={width - padding + 8} y={axisX + 4} className="fill-muted-foreground">
          X1
        </text>
        <text x={axisY - 10} y={padding - 12} className="fill-muted-foreground">
          X2
        </text>

        {restrictions.map((restriction: any, index: number) => {
          const [start, end] = restriction.plot_points ?? []
          if (!start || !end) return null

          return (
            <g key={restriction.index ?? index}>
              <line
                x1={toSvgX(start.x)}
                y1={toSvgY(start.y)}
                x2={toSvgX(end.x)}
                y2={toSvgY(end.y)}
                className="stroke-primary"
                strokeWidth="2"
              />
              <text
                x={toSvgX(end.x) + 8}
                y={toSvgY(end.y) - 8}
                className="fill-primary font-medium"
              >
                R{index + 1}
              </text>
            </g>
          )
        })}

        {objectiveLine?.plot_points?.length >= 2 && (
          <polyline
            points={objectiveLine.plot_points
              .map((point: Point) => `${toSvgX(point.x)},${toSvgY(point.y)}`)
              .join(" ")}
            fill="none"
            className="stroke-destructive"
            strokeDasharray="8 6"
            strokeWidth="2"
          />
        )}

        {intersections.map((point: any) => (
          <g key={point.label}>
            <circle
              cx={toSvgX(point.x)}
              cy={toSvgY(point.y)}
              r={point.feasible ? 5 : 3.5}
              className={point.feasible ? "fill-primary" : "fill-muted-foreground"}
            />
            <text
              x={toSvgX(point.x) + 8}
              y={toSvgY(point.y) - 8}
              className={point.feasible ? "fill-primary font-medium" : "fill-muted-foreground"}
            >
              {point.label}
            </text>
          </g>
        ))}

        {optimalPoint && (
          <g>
            <circle
              cx={toSvgX(optimalPoint.x)}
              cy={toSvgY(optimalPoint.y)}
              r="8"
              fill="none"
              className="stroke-destructive"
              strokeWidth="2.5"
            />
            <text
              x={toSvgX(optimalPoint.x) + 10}
              y={toSvgY(optimalPoint.y) + 18}
              className="fill-destructive font-semibold"
            >
              {optimalPoint.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

function ResultGraphical() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    setLoading(true)

    GraficService.get("graphical", id)
      .then((res) => {
        setData(res)
      })
      .catch((err) => {
        console.error("Error consultando resultado:", err)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (!id) {
    return <div className="p-8">Parámetros inválidos</div>
  }

  if (loading) {
    return <div className="p-8">Cargando resultado...</div>
  }

  const payload = data?.data?.payload
  const result = data?.data?.result
  const restrictions = result?.restrictions ?? []
  const intersections = result?.intersection_points ?? []
  const feasibleVertices = result?.feasible_vertices ?? []
  const solution = result?.solution ?? {}
  const variables = ["X1", "X2"]

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
            Método gráfico
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
                  <span className="text-muted-foreground">Método:</span> Gráfico
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

              <div className="rounded-none border p-3 text-sm">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Función objetivo
                </p>
                {payload.optimization} z ={" "}
                {formatLinearExpression(payload.coefficients, variables)}
              </div>

              <div className="rounded-none border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Restricciones originales
                </p>
                <div className="space-y-2 text-sm">
                  {payload.restrictions.map(
                    (restriction: any, index: number) => (
                      <p key={index}>
                        <span className="text-muted-foreground">
                          R{index + 1}:{" "}
                        </span>
                        {formatLinearExpression(
                          restriction.coefficients,
                          variables
                        )}{" "}
                        {restriction.operator}{" "}
                        {formatFraction(restriction.value)}
                      </p>
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
              <CardTitle>Solución óptima</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Estado:</span>{" "}
                  <Badge
                    variant={
                      result.status === "optimal" ? "default" : "outline"
                    }
                  >
                    {result.status === "optimal" ? "Óptimo" : "No factible"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor óptimo Z:</span>{" "}
                  {formatFraction(result.z)}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-none border p-3 text-sm">
                {Object.entries(solution).map(([variable, value]) => (
                  <div key={variable} className="">
                    <span className="font-medium">{variable}</span> ={" "}
                    {formatFraction(value as number)}
                  </div>
                ))}
              </div>

              {result.optimal_point?.reason && (
                <p className="border-l-2 border-primary pl-3 text-xs text-muted-foreground">
                  {result.optimal_point.reason}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Restricciones e intersecciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="table-fixed border">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 border text-center">R</TableHead>
                  <TableHead className="w-48 border text-center">
                    Restricción
                  </TableHead>
                  <TableHead className="w-40 border text-center">
                    Corte X1
                  </TableHead>
                  <TableHead className="w-40 border text-center">
                    Corte X2
                  </TableHead>
                  <TableHead className="w-48 border text-center">
                    Puntos de línea
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restrictions.map((restriction: any, index: number) => (
                  <TableRow key={restriction.index ?? index}>
                    <TableCell className="border text-center font-medium">
                      R{index + 1}
                    </TableCell>
                    <TableCell className="border text-center">
                      {restriction.text}
                    </TableCell>
                    <TableCell className="border text-center">
                      {formatPoint(restriction.intercept_x)}
                      <div className="text-muted-foreground">
                        {restriction.intercept_x?.calculation}
                      </div>
                    </TableCell>
                    <TableCell className="border text-center">
                      {formatPoint(restriction.intercept_y)}
                      <div className="text-muted-foreground">
                        {restriction.intercept_y?.calculation}
                      </div>
                    </TableCell>
                    <TableCell className="border text-center">
                      {(restriction.plot_points ?? [])
                        .map((point: Point) => formatPoint(point))
                        .join(" ; ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Puntos de intersección</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="table-fixed border">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 border text-center">
                    Punto
                  </TableHead>
                  <TableHead className="w-24 border text-center">X1</TableHead>
                  <TableHead className="w-24 border text-center">X2</TableHead>
                  <TableHead className="w-24 border text-center">Z</TableHead>
                  <TableHead className="w-28 border text-center">
                    Factible
                  </TableHead>
                  <TableHead className="w-40 border text-center">
                    Origen
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intersections.map((point: any) => (
                  <TableRow
                    key={point.label}
                    className={point.feasible ? "bg-primary/15" : ""}
                  >
                    <TableCell className="border text-center font-medium">
                      {point.label}
                    </TableCell>
                    <TableCell className="border text-center">
                      {formatFraction(point.x)}
                    </TableCell>
                    <TableCell className="border text-center">
                      {formatFraction(point.y)}
                    </TableCell>
                    <TableCell className="border text-center">
                      {formatFraction(point.z)}
                    </TableCell>
                    <TableCell className="border text-center">
                      <Badge variant={point.feasible ? "default" : "outline"}>
                        {point.feasible ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="border text-center">
                      {(point.from_lines ?? []).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vértices factibles</CardTitle>
          </CardHeader>
          <CardContent>
            {feasibleVertices.length ? (
              <Table className="table-fixed border">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 border text-center">
                      Punto
                    </TableHead>
                    <TableHead className="w-24 border text-center">
                      X1
                    </TableHead>
                    <TableHead className="w-24 border text-center">
                      X2
                    </TableHead>
                    <TableHead className="w-24 border text-center">Z</TableHead>
                    <TableHead className="w-40 border text-center">
                      Origen
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feasibleVertices.map((point: any) => (
                    <TableRow key={point.label}>
                      <TableCell className="border text-center font-medium">
                        {point.label}
                      </TableCell>
                      <TableCell className="border text-center">
                        {formatFraction(point.x)}
                      </TableCell>
                      <TableCell className="border text-center">
                        {formatFraction(point.y)}
                      </TableCell>
                      <TableCell className="border text-center">
                        {formatFraction(point.z)}
                      </TableCell>
                      <TableCell className="border text-center">
                        {(point.from_lines ?? []).join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay vértices factibles para este modelo.
              </p>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Gráfico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GraphicalPlot result={result} />
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="default">Restricciones</Badge>
                <Badge variant="destructive">Recta objetivo</Badge>
                <Badge variant="outline">Puntos no factibles</Badge>
                <Badge variant="secondary">Puntos factibles</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ResultGraphical