# Mobile Support Refactoring Plan

## Overview

This document outlines the comprehensive refactoring plan for Shelltender's mobile support implementation. The goal is to improve code maintainability, reduce technical debt, and create a more sustainable architecture for mobile features.

## Current Issues

### 1. Architectural Problems
- **Component Duplication**: Separate MobileTerminal and MobileSessionTabs components duplicate functionality
- **Poor State Management**: Props drilling and inconsistent state handling
- **Non-React Patterns**: Direct DOM manipulation for toasts and context menus
- **Type Safety**: Multiple uses of `any` type breaking TypeScript safety

### 2. Code Quality Issues
- **Magic Numbers**: Hard-coded values scattered throughout (e.g., `menuWidth = 200`, `swipeThreshold: 75`)
- **God Functions**: useTouchGestures has 170+ line functions with deeply nested logic
- **Memory Leaks**: Potential leaks in event listener cleanup
- **Performance**: No debouncing/throttling for high-frequency events

### 3. Maintainability Concerns
- **Over-engineered Features**: Complex custom keyboard editor rarely used
- **Missing Abstractions**: Common patterns repeated instead of extracted
- **Poor CSS Architecture**: Scattered media queries, !important usage
- **No Tests**: Zero test coverage for mobile components

## Refactoring Tasks

### Phase 1: High Priority - Core Architecture (Week 1)

#### Task 1: Consolidate Terminal Components
- Merge MobileTerminal functionality into Terminal component
- Use composition pattern for mobile-specific features
- Create a single Terminal that adapts based on device
- Remove duplicate code and props drilling

#### Task 2: Fix Type Safety
- Remove all `any` type usage
- Add proper TypeScript interfaces for touch events
- Create branded types for IDs
- Add runtime validation where needed

#### Task 3: Replace DOM Manipulation
- Convert toast system to React component with context
- Use React Portal for context menu
- Remove window object pollution
- Implement proper cleanup patterns

### Phase 2: Medium Priority - Performance & Quality (Week 2)

#### Task 4: Extract Constants
- Create `mobile/constants.ts` for all magic numbers
- Define touch thresholds, animations, sizes
- Make values configurable
- Document each constant's purpose

#### Task 5: Refactor useMobileDetection
- Extract duplicate detection logic
- Add resize event debouncing
- Fix memory leak in visualViewport listener
- Simplify state updates

#### Task 6: Simplify useTouchGestures
- Break down into smaller functions:
  - `detectSwipe()`, `detectPinch()`, `detectLongPress()`
- Create gesture state machine
- Add event throttling
- Improve error handling

### Phase 3: Lower Priority - Enhancement (Week 3)

#### Task 7: Improve useCustomKeySets
- Add error handling for localStorage
- Implement async storage wrapper
- Add data validation
- Use better ID generation (UUID)

#### Task 8: Simplify Virtual Keyboard
- Remove KeySetEditor component
- Keep only essential predefined key sets
- Reduce CSS complexity
- Add lazy loading for key sets

#### Task 9: Create Design System
- Define CSS custom properties:
  ```css
  --mobile-touch-target-min: 44px;
  --mobile-safe-area-inset: env(safe-area-inset-bottom);
  --mobile-animation-duration: 200ms;
  ```
- Extend Tailwind with mobile utilities
- Create consistent spacing scale

#### Task 10: Add Tests
- Unit tests for hooks
- Integration tests for components
- Gesture simulation tests
- Accessibility tests

## Implementation Strategy

### Branch Strategy
- Branch: `feature/mobile-refactor`
- Create sub-branches for each major task
- Regular commits with clear messages

### Testing Approach
1. Manual testing on real devices (iOS Safari, Android Chrome)
2. Automated tests for critical paths
3. Performance profiling before/after
4. Accessibility audit

### Rollout Plan
1. Complete Phase 1 tasks first (breaking changes)
2. Deploy to staging for testing
3. Complete Phase 2 & 3 incrementally
4. Document all changes for team

## Success Metrics

- **Code Reduction**: 30-40% fewer lines of code
- **Type Coverage**: 100% TypeScript coverage (no `any`)
- **Performance**: <16ms touch response time
- **Test Coverage**: >80% for mobile components
- **Bundle Size**: Reduce mobile JS by 20%

## Migration Guide

### For Developers
1. Import Terminal instead of MobileTerminal
2. Use new toast API: `useToast()` hook
3. Access constants from `mobile/constants`
4. Run new test suite before committing

### Breaking Changes
- MobileTerminal component removed
- KeySetEditor component removed  
- Toast API changed
- Some props renamed for clarity

## Timeline

- **Week 1**: Phase 1 (High Priority)
- **Week 2**: Phase 2 (Medium Priority)
- **Week 3**: Phase 3 (Lower Priority)
- **Week 4**: Testing, documentation, deployment

## Notes

- Prioritize user-facing improvements
- Maintain backward compatibility where possible
- Document decisions and trade-offs
- Regular code reviews during refactoring