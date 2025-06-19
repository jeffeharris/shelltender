/**
 * Keyboard types for the enhanced virtual keyboard system
 */

/**
 * Special key identifiers that send escape sequences
 */
export type SpecialKeyType = 
  | 'escape' 
  | 'tab' 
  | 'backspace' 
  | 'enter'
  | 'up' 
  | 'down' 
  | 'left' 
  | 'right'
  | 'home' 
  | 'end' 
  | 'pageup' 
  | 'pagedown'
  | 'delete'
  | 'ctrl-a' | 'ctrl-b' | 'ctrl-c' | 'ctrl-d' | 'ctrl-e' | 'ctrl-f'
  | 'ctrl-g' | 'ctrl-h' | 'ctrl-i' | 'ctrl-j' | 'ctrl-k' | 'ctrl-l'
  | 'ctrl-m' | 'ctrl-n' | 'ctrl-o' | 'ctrl-p' | 'ctrl-q' | 'ctrl-r'
  | 'ctrl-s' | 'ctrl-t' | 'ctrl-u' | 'ctrl-v' | 'ctrl-w' | 'ctrl-x'
  | 'ctrl-y' | 'ctrl-z'
  | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' 
  | 'f7' | 'f8' | 'f9' | 'f10' | 'f11' | 'f12';

/**
 * A single key definition in a key set
 */
export interface KeyDefinition {
  /** Display label for the key */
  label: string;
  /** Type of key action */
  type: 'text' | 'special' | 'command' | 'macro';
  /** Value based on type:
   * - text: string to insert
   * - special: SpecialKeyType
   * - command: command string (will append \n)
   * - macro: array of text/special keys
   */
  value: string | SpecialKeyType | Array<string | SpecialKeyType>;
  /** Optional icon name (for common actions) */
  icon?: string;
  /** Optional styling */
  style?: 'primary' | 'danger' | 'warning' | 'success';
  /** Width multiplier (default 1) */
  width?: number;
}

/**
 * A collection of keys
 */
export interface KeySet {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Array of keys in the set */
  keys: KeyDefinition[];
  /** Whether this is a built-in set (non-editable) */
  readonly?: boolean;
}

/**
 * Keyboard visibility and behavior preferences
 */
export interface KeyboardPreferences {
  /** Default key set to show */
  defaultKeySetId: string;
  /** Whether to show key hints */
  showHints: boolean;
  /** Keyboard height in rem */
  keyboardHeight: number;
  /** Whether to vibrate on key press (if supported) */
  hapticFeedback: boolean;
  /** Custom key sets created by user */
  customKeySets: KeySet[];
}

/**
 * Props for the EnhancedVirtualKeyboard component
 */
export interface EnhancedVirtualKeyboardProps {
  /** Whether the keyboard is visible */
  isVisible: boolean;
  /** Callback for text input */
  onInput: (text: string) => void;
  /** Callback for command input (includes newline) */
  onCommand: (command: string) => void;
  /** Callback for macro execution */
  onMacro: (keys: Array<string | SpecialKeyType>) => void;
  /** Callback when keyboard height changes */
  onHeightChange?: (height: number) => void;
  /** Override default preferences */
  preferences?: Partial<KeyboardPreferences>;
}

/**
 * Key set editor props
 */
export interface KeySetEditorProps {
  /** Key set being edited (undefined for new) */
  keySet?: KeySet;
  /** Callback when save is clicked */
  onSave: (keySet: KeySet) => void;
  /** Callback when cancel is clicked */
  onCancel: () => void;
}