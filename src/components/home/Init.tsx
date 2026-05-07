import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function Init({ onSelect, open, setOpen }: { onSelect: (option: "grafic" | "matrix") => void, open: boolean, setOpen: (open: boolean) => void }) {
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¡Bienvenido!</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <p>Seleccione la metodologia para la optimizacion de su problema</p>
                    <Button onClick={() => {onSelect("grafic"); setOpen(false)}} className="w-full">Grafico</Button>
                    <Button onClick={() => {onSelect("matrix"); setOpen(false)}} className="w-full">Matricial</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default Init