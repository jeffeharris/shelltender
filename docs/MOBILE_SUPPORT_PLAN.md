# Mobile Support Plan for Shelltender

## Overview

This document outlines the plan for adding mobile device support to Shelltender, making the terminal interface touch-friendly and responsive across various screen sizes.

## Goals

1. **Touch-friendly interface** - Support touch gestures for common terminal operations
2. **Responsive design** - Adapt to various screen sizes and orientations
3. **Virtual keyboard integration** - Seamless text input on mobile devices
4. **Performance optimization** - Ensure smooth performance on mobile processors
5. **Accessibility** - Maintain accessibility standards for mobile users

## Research Phase

### Terminal Libraries for Mobile

1. **xterm.js mobile support**
   - Current touch event handling
   - Mobile-specific addons
   - Performance on mobile devices

2. **Alternative libraries**
   - Hterm (Chrome's terminal)
   - Terminal.js
   - Mobile-specific terminal libraries

3. **Native app wrappers**
   - Capacitor/Ionic
   - React Native WebView
   - PWA capabilities

### Mobile-Specific Challenges

1. **Virtual keyboard behavior**
   - Viewport resizing
   - Input focus management
   - Special characters access

2. **Touch interactions**
   - Text selection
   - Copy/paste operations
   - Scrolling vs selection

3. **Screen real estate**
   - Session tabs on small screens
   - Terminal controls placement
   - Landscape vs portrait modes

## Design Considerations

### UI/UX Improvements

1. **Touch targets**
   - Minimum 44x44px tap targets
   - Spacing between interactive elements
   - Clear visual feedback

2. **Gesture support**
   - Swipe to switch sessions
   - Pinch to zoom
   - Long press for context menu
   - Pull to refresh for reconnection

3. **Mobile-first components**
   - Collapsible session drawer
   - Floating action buttons
   - Bottom sheet for session management
   - Swipeable tab bar

### Layout Adaptations

```
Mobile Portrait (<768px):
┌─────────────────────┐
│   Session Tabs      │ <- Scrollable horizontal
├─────────────────────┤
│                     │
│     Terminal        │ <- Full width
│                     │
├─────────────────────┤
│  Virtual Keyboard   │ <- OS-provided
└─────────────────────┘

Mobile Landscape:
┌───────┬─────────────┐
│ Tabs  │  Terminal   │
│ (drawer)            │
└───────┴─────────────┘
```

## Implementation Plan

### Phase 1: Foundation (Week 1)

1. **Viewport configuration**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
   ```

2. **Touch event handling**
   - Prevent default zoom behaviors
   - Handle orientation changes
   - Manage focus/blur events

3. **Responsive breakpoints**
   - Mobile: < 768px
   - Tablet: 768px - 1024px
   - Desktop: > 1024px

### Phase 2: Core Components (Week 2)

1. **MobileTerminal component**
   ```tsx
   interface MobileTerminalProps {
     sessionId: string;
     onSwipeLeft?: () => void;
     onSwipeRight?: () => void;
     showKeyboardToggle?: boolean;
   }
   ```

2. **MobileSessionTabs component**
   - Horizontal scrolling
   - Condensed design
   - Swipe gestures

3. **MobileToolbar component**
   - Common commands (Ctrl+C, Ctrl+D)
   - Keyboard toggle
   - Session management

### Phase 3: Touch Interactions (Week 3)

1. **Gesture library integration**
   - Hammer.js or native touch events
   - Swipe detection
   - Pinch zoom handling

2. **Context menu**
   - Long press to show options
   - Copy/paste support
   - Custom commands

3. **Selection handling**
   - Touch-friendly text selection
   - Selection toolbar
   - Copy to clipboard

### Phase 4: Virtual Keyboard (Week 4)

1. **Input management**
   - Focus handling
   - Viewport adjustment
   - Input method editor (IME) support

2. **Special keys toolbar**
   - Tab, Esc, Arrow keys
   - Function keys
   - Ctrl/Alt combinations

3. **Custom keyboard layouts**
   - Programming symbols
   - Unix commands
   - Quick snippets

### Phase 5: Performance & Testing (Week 5)

1. **Performance optimization**
   - Reduce re-renders
   - Optimize touch event handlers
   - Lazy load components

2. **Device testing**
   - iOS Safari
   - Chrome Android
   - Various screen sizes
   - Different orientations

3. **PWA enhancements**
   - Service worker
   - Offline support
   - Install prompts

## Technical Implementation

### Package Structure

```
packages/client/src/
├── components/
│   ├── mobile/
│   │   ├── MobileTerminal.tsx
│   │   ├── MobileSessionTabs.tsx
│   │   ├── MobileToolbar.tsx
│   │   └── VirtualKeyboardBar.tsx
│   └── ...
├── hooks/
│   ├── useMobileDetection.ts
│   ├── useOrientation.ts
│   ├── useTouchGestures.ts
│   └── ...
└── styles/
    ├── mobile.css
    └── ...
```

### Key Dependencies

```json
{
  "dependencies": {
    "react-use-gesture": "^9.1.3",
    "react-intersection-observer": "^9.5.3",
    "@react-spring/web": "^9.7.3"
  }
}
```

### CSS Considerations

```css
/* Prevent zoom on input focus */
input, textarea {
  font-size: 16px;
}

/* Safe area insets for notched devices */
.mobile-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Touch-friendly tap targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

## Accessibility

1. **Screen reader support**
   - ARIA labels for touch controls
   - Announcements for gestures
   - Focus management

2. **Reduced motion**
   - Respect prefers-reduced-motion
   - Alternative interactions
   - Disable animations option

3. **High contrast**
   - Support system preferences
   - Custom theme options
   - Clear focus indicators

## Success Metrics

1. **Performance**
   - First paint < 1.5s on 3G
   - Smooth scrolling (60fps)
   - Touch response < 100ms

2. **Usability**
   - Successfully complete common tasks
   - Low error rate on touch targets
   - Positive user feedback

3. **Compatibility**
   - Works on 95% of mobile browsers
   - Supports last 2 iOS/Android versions
   - Graceful degradation

## Future Enhancements

1. **Advanced features**
   - Biometric authentication
   - Haptic feedback
   - Voice commands
   - Split screen support

2. **Native app**
   - React Native version
   - Native performance
   - Platform-specific features
   - App store distribution

## Resources

- [xterm.js mobile support](https://github.com/xtermjs/xterm.js/issues/1101)
- [Touch-friendly terminals research](https://github.com/topics/mobile-terminal)
- [PWA best practices](https://web.dev/progressive-web-apps/)
- [Mobile accessibility guidelines](https://www.w3.org/WAI/mobile/)