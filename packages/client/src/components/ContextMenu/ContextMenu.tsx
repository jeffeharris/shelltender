import React, { useEffect, useRef } from 'react';
import { CONTEXT_MENU, Z_INDEX } from '../../constants/mobile.js';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
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
    }, CONTEXT_MENU.SHOW_DELAY);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Calculate position to keep menu on screen
  const adjustPosition = () => {
    const menuWidth = CONTEXT_MENU.WIDTH;
    const menuHeight = items.length * CONTEXT_MENU.ITEM_HEIGHT;
    const margin = CONTEXT_MENU.MARGIN;

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
        style={{ zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP }}
      />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-2"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          zIndex: Z_INDEX.CONTEXT_MENU,
          minWidth: `${CONTEXT_MENU.WIDTH}px`,
        }}
      >
        {items.map((item, index) => (
          <button
            key={index}
            className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded mobile-touch-target flex items-center gap-2"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleItemClick(item.action);
            }}
          >
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
};