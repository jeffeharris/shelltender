# Phase 4: Virtual Keyboard Implementation - Quick Start Guide

## Overview
This guide helps the implementation team quickly locate all necessary files and understand the current state for Phase 4 implementation.

## Current State

### ✅ What's Already Implemented (Phases 1-3)
- Mobile detection hooks (`useMobileDetection`)
- Mobile-optimized components (`MobileApp`, `MobileTerminal`, `MobileSessionTabs`)
- Touch gesture support (swipe to switch sessions, long press for context menu)
- Responsive layout system
- Basic virtual keyboard component (not integrated)

### 🚧 What Needs Implementation (Phase 4)
- Upgrade basic VirtualKeyboard to EnhancedVirtualKeyboard
- Custom key sets with persistence
- Predefined key sets (Unix, Git, Navigation, etc.)
- Key set editor UI
- Integration with mobile terminal

## Key Files to Review

### 1. **Current Virtual Keyboard** (Starting Point)
```
/apps/demo/src/client/VirtualKeyboard.tsx
```
- Basic implementation with quick keys and QWERTY toggle
- Uses `onInput` and `onSpecialKey` callbacks
- Already has height measurement logic

### 2. **Mobile Terminal Integration**
```
/packages/client/src/components/mobile/MobileTerminal.tsx
```
- Lines 99-139: Current input handling implementation
- Lines 151-154: MobileTerminalInput component usage
- Shows how keyboard input should integrate

### 3. **Mobile App Structure**
```
/apps/demo/src/client/App.tsx
```
- Lines 125-177: Mobile layout implementation
- Line 141-143: Where to integrate EnhancedVirtualKeyboard

### 4. **Implementation Specifications**
```
/docs/PHASE_4_VIRTUAL_KEYBOARD_SPEC.md     # Main specification
/docs/MOBILE_CUSTOM_KEYS.md                 # Detailed custom keys implementation
/docs/MOBILE_IMPLEMENTATION_GUIDE.md        # Overall mobile guide
```

## Files to Create

### 1. **Type Definitions**
```
/packages/client/src/types/keyboard.ts
```
Create interfaces for SpecialKey, KeySet, and KeyboardPreferences

### 2. **Predefined Key Sets**
```
/packages/client/src/constants/keySets.ts
```
Define all predefined key sets (Quick, Navigation, Control, Unix, Git, Function)

### 3. **Enhanced Virtual Keyboard Component**
```
/packages/client/src/components/mobile/EnhancedVirtualKeyboard.tsx
/packages/client/src/components/mobile/EnhancedVirtualKeyboard.css
```
Main keyboard component with tab support and custom keys

### 4. **Custom Keys Hook**
```
/packages/client/src/hooks/useCustomKeySets.ts
```
Handle persistence and management of custom key sets

### 5. **Key Set Editor**
```
/packages/client/src/components/mobile/KeySetEditor.tsx
/packages/client/src/components/mobile/KeySetEditor.css
```
UI for creating and editing custom key sets

### 6. **Update Package Exports**
```
/packages/client/src/index.ts
```
Add new exports for EnhancedVirtualKeyboard and related types

## Integration Points

### 1. **In App.tsx (Mobile Section)**
Replace the current keyboard button (line 220-235 in MobileTerminal.tsx) with:
```typescript
<EnhancedVirtualKeyboard
  isVisible={!!currentSessionId}
  onInput={(text) => { /* send via WebSocket */ }}
  onCommand={(command) => { /* send with \n */ }}
  onMacro={(keys) => { /* send sequence */ }}
  onHeightChange={setKeyboardHeight}
/>
```

### 2. **WebSocket Integration**
Use existing pattern from MobileTerminal.tsx:
```typescript
wsService.send({
  type: 'input',
  sessionId: currentSessionId,
  data: text
});
```

## Answers to Implementation Team Questions

### Virtual Keyboard Strategy

**Q: Native vs Custom Keyboard?**
**A: Build the custom virtual keyboard (Phase 4).** The native keyboard issues are well-documented across mobile web terminals. Our custom keyboard provides:
- Consistent experience across devices
- Terminal-specific keys readily available
- No focus/blur issues
- Better control over layout and behavior

**Q: Keyboard Design Requirements?**
**A: For this release:**
- ✅ Full terminal capabilities with predefined key sets
- ✅ Basic customization (create custom key sets)
- ❌ Context-awareness (future enhancement)
- ❌ Themes (future enhancement)

**Q: Terminal Integration Features?**
**A: For this release:**
- ✅ Multi-key sequences via dedicated buttons (Ctrl+C, etc.)
- ✅ Macro support for common commands
- ❌ Tab completion previews (future)
- ❌ Command history/suggestions (future)

### Architecture Decisions

**Q: State Management?**
**A: Local state with localStorage persistence.** The current approach is sufficient:
- Keyboard preferences in localStorage
- Active state in component state
- No need for global state management yet

**Q: Performance/WebSocket Lag?**
**A: Keep WebSocket for now.** Address lag with:
- Visual feedback on key press
- Optional haptic feedback (future)
- No debouncing - terminal users expect immediate response
- WebRTC is overkill for this release

**Q: PWA Considerations?**
**A: Not for this release.** Focus on:
- ✅ Mobile web experience
- ✅ Session persistence (already implemented)
- ❌ Offline support (future)
- ❌ Full PWA manifest (future)

### UX Decisions

**Q: Layout Adaptation?**
**A: Resize approach.** When keyboard shown:
- Terminal height adjusts (using onHeightChange callback)
- Content remains visible above keyboard
- No overlay approach

**Q: Gesture Conflicts?**
**A: Keep current gestures.** They work well:
- Horizontal swipes don't conflict with system gestures
- Multi-finger taps are standard mobile patterns
- Add gesture hints (already in MobileTerminal)

**Q: Accessibility?**
**A: Basic support only for now:**
- ✅ Large touch targets (44px minimum)
- ✅ High contrast colors
- ✅ Clear visual feedback
- ❌ Full ARIA support (future)
- ❌ External keyboard detection (future)

## Development Workflow

1. **Start with type definitions** - Create keyboard.ts with all interfaces
2. **Implement keySets.ts** - Define all predefined key sets
3. **Build useCustomKeySets hook** - Handle persistence logic
4. **Create EnhancedVirtualKeyboard** - Main component (can test at this point)
5. **Add KeySetEditor** - Can be basic for initial release
6. **Integrate with App.tsx** - Wire up WebSocket communication
7. **Add CSS styling** - Make it look polished
8. **Test on real devices** - Critical for mobile UX

## Testing Checklist

- [ ] All predefined key sets send correct values
- [ ] Custom keys persist across sessions
- [ ] Keyboard height adjustment works
- [ ] Touch targets are large enough
- [ ] No lag or missed keystrokes
- [ ] Works in both portrait and landscape
- [ ] Gestures don't conflict with keyboard

## Common Pitfalls to Avoid

1. **Don't use native input fields** - They cause focus issues
2. **Don't debounce input** - Terminal users need immediate feedback
3. **Test on real devices** - Emulators don't show all issues
4. **Keep touch targets large** - 44px minimum, 48px preferred
5. **Avoid complex gestures** - Simple taps work best

## Need Help?

- Full specification: `/docs/PHASE_4_VIRTUAL_KEYBOARD_SPEC.md`
- Custom keys details: `/docs/MOBILE_CUSTOM_KEYS.md`
- Current keyboard code: `/apps/demo/src/client/VirtualKeyboard.tsx`
- Mobile terminal integration: `/packages/client/src/components/mobile/MobileTerminal.tsx`