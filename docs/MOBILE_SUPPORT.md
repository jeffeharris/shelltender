# Mobile Support

Shelltender now includes comprehensive mobile support with touch gestures, responsive design, and mobile-optimized UI components.

## Features

### Touch Gestures
- **2-finger tap**: Copy selected text to clipboard
- **3-finger tap**: Paste from clipboard
- **Swipe left/right**: Navigate between terminal sessions
- **Long press**: Show context menu with copy, paste, select all, and clear options
- **Swipe down on tabs**: Expand session menu

### Mobile Detection
The `useMobileDetection` hook provides detailed device information:
- Device type (phone, tablet, desktop)
- OS detection (iOS, Android)
- Orientation (portrait, landscape)
- Touch support
- Screen dimensions
- Virtual keyboard detection

### Responsive Design
- Mobile-optimized layouts for phones and tablets
- Safe area support for devices with notches
- Touch-friendly UI elements (minimum 44x44px tap targets)
- Reduced scrollback buffer for better performance
- Smooth animations and transitions

## Usage

### Basic Setup

```typescript
import { 
  MobileApp, 
  MobileTerminal, 
  MobileSessionTabs,
  useMobileDetection 
} from '@shelltender/client';

function App() {
  const { isMobile } = useMobileDetection();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  if (!isMobile) {
    return <DesktopApp />;
  }

  return (
    <MobileApp>
      <div className="flex flex-col h-screen">
        <MobileSessionTabs
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onCreateSession={handleCreateSession}
          onManageSessions={() => setShowManager(true)}
        />
        
        <div className="flex-1">
          <MobileTerminal
            sessionId={activeSessionId}
            onSessionChange={(direction) => {
              // Handle session navigation
              const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
              const nextIndex = direction === 'next' 
                ? (currentIndex + 1) % sessions.length
                : (currentIndex - 1 + sessions.length) % sessions.length;
              setActiveSessionId(sessions[nextIndex]?.id);
            }}
          />
        </div>
      </div>
    </MobileApp>
  );
}
```

### Mobile Detection

```typescript
import { useMobileDetection } from '@shelltender/client';

function Component() {
  const {
    isMobile,
    isPhone,
    isTablet,
    isIOS,
    isAndroid,
    isPortrait,
    isLandscape,
    screenWidth,
    screenHeight,
    hasTouch
  } = useMobileDetection();

  // Conditionally render based on device
  if (isPhone && isPortrait) {
    return <PhonePortraitLayout />;
  }
  
  if (isTablet) {
    return <TabletLayout />;
  }
  
  return <DesktopLayout />;
}
```

### Custom Touch Gestures

```typescript
import { useTouchGestures } from '@shelltender/client';

function CustomComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useTouchGestures(containerRef, {
    onSwipeLeft: () => console.log('Swiped left'),
    onSwipeRight: () => console.log('Swiped right'),
    onLongPress: (x, y) => console.log('Long press at', x, y),
    onTwoFingerTap: (x, y) => console.log('Two finger tap'),
    onPinchMove: (scale) => console.log('Pinch scale:', scale),
    swipeThreshold: 50,
    longPressDelay: 500
  });
  
  return <div ref={containerRef}>Touch me!</div>;
}
```

### Responsive Breakpoints

```typescript
import { useBreakpoint } from '@shelltender/client';

function ResponsiveComponent() {
  const { isXs, isSm, isMd, isLg, isXl } = useBreakpoint();
  
  return (
    <div className={`
      ${isXs ? 'text-sm' : ''}
      ${isSm ? 'text-base' : ''}
      ${isMd ? 'text-lg' : ''}
      ${isLg ? 'text-xl' : ''}
      ${isXl ? 'text-2xl' : ''}
    `}>
      Responsive text
    </div>
  );
}
```

## CSS Classes

The mobile implementation includes utility CSS classes:

- `.mobile-no-select` - Disable text selection
- `.mobile-no-zoom` - Prevent double-tap zoom
- `.mobile-smooth-scroll` - Enable smooth scrolling
- `.mobile-touch-target` - Ensure minimum touch target size
- `.mobile-safe-padding` - Add safe area padding
- `.mobile-no-bounce` - Prevent iOS bounce effect
- `.mobile-hide-scrollbar` - Hide scrollbars on mobile
- `.mobile-gpu` - Enable GPU acceleration
- `.mobile-reduce-motion` - Reduce animation for performance

## Browser Support

- iOS Safari 12+
- Chrome for Android 80+
- Samsung Internet 10+
- Mobile Firefox 68+

## Performance Considerations

- Terminal scrollback is reduced to 5000 lines on mobile
- Touch events use passive listeners where possible
- Animations are optimized for 60fps
- GPU acceleration is used for transforms

## Accessibility

- All interactive elements meet minimum touch target guidelines (44x44px)
- Focus indicators are enhanced for mobile
- Context menus are keyboard accessible
- Screen reader support for all UI elements