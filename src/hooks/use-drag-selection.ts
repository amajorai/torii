import { useCallback, useRef, useState } from "react";

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragSelectionOptions {
  dataAttribute: string;
  onEnableSelectionMode?: () => void;
  onSelectionChange: (ids: string[]) => void;
  onClearSelection?: () => void;
  isSelectionMode: boolean;
}

interface DragSelectionResult {
  selectionBox: SelectionBox | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollerRef: React.MutableRefObject<HTMLDivElement | null>;
  handleMouseDown: (e: React.MouseEvent) => void;
  justEnteredSelectionMode: React.MutableRefObject<boolean>;
}

export function useDragSelection({
  dataAttribute,
  onEnableSelectionMode,
  onSelectionChange,
  onClearSelection,
  isSelectionMode,
}: DragSelectionOptions): DragSelectionResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const justEnteredSelectionMode = useRef(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const container = scrollerRef.current;
      if (!container) return;

      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest(`[${dataAttribute}]`)) return;
      if (e.button !== 0) return;

      isDragging.current = true;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + container.scrollLeft;
      const y = e.clientY - rect.top + container.scrollTop;
      startPoint.current = { x, y };

      if (!isSelectionMode) {
        justEnteredSelectionMode.current = true;
        onEnableSelectionMode?.();
      }

      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
        onClearSelection?.();
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!(isDragging.current && startPoint.current)) return;

        const rect = container.getBoundingClientRect();
        const currentX = e.clientX - rect.left + container.scrollLeft;
        const currentY = e.clientY - rect.top + container.scrollTop;

        const x = Math.min(currentX, startPoint.current.x);
        const y = Math.min(currentY, startPoint.current.y);
        const width = Math.abs(currentX - startPoint.current.x);
        const height = Math.abs(currentY - startPoint.current.y);

        setSelectionBox({ x, y, width, height });

        const boxRect = { left: x, top: y, right: x + width, bottom: y + height };
        const newSelectedIds: string[] = [];

        const elements = container.querySelectorAll(`[${dataAttribute}]`);
        for (const el of elements) {
          const elRect = (el as HTMLElement).getBoundingClientRect();
          const elRelLeft = elRect.left - rect.left + container.scrollLeft;
          const elRelTop = elRect.top - rect.top + container.scrollTop;
          const elRelRight = elRelLeft + elRect.width;
          const elRelBottom = elRelTop + elRect.height;

          const isIntersecting =
            boxRect.left < elRelRight &&
            boxRect.right > elRelLeft &&
            boxRect.top < elRelBottom &&
            boxRect.bottom > elRelTop;

          if (isIntersecting) {
            const id = el.getAttribute(dataAttribute);
            if (id) newSelectedIds.push(id);
          }
        }

        onSelectionChange(newSelectedIds);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        startPoint.current = null;
        setSelectionBox(null);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [dataAttribute, isSelectionMode, onEnableSelectionMode, onSelectionChange, onClearSelection],
  );

  return { selectionBox, containerRef, scrollerRef, handleMouseDown, justEnteredSelectionMode };
}
