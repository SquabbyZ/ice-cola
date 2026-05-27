import { useState, useEffect, useCallback } from 'react';

interface DropdownPosition {
  direction: 'up' | 'down';
  maxHeight: string;
}

const VIEWPORT_PADDING = 16; // px from viewport edge

export function useDropdownPosition(triggerRef: React.RefObject<HTMLElement>, defaultDirection: 'up' | 'down' = 'up'): DropdownPosition {
  const [position, setPosition] = useState<DropdownPosition>({
    direction: defaultDirection,
    maxHeight: defaultDirection === 'up' ? '280px' : '280px',
  });

  const calculatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_PADDING;

    // Determine vertical direction
    let direction: 'up' | 'down';
    let maxHeight: string;

    if (defaultDirection === 'up') {
      if (spaceAbove >= 280) {
        direction = 'up';
        maxHeight = `${Math.min(280, spaceAbove)}px`;
      } else if (spaceBelow >= 280) {
        direction = 'down';
        maxHeight = `${Math.min(280, spaceBelow)}px`;
      } else {
        // Use whichever direction has more space
        if (spaceAbove >= spaceBelow) {
          direction = 'up';
          maxHeight = `${Math.max(120, spaceAbove)}px`;
        } else {
          direction = 'down';
          maxHeight = `${Math.max(120, spaceBelow)}px`;
        }
      }
    } else {
      if (spaceBelow >= 280) {
        direction = 'down';
        maxHeight = `${Math.min(280, spaceBelow)}px`;
      } else if (spaceAbove >= 280) {
        direction = 'up';
        maxHeight = `${Math.min(280, spaceAbove)}px`;
      } else {
        if (spaceBelow >= spaceAbove) {
          direction = 'down';
          maxHeight = `${Math.max(120, spaceBelow)}px`;
        } else {
          direction = 'up';
          maxHeight = `${Math.max(120, spaceAbove)}px`;
        }
      }
    }

    setPosition({ direction, maxHeight });
  }, [triggerRef, defaultDirection]);

  useEffect(() => {
    calculatePosition();
  }, [calculatePosition]);

  useEffect(() => {
    function handleScroll() {
      calculatePosition();
    }

    function handleResize() {
      calculatePosition();
    }

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculatePosition]);

  return position;
}

/**
 * Returns CSS classes for positioning the dropdown based on the calculated position
 */
export function getDropdownClasses(direction: 'up' | 'down'): string {
  if (direction === 'up') {
    return 'bottom-full mb-2';
  }
  return 'top-full mt-2';
}
