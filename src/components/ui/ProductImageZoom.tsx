import { useState, useRef, useEffect, useCallback, type MouseEvent, type TouchEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, X, ChevronLeft, ChevronRight, Maximize2, Move, Sparkles } from "lucide-react";

export type ProductImageZoomProps = {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  status?: string;
  images?: string[];
  productTitle?: string;
  onSelectImage?: (img: string) => void;
};

export function ProductImageZoom({
  src,
  alt,
  className = "",
  containerClassName = "",
  status,
  images = [],
  productTitle = "Follicia Footwear",
  onSelectImage,
}: ProductImageZoomProps) {
  // Desktop inline hover zoom state
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPos, setHoverPos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen modal state
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [modalScale, setModalScale] = useState(1);
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  // Touch pinch-to-zoom state
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef(1);
  const lastTapRef = useRef<number>(0);

  // Gallery list including active src
  const allImages = Array.from(new Set([src, ...(images || [])].filter(Boolean)));
  const currentIdx = Math.max(0, allImages.indexOf(src));

  // Reset modal transform when opening or changing image
  useEffect(() => {
    if (isFullscreenOpen) {
      setModalScale(1);
      setModalOffset({ x: 0, y: 0 });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreenOpen, src]);

  // Keyboard navigation for fullscreen modal
  useEffect(() => {
    if (!isFullscreenOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreenOpen(false);
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "+" || e.key === "=") {
        zoomIn();
      } else if (e.key === "-") {
        zoomOut();
      } else if (e.key === "0") {
        resetZoom();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenOpen, currentIdx, allImages.length]);

  const goToNext = useCallback(() => {
    if (allImages.length <= 1) return;
    const nextIdx = (currentIdx + 1) % allImages.length;
    onSelectImage?.(allImages[nextIdx]);
    setModalScale(1);
    setModalOffset({ x: 0, y: 0 });
  }, [allImages, currentIdx, onSelectImage]);

  const goToPrev = useCallback(() => {
    if (allImages.length <= 1) return;
    const prevIdx = (currentIdx - 1 + allImages.length) % allImages.length;
    onSelectImage?.(allImages[prevIdx]);
    setModalScale(1);
    setModalOffset({ x: 0, y: 0 });
  }, [allImages, currentIdx, onSelectImage]);

  // Zoom helpers
  const zoomIn = () => {
    setModalScale((prev) => Math.min(prev + 0.6, 4));
  };

  const zoomOut = () => {
    setModalScale((prev) => {
      const next = Math.max(prev - 0.6, 1);
      if (next === 1) setModalOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const resetZoom = () => {
    setModalScale(1);
    setModalOffset({ x: 0, y: 0 });
  };

  const toggleZoom = () => {
    if (modalScale > 1.2) {
      resetZoom();
    } else {
      setModalScale(2.4);
    }
  };

  // Inline Desktop Mouse Move Handler
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setHoverPos({ x, y });
  };

  // Modal Mouse Drag Handlers
  const handleModalMouseDown = (e: MouseEvent) => {
    if (modalScale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: modalOffset.x,
      origY: modalOffset.y,
    };
  };

  const handleModalMouseMove = (e: MouseEvent) => {
    if (!isDragging || modalScale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const maxBound = (modalScale - 1) * 350;
    setModalOffset({
      x: Math.max(-maxBound, Math.min(maxBound, dragStartRef.current.origX + dx)),
      y: Math.max(-maxBound, Math.min(maxBound, dragStartRef.current.origY + dy)),
    });
  };

  const handleModalMouseUp = () => {
    setIsDragging(false);
  };

  // Modal Wheel Zoom
  const handleModalWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setModalScale((prev) => Math.min(prev + 0.3, 4));
    } else {
      setModalScale((prev) => {
        const next = Math.max(prev - 0.3, 1);
        if (next === 1) setModalOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mobile Touch Gestures
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = modalScale;
    } else if (e.touches.length === 1) {
      // Single tap / double-tap detection
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        toggleZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // Start drag
      if (modalScale > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          origX: modalOffset.x,
          origY: modalOffset.y,
        };
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      // Pinch move
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      const nextScale = Math.max(1, Math.min(4, touchStartScaleRef.current * factor));
      setModalScale(nextScale);
      if (nextScale === 1) setModalOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && modalScale > 1) {
      // Drag move
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      const maxBound = (modalScale - 1) * 300;
      setModalOffset({
        x: Math.max(-maxBound, Math.min(maxBound, dragStartRef.current.origX + dx)),
        y: Math.max(-maxBound, Math.min(maxBound, dragStartRef.current.origY + dy)),
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    setIsDragging(false);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* INLINE PRODUCT STAGE (Desktop Hover Lens + Click/Tap to Fullscreen Zoom)   */}
      {/* ========================================================================= */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setHoverPos({ x: 50, y: 50 });
        }}
        onMouseMove={handleMouseMove}
        onClick={() => setIsFullscreenOpen(true)}
        className={`relative w-full overflow-hidden select-none cursor-zoom-in group ${containerClassName}`}
        role="button"
        tabIndex={0}
        aria-label="Click or tap to view high-resolution zoom"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFullscreenOpen(true);
          }
        }}
      >
        {/* Main Product Image with Smooth Transform Origin & Zoom Scaling */}
        <div className="h-full w-full flex items-center justify-center p-2.5 sm:p-6 overflow-hidden bg-white">
          <img
            src={src}
            alt={alt}
            style={{
              transformOrigin: `${hoverPos.x}% ${hoverPos.y}%`,
              transform: isHovered ? "scale(2.15)" : "scale(1)",
            }}
            className={`h-full w-full object-contain transition-transform duration-200 ease-out will-change-transform ${className}`}
          />
        </div>

        {/* Status Badge */}
        {status && (
          <div className="absolute bottom-2.5 left-2.5 z-10 rounded-md bg-white/95 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4b261a90] border border-black/5 shadow-2xs pointer-events-none">
            {status === "Live" ? "AVAILABLE" : status.toUpperCase()}
          </div>
        )}

        {/* Hover / Tap Zoom Floating Cue Pill */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[9.5px] font-semibold text-[#24130d] border border-[#4b261a15] shadow-xs transition-all duration-300 group-hover:bg-[#24130d] group-hover:text-white group-hover:scale-105 pointer-events-none">
          <Maximize2 size={11} className="transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Zoom Fullscreen</span>
          <span className="sm:hidden">Tap to Zoom</span>
        </div>

        {/* Mobile quick zoom icon indicator */}
        <div className="absolute bottom-2.5 right-2.5 z-10 sm:hidden flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs shadow-md pointer-events-none">
          <ZoomIn size={13} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* IMMERSIVE FULLSCREEN LUXURY ZOOM LIGHTBOX MODAL                           */}
      {/* ========================================================================= */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isFullscreenOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[99999] bg-[#140b08]/95 backdrop-blur-xl flex flex-col justify-between select-none touch-none"
                onMouseMove={handleModalMouseMove}
                onMouseUp={handleModalMouseUp}
              >
                {/* --- TOP HEADER BAR --- */}
                <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 border-b border-white/10 bg-black/40 backdrop-blur-md z-30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--gold)] flex items-center gap-1">
                      <Sparkles size={12} />
                      <span>Follicia Footwear</span>
                    </span>
                    <span className="text-white/30 hidden xs:inline">·</span>
                    <h2 className="text-xs sm:text-sm font-display text-white font-medium truncate max-w-[200px] xs:max-w-xs sm:max-w-md">
                      {productTitle}
                    </h2>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Zoom Percentage Badge */}
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-mono font-semibold text-white/80 border border-white/10 hidden sm:inline-block">
                      {Math.round(modalScale * 100)}%
                    </span>

                    {/* Zoom Out Button */}
                    <button
                      type="button"
                      onClick={zoomOut}
                      disabled={modalScale <= 1}
                      title="Zoom Out (-)"
                      className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ZoomOut size={15} />
                    </button>

                    {/* Zoom In Button */}
                    <button
                      type="button"
                      onClick={zoomIn}
                      disabled={modalScale >= 4}
                      title="Zoom In (+)"
                      className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ZoomIn size={15} />
                    </button>

                    {/* Reset Button */}
                    <button
                      type="button"
                      onClick={resetZoom}
                      title="Reset View (0)"
                      className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                    >
                      <RotateCcw size={14} />
                    </button>

                    {/* Close Modal Button */}
                    <button
                      type="button"
                      onClick={() => setIsFullscreenOpen(false)}
                      title="Close Zoom View (Esc)"
                      className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-white text-[#140b08] hover:bg-[var(--gold)] transition-colors cursor-pointer ml-1 font-bold shadow-md"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>

                {/* --- CENTER HIGH-DEF CANVAS --- */}
                <div
                  className={`relative flex-1 w-full flex items-center justify-center overflow-hidden p-4 sm:p-10 ${
                    modalScale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
                  }`}
                  onWheel={handleModalWheel}
                  onMouseDown={handleModalMouseDown}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onDoubleClick={toggleZoom}
                >
                  <motion.div
                    animate={{
                      scale: modalScale,
                      x: modalOffset.x,
                      y: modalOffset.y,
                    }}
                    transition={{
                      type: isDragging ? "tween" : "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="relative max-h-full max-w-full flex items-center justify-center will-change-transform"
                  >
                    <img
                      src={src}
                      alt={alt}
                      draggable={false}
                      className="max-h-[75vh] max-w-[88vw] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] select-none pointer-events-none"
                    />
                  </motion.div>

                  {/* Previous Photo Button */}
                  {allImages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrev();
                      }}
                      title="Previous Angle"
                      className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 transition-all hover:scale-105 cursor-pointer shadow-xl"
                    >
                      <ChevronLeft size={22} />
                    </button>
                  )}

                  {/* Next Photo Button */}
                  {allImages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNext();
                      }}
                      title="Next Angle"
                      className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 transition-all hover:scale-105 cursor-pointer shadow-xl"
                    >
                      <ChevronRight size={22} />
                    </button>
                  )}
                </div>

                {/* --- BOTTOM CONTROLS & THUMBNAILS STRIP --- */}
                <div className="px-4 sm:px-8 py-3 bg-black/50 border-t border-white/10 backdrop-blur-md z-30 flex flex-col items-center gap-2.5">
                  {/* Multi-angle Thumbnails strip */}
                  {allImages.length > 1 && (
                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto max-w-full pb-1 no-scrollbar">
                      {allImages.map((img, idx) => {
                        const isSelected = img === src;
                        return (
                          <button
                            type="button"
                            key={`${img}-${idx}`}
                            onClick={() => {
                              onSelectImage?.(img);
                              setModalScale(1);
                              setModalOffset({ x: 0, y: 0 });
                            }}
                            className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border p-1 bg-white/10 transition-all cursor-pointer shrink-0 ${
                              isSelected
                                ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/40 scale-105"
                                : "border-white/20 hover:border-white/50 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img src={img} alt="" className="h-full w-full object-contain" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Gesture helper guidance note */}
                  <div className="flex items-center gap-2 text-[10.5px] text-white/60 tracking-wider uppercase">
                    <Move size={12} className="text-[var(--gold)]" />
                    <span className="hidden sm:inline">
                      Double-click to toggle zoom · Scroll wheel to zoom · Drag to pan around craftsmanship
                    </span>
                    <span className="sm:hidden">
                      Pinch or double-tap to zoom · Drag to pan details
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
