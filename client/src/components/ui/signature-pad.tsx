import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check, Pen } from "lucide-react";

interface SignaturePadProps {
  width?: number;
  height?: number;
  onSave: (signature: string) => void;
  onClear?: () => void;
  initialValue?: string | null;
  disabled?: boolean;
  label?: string;
}

export function SignaturePad({
  width = 400,
  height = 150,
  onSave,
  onClear,
  initialValue,
  disabled = false,
  label = "Sign here",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setIsEmpty(false);
      };
      img.src = initialValue;
    }
  }, [initialValue, width, height]);

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [width, height]
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setIsEmpty(false);
      setHasChanges(true);
    },
    [disabled, getCoordinates]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCoordinates(e);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, disabled, getCoordinates]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    setIsEmpty(true);
    setHasChanges(false);
    onClear?.();
  }, [onClear, width, height]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0, width, height);
      const dataUrl = tempCanvas.toDataURL("image/png");
      onSave(dataUrl);
      setHasChanges(false);
    }
  }, [onSave, width, height]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-sm font-medium flex items-center gap-1">
          <Pen className="h-3 w-3" aria-hidden="true" />
          {label}
        </label>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClear}
            disabled={disabled || isEmpty}
            data-testid="button-clear-signature"
          >
            <Eraser className="h-3 w-3 mr-1" aria-hidden="true" />
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={disabled || isEmpty || !hasChanges}
            data-testid="button-save-signature"
          >
            <Check className="h-3 w-3 mr-1" aria-hidden="true" />
            Save
          </Button>
        </div>
      </div>
      <div
        className={`border rounded-md overflow-hidden bg-white ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-crosshair"
        }`}
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ maxWidth: width, height: height }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          data-testid="canvas-signature"
        />
      </div>
      {isEmpty && (
        <p className="text-xs text-muted-foreground text-center">
          Draw your signature above
        </p>
      )}
    </div>
  );
}
