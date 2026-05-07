import Grafic from "@/components/home/Grafic"
import Init from "@/components/home/Init"
import Matrix from "@/components/home/Matrix"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"

export function Home() {
  const [open, setOpen] = useState(true)
  const [methodology, setMethodology] = useState<"grafic" | "matrix">("grafic")
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center px-12">
      <div className="flex w-full items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Problema de optimizacion</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus /> Crear problema
        </Button>
      </div>
      <Init onSelect={setMethodology} open={open} setOpen={setOpen} />
      {methodology === "grafic" && <Grafic />}
      {methodology === "matrix" && <Matrix />}
    </div>
  )
}

export default Home
