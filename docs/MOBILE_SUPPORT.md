# Mobile Support

Shelltender provides comprehensive mobile support with touch-optimized interfaces and a custom virtual keyboard system designed specifically for terminal usage on mobile devices.

## 📱 Features

### Mobile Detection
- Automatic device detection (phones, tablets, iOS, Android)
- Responsive breakpoints with Tailwind CSS utilities
- Orientation detection and adaptation
- Touch capability detection

### Touch Gestures
- **Swipe Left/Right**: Navigate between terminal sessions
- **2-Finger Tap**: Copy selected text
- **3-Finger Tap**: Paste from clipboard
- **Long Press**: Open context menu for additional actions
- **Pinch to Zoom**: Disabled to prevent accidental zooming

### Mobile-Optimized Components
- **MobileApp**: Wrapper with proper viewport configuration
- **MobileTerminal**: Touch-enabled terminal with gesture support
- **MobileSessionTabs**: Swipeable session navigation
- **EnhancedVirtualKeyboard**: Custom keyboard for terminal operations

### Virtual Keyboard System

#### Predefined Key Sets
1. **Quick**: Common keys (Tab, Enter, Esc, Ctrl+C, arrows)
2. **Navigation**: Cursor movement (Home, End, PgUp/PgDn)
3. **Control**: Terminal control keys (Ctrl+A through Ctrl+Z)
4. **Unix**: Common Unix commands (ls, cd, pwd, grep)
5. **Git**: Git commands (status, commit, push, pull)
6. **Function**: F1-F12 keys

#### Custom Key Sets
- Create your own key sets through the KeySetEditor
- Support for text, special keys, commands, and macros
- Persistent storage in localStorage
- Customizable key width and styling

## 🚀 Usage

### Basic Setup

```typescript
import { 
  MobileApp,
  MobileTerminal,
  MobileSessionTabs,
  EnhancedVirtualKeyboard,
  useMobileDetection 
} from '@shelltender/client';

function App() {
  const { isMobile } = useMobileDetection();
  
  if (isMobile) {
    return (
      <MobileApp>
        <MobileSessionTabs {...props} />
        <MobileTerminal sessionId={sessionId} />
        <EnhancedVirtualKeyboard
          isVisible={true}
          onInput={handleInput}
          onCommand={handleCommand}
          onMacro={handleMacro}
        />
      </MobileApp>
    );
  }
  
  // Desktop layout...
}
```

### Mobile Detection Hook

```typescript
const {
  isMobile,
  isPhone,
  isTablet,
  isIOS,
  isAndroid,
  orientation,
  hasTouch
} = useMobileDetection();
```

### Touch Gestures Hook

```typescript
const gestures = useTerminalTouchGestures(terminalRef, {
  onCopy: () => handleCopy(),
  onPaste: () => handlePaste(),
  onNextSession: () => navigateSession('next'),
  onPrevSession: () => navigateSession('prev'),
  onContextMenu: (x, y) => showContextMenu(x, y)
});
```

### Virtual Keyboard Integration

```typescript
<EnhancedVirtualKeyboard
  isVisible={showKeyboard}
  onInput={(text) => {
    // Send regular text input
    wsService.send({ type: 'input', data: text });
  }}
  onCommand={(command) => {
    // Send command with newline
    wsService.send({ type: 'input', data: command + '\r' });
  }}
  onMacro={(keys) => {
    // Execute macro sequence
    keys.forEach(key => {
      const data = typeof key === 'string' 
        ? key 
        : SPECIAL_KEY_SEQUENCES[key];
      wsService.send({ type: 'input', data });
    });
  }}
  onHeightChange={setKeyboardHeight}
/>
```

## 🎨 Responsive Design

### CSS Utilities
- `.mobile-touch-target`: 44px minimum touch target
- `.mobile-no-zoom`: Prevents pinch zoom
- `.mobile-safe-area`: Respects device safe areas

### Breakpoints
- `sm`: 640px (phones in landscape)
- `md`: 768px (tablets in portrait)
- `lg`: 1024px (tablets in landscape)
- `xl`: 1280px (desktop)

## 🧪 Testing on Mobile

### Local Network Testing
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Configure servers to bind to all interfaces:
   - HTTP server binds to `0.0.0.0:3000`
   - WebSocket server binds to `0.0.0.0:8080`

3. Access from mobile device:
   - Find your computer's IP: `ifconfig` or `ipconfig`
   - Navigate to `http://[YOUR_IP]:3000`

### Device Testing Checklist
- [ ] Touch targets are at least 44px
- [ ] Keyboard doesn't cover terminal content
- [ ] Gestures work smoothly
- [ ] Session switching is intuitive
- [ ] Copy/paste functionality works
- [ ] Landscape/portrait transitions smooth
- [ ] No accidental zooming
- [ ] Virtual keyboard responsive

## 🔧 Configuration

### Keyboard Preferences
```typescript
interface KeyboardPreferences {
  defaultKeySetId: string;    // Default: 'quick'
  showHints: boolean;         // Default: true
  keyboardHeight: number;     // Default: 12rem
  hapticFeedback: boolean;    // Default: true
  customKeySets: KeySet[];    // User-created key sets
}
```

### Creating Custom Keys
```typescript
const customKey: KeyDefinition = {
  label: 'Deploy',
  type: 'command',
  value: 'npm run deploy',
  style: 'success',
  width: 2
};
```

## 📝 Best Practices

1. **Touch Targets**: Keep all interactive elements at least 44px
2. **Visual Feedback**: Provide immediate feedback for touch interactions
3. **Gesture Hints**: Display gesture instructions for first-time users
4. **Keyboard Height**: Adjust terminal padding based on keyboard height
5. **Performance**: Use `touchAction: 'manipulation'` to prevent delays
6. **Accessibility**: Ensure sufficient color contrast and text size

## 🚨 Known Limitations

- Native keyboard integration varies by device/browser
- Some terminal features may require desktop for full functionality
- Clipboard access requires HTTPS in production
- Haptic feedback only available on supported devices

## 🔮 Future Enhancements

- [ ] Gesture customization
- [ ] More predefined key sets
- [ ] Keyboard themes
- [ ] Voice input integration
- [ ] External keyboard detection
- [ ] PWA support with offline mode