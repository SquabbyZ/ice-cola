import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextType | null>(null);

export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setOpen(false);
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger: React.FC<{
  children: React.ReactNode;
  asChild?: boolean;
}> = ({ children, asChild }) => {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  if (asChild) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          context.setOpen(!context.open);
        }}
        className="cursor-pointer"
      >
        {children}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        context.setOpen(!context.open);
      }}
      className="cursor-pointer"
    >
      {children}
    </div>
  );
};

export const DropdownMenuContent: React.FC<{
  children: React.ReactNode;
  align?: 'start' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  className?: string;
}> = ({ children, align = 'end', side = 'bottom', sideOffset = 0, className = '' }) => {
  const context = useContext(DropdownMenuContext);
  const ref = useRef<HTMLDivElement>(null);

  if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');

  if (!context.open) return null;

  const positionStyle: React.CSSProperties = {};
  if (align === 'start') {
    positionStyle.left = sideOffset;
  } else if (align === 'end') {
    positionStyle.right = sideOffset;
  }

  if (side === 'top') {
    positionStyle.bottom = '100%';
  }

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-lg border bg-white shadow-lg ${className}`}
      style={positionStyle}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  const context = useContext(DropdownMenuContext);

  return (
    <div
      onClick={() => {
        onClick?.();
        context?.setOpen(false);
      }}
      className={`flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${className}`}
    >
      {children}
    </div>
  );
};

export const DropdownMenuSeparator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-px bg-gray-200 my-1 ${className}`} />
);
