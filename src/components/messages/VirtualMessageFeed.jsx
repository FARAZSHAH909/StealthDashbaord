"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import MessageBubble from "./MessageBubble";
import DateDivider from "./DateDivider";
import { ArrowDown, Radio } from "lucide-react";

/**
 * High-performance virtualized feed for 350+ messages.
 * Only renders items in the current viewport window plus overscan buffer.
 * Elements scrolled out of view are unmounted from the DOM to eliminate lag and prevent mobile freeze.
 */
export default function VirtualMessageFeed({
  items = [],
  conversationId,
  isKeyUnlocked,
  onOpenKeyModal,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Height cache map: id -> measured px height
  const heightCacheRef = useRef({});
  const [, forceUpdate] = useState(0);
  const isInitialMountForConv = useRef(true);

  // Default height estimations
  const getEstimatedHeight = useCallback((item) => {
    if (!item) return 80;
    if (item.type === "divider") return 48;
    // Estimate based on message type/content length
    const msg = item.data;
    if (!msg) return 90;
    if (!msg.isDecrypted) return 130;
    const len = msg.decryptedMessage?.length || 0;
    if (len > 200) return 160;
    if (len > 80) return 110;
    return 85;
  }, []);

  // Compute item positions and total virtual height
  const { positions, totalHeight } = useMemo(() => {
    let currentTop = 0;
    const pos = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cached = heightCacheRef.current[item.id];
      const h = typeof cached === "number" && cached > 0 ? cached : getEstimatedHeight(item);
      pos.push({
        index: i,
        top: currentTop,
        height: h,
        bottom: currentTop + h,
      });
      currentTop += h;
    }

    return {
      positions: pos,
      totalHeight: currentTop,
    };
  }, [items, getEstimatedHeight]);

  // Handle scroll events with RAF throttling for 60-120fps buttery performance
  const rafIdRef = useRef(null);
  const handleScroll = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;

      const st = container.scrollTop;
      const ch = container.clientHeight;
      const sh = container.scrollHeight;

      setScrollTop(st);
      setViewportHeight(ch);

      const distFromBottom = sh - (st + ch);
      const nearBottom = distFromBottom < 120;
      setIsNearBottom(nearBottom);
      setShowScrollBottomBtn(distFromBottom > 350);
    });
  }, []);

  // Update viewport height on mount/resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setViewportHeight(container.clientHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Scroll to bottom when switching conversation or receiving new messages if near bottom
  useEffect(() => {
    isInitialMountForConv.current = true;
  }, [conversationId]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    if (isInitialMountForConv.current) {
      // First mount of this conversation: jump instantly to bottom
      container.scrollTop = container.scrollHeight;
      isInitialMountForConv.current = false;
      setIsNearBottom(true);
      setShowScrollBottomBtn(false);
    } else if (isNearBottom) {
      // New message came in while user is already at the bottom
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [items.length, conversationId, isNearBottom]);

  // Jump to bottom button handler
  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      setIsNearBottom(true);
      setShowScrollBottomBtn(false);
    }
  };

  // Binary search for visible window range
  const OVERSCAN_PX = 450; // Buffer space to preload before scrolling into view
  const minTop = Math.max(0, scrollTop - OVERSCAN_PX);
  const maxBottom = scrollTop + viewportHeight + OVERSCAN_PX;

  let startIndex = 0;
  let endIndex = items.length;

  if (positions.length > 0) {
    // Find startIndex
    let low = 0;
    let high = positions.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (positions[mid].bottom < minTop) {
        low = mid + 1;
      } else {
        startIndex = mid;
        high = mid - 1;
      }
    }

    // Find endIndex
    low = startIndex;
    high = positions.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (positions[mid].top <= maxBottom) {
        endIndex = mid + 1;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
  }

  startIndex = Math.max(0, startIndex);
  endIndex = Math.min(items.length, Math.max(startIndex + 1, endIndex));

  const visibleItems = items.slice(startIndex, endIndex);
  const topSpacerHeight = positions[startIndex]?.top || 0;
  const bottomSpacerHeight = Math.max(
    0,
    totalHeight - (positions[endIndex - 1]?.bottom || totalHeight)
  );

  // Measure element height and cache dynamically
  const itemRefs = useRef({});
  const measureCallback = useCallback((id, el) => {
    if (!el) {
      delete itemRefs.current[id];
      return;
    }
    itemRefs.current[id] = el;
    const measured = el.offsetHeight;
    if (measured > 0 && Math.abs((heightCacheRef.current[id] || 0) - measured) > 3) {
      heightCacheRef.current[id] = measured;
    }
  }, []);

  return (
    <div className="relative flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col">
      {/* Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6 overscroll-contain will-change-scroll"
        style={{
          backgroundColor: "#0b141a",
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(17, 27, 33, 0.4) 0%, rgba(11, 20, 26, 0.98) 100%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23182229' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")
          `,
        }}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#8696a0] text-xs">
            <p>No messages match your search criteria.</p>
          </div>
        ) : (
          <div style={{ height: `${totalHeight}px`, position: "relative", width: "100%" }}>
            {/* Top Virtual Spacer: unmounted items collapsed into height */}
            <div style={{ height: `${topSpacerHeight}px` }} />

            {/* Rendered Window of Items */}
            {visibleItems.map((item) => (
              <div
                key={item.id}
                ref={(el) => measureCallback(item.id, el)}
                data-index={item.id}
                className="w-full"
              >
                {item.type === "divider" ? (
                  <DateDivider dateLabel={item.label} />
                ) : (
                  <MessageBubble
                    message={item.data}
                    onUnlockKey={!isKeyUnlocked ? onOpenKeyModal : null}
                  />
                )}
              </div>
            ))}

            {/* Bottom Virtual Spacer: unmounted items collapsed into height */}
            <div style={{ height: `${bottomSpacerHeight}px` }} />
          </div>
        )}
      </div>

      {/* Floating 'Scroll to Latest' Button (like WhatsApp / Instagram) */}
      {showScrollBottomBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute right-6 bottom-4 z-30 p-2.5 rounded-full bg-[#202c33]/90 hover:bg-[#2a3942] text-emerald-400 border border-[#2a3942] shadow-2xl backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center animate-in fade-in zoom-in-75 duration-200"
          title="Jump to latest messages"
        >
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </button>
      )}
    </div>
  );
}
