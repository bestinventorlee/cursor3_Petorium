/**
 * Touch Gesture Utilities
 * For mobile touch interactions
 */

export interface TouchGestureCallbacks {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
  onPinch?: (scale: number) => void;
}

export interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  tapCount: number;
  longPressTimer: NodeJS.Timeout | null;
  isPinching: boolean;
  initialDistance: number;
}

const SWIPE_THRESHOLD = 50; // Minimum distance for swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity for swipe
const DOUBLE_TAP_DELAY = 300; // Milliseconds between taps
const LONG_PRESS_DELAY = 500; // Milliseconds for long press
const PINCH_THRESHOLD = 10; // Minimum distance change for pinch

/**
 * Get distance between two touch points
 */
function getDistance(
  touch1: Touch,
  touch2: Touch
): number {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get angle between two touch points
 */
function getAngle(
  touch1: Touch,
  touch2: Touch
): number {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Setup touch gesture handlers
 */
export function setupTouchGestures(
  element: HTMLElement,
  callbacks: TouchGestureCallbacks
): () => void {
  const state: TouchState = {
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    tapCount: 0,
    longPressTimer: null,
    isPinching: false,
    initialDistance: 0,
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch
      const touch = e.touches[0];
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.startTime = Date.now();

      // Long press detection
      state.longPressTimer = setTimeout(() => {
        if (callbacks.onLongPress) {
          callbacks.onLongPress();
        }
      }, LONG_PRESS_DELAY);
    } else if (e.touches.length === 2) {
      // Pinch gesture
      state.isPinching = true;
      state.initialDistance = getDistance(e.touches[0], e.touches[1]);
      if (callbacks.onPinchStart) {
        callbacks.onPinchStart();
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    // Cancel long press if moved
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    if (e.touches.length === 2 && state.isPinching) {
      // Pinch gesture
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / state.initialDistance;
      
      if (Math.abs(scale - 1) > PINCH_THRESHOLD / 100) {
        if (callbacks.onPinch) {
          callbacks.onPinch(scale);
        }
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }

    if (e.touches.length === 0 && state.isPinching) {
      // Pinch ended
      state.isPinching = false;
      if (callbacks.onPinchEnd) {
        callbacks.onPinchEnd();
      }
      return;
    }

    if (e.changedTouches.length === 1 && !state.isPinching) {
      // Single touch end
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - state.startX;
      const deltaY = endY - state.startY;
      const deltaTime = endTime - state.startTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;

      // Check for double tap
      const timeSinceLastTap = endTime - state.lastTapTime;
      if (timeSinceLastTap < DOUBLE_TAP_DELAY && distance < 10) {
        state.tapCount++;
        if (state.tapCount === 2 && callbacks.onDoubleTap) {
          callbacks.onDoubleTap();
          state.tapCount = 0;
        }
      } else {
        state.tapCount = 1;
      }
      state.lastTapTime = endTime;

      // Check for swipe
      if (distance > SWIPE_THRESHOLD && velocity > SWIPE_VELOCITY_THRESHOLD) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && callbacks.onSwipeRight) {
            callbacks.onSwipeRight();
          } else if (deltaX < 0 && callbacks.onSwipeLeft) {
            callbacks.onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && callbacks.onSwipeDown) {
            callbacks.onSwipeDown();
          } else if (deltaY < 0 && callbacks.onSwipeUp) {
            callbacks.onSwipeUp();
          }
        }
      }
    }
  };

  element.addEventListener("touchstart", handleTouchStart, { passive: true });
  element.addEventListener("touchmove", handleTouchMove, { passive: true });
  element.addEventListener("touchend", handleTouchEnd, { passive: true });
  element.addEventListener("touchcancel", handleTouchEnd, { passive: true });

  // Cleanup function
  return () => {
    element.removeEventListener("touchstart", handleTouchStart);
    element.removeEventListener("touchmove", handleTouchMove);
    element.removeEventListener("touchend", handleTouchEnd);
    element.removeEventListener("touchcancel", handleTouchEnd);
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
    }
  };
}

