import React, { useEffect, useRef } from 'react';
import { mobileDesignTokens } from '../../styles/mobile.js';
import { cn, containerStyles } from '../../styles/components.js';
import { useIconButtonStyles, useTouchTargetStyles } from '../../hooks/useStyles.js';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);
  const touchTargetStyles = useTouchTargetStyles('preferred');

  useEffect(() => {
    // Delay before allowing close to prevent immediate closure
    const timer = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (isClosingRef.current) return;
        
        const target = e.target as HTMLElement;
        if (menuRef.current && !menuRef.current.contains(target)) {
          onClose();
        }
      };

      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);

      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, mobileDesignTokens.contextMenu.showDelay || 100);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Calculate position to keep menu on screen
  const adjustPosition = () => {
    const menuWidth = mobileDesignTokens.contextMenu.minWidth;
    const menuHeight = items.length * mobileDesignTokens.contextMenu.itemHeight;
    const margin = 10; // viewport margin

    let adjustedX = x;
    let adjustedY = y;

    // Keep menu within viewport bounds
    if (adjustedX + menuWidth > window.innerWidth - margin) {
      adjustedX = window.innerWidth - menuWidth - margin;
    }
    if (adjustedX < margin) {
      adjustedX = margin;
    }

    if (adjustedY + menuHeight > window.innerHeight - margin) {
      adjustedY = window.innerHeight - menuHeight - margin;
    }
    if (adjustedY < margin) {
      adjustedY = margin;
    }

    return { x: adjustedX, y: adjustedY };
  };

  const position = adjustPosition();

  const handleItemClick = (action: () => void) => {
    isClosingRef.current = true;
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0" 
        style={{ zIndex: mobileDesignTokens.zIndex.CONTEXT_MENU_BACKDROP }}
      />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className={cn(
          containerStyles.cardElevated,
          'fixed p-1 border border-gray-600'
        )}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          zIndex: mobileDesignTokens.zIndex.CONTEXT_MENU,
          minWidth: `${mobileDesignTokens.contextMenu.minWidth}px`,
          maxWidth: `${mobileDesignTokens.contextMenu.maxWidth}px`,
        }}
      >
        {items.map((item, index) => {
          const itemClasses = cn(
            'w-full text-left px-3 py-2 rounded-md',
            'flex items-center gap-3',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800',
            item.variant === 'danger' 
              ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:ring-red-500'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white focus:ring-gray-500'
          );
          
          return (
            <button
              key={index}
              className={itemClasses}
              style={{
                ...touchTargetStyles,
                height: `${mobileDesignTokens.contextMenu.itemHeight}px`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleItemClick(item.action);
              }}
            >
              {item.icon && (
                <span 
                  className="flex-shrink-0"
                  style={{
                    width: `${mobileDesignTokens.contextMenu.iconSize}px`,
                    height: `${mobileDesignTokens.contextMenu.iconSize}px`,
                  }}
                >
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};