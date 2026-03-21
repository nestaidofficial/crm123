"use client"

import * as React from "react"
import SignaturePad from "signature_pad"
import { RotateCcw, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SignaturePadFieldProps {
  value?: string
  onChange?: (dataUrl: string | null) => void
  disabled?: boolean
  className?: string
}

export function SignaturePadField({
  value,
  onChange,
  disabled,
  className,
}: SignaturePadFieldProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const padRef = React.useRef<SignaturePad | null>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgba(0,0,0,0)",
      penColor: "#111827",
      minWidth: 0.5,
      maxWidth: 2.5,
    })
    padRef.current = pad

    if (disabled) {
      pad.off()
    }

    const resizeObserver = new ResizeObserver(() => {
      const ratio = Math.max(window.devicePixelRatio ?? 1, 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.scale(ratio, ratio)
      pad.clear()

      if (value) {
        const img = new Image()
        img.onload = () => {
          ctx?.drawImage(img, 0, 0, rect.width, rect.height)
        }
        img.src = value
      }
    })

    resizeObserver.observe(canvas)

    pad.addEventListener("endStroke", () => {
      const dataUrl = pad.isEmpty() ? null : pad.toDataURL("image/png")
      onChange?.(dataUrl)
    })

    return () => {
      resizeObserver.disconnect()
      pad.off()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  const handleClear = () => {
    padRef.current?.clear()
    onChange?.(null)
  }

  const handleUndo = () => {
    const pad = padRef.current
    if (!pad) return
    const data = pad.toData()
    if (data && data.length > 0) {
      data.pop()
      pad.fromData(data)
      const dataUrl = pad.isEmpty() ? null : pad.toDataURL("image/png")
      onChange?.(dataUrl)
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative rounded-sm border border-dashed border-neutral-300 bg-neutral-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: 140, display: "block" }}
        />
        {!value && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-neutral-400 select-none">
            Sign here
          </span>
        )}
      </div>
      {!disabled && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleUndo}
          >
            <Undo2 className="h-3 w-3" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleClear}
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
