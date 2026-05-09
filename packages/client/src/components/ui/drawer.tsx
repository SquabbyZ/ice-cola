import * as React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ open, children }) => {
  if (!open) return null;
  return <DrawerPortal>{children}</DrawerPortal>;
};

const DrawerPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(children, document.body);
};

interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

const DrawerContent: React.FC<DrawerContentProps> = ({
  className,
  children,
  onClose,
  ...props
}) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      {/* Drawer panel - slides from right */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl duration-300 ease-out animate-slide-in-right flex flex-col",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        {children}
      </div>
    </>
  );
};

interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  closeButton?: boolean;
  onClose?: () => void;
}

const DrawerHeader: React.FC<DrawerHeaderProps> = ({
  className,
  closeButton = true,
  onClose,
  children,
  ...props
}) => (
  <div className={cn("flex items-center justify-between px-6 py-5 border-b border-zinc-100/50 bg-zinc-50/50", className)} {...props}>
    <div>{children}</div>
    {closeButton && onClose && (
      <button
        onClick={onClose}
        className="w-10 h-10 rounded-xl p-0 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all duration-200"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    )}
  </div>
);

const DrawerBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div className={cn("flex-1 overflow-y-auto p-6", className)} {...props} />
);

const DrawerFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div className={cn("px-6 py-5 border-t border-zinc-100/50 bg-zinc-50/50 flex items-center justify-end gap-3", className)} {...props} />
);

export {
  Drawer,
  DrawerPortal,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
};