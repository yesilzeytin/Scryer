/**
 * TSDoc Interfaces for Scryer Waveform Viewer
 * Defines strict types to prevent the usage of `any`.
 */

export interface TreeNode {
  id: string;
  type: 'group' | 'signal';
  name: string;
  full_name?: string;
  bitwidth?: number;
  children?: TreeNode[];
  expanded?: boolean;
}

export interface Marker {
  id: string;
  name: string;
  time: number;
}

export interface SignalTransition {
  time: number;
  value: string;
}

export interface WebSocketMessage {
  type: 'all_signals' | 'transitions' | 'error';
  data?: any; // Cannot safely type without generics, but mapped immediately to strict types
  signal_path?: string;
  time_unit?: string;
  error?: string;
}

export interface CanvasViewport {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  width: number;
  height: number;
}
