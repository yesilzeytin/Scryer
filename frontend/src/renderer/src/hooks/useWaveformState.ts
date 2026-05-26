import { useState, useRef } from 'react';
import { TreeNode, Marker } from '../types/waveform';

/**
 * Encapsulates all React state variables for the Waveform Viewer.
 * Keeps the main component clean by grouping related state together.
 */
export function useWaveformState() {
  // Data State
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [signalData, setSignalData] = useState<Record<string, any[]>>({});
  const [signalColors, setSignalColors] = useState<Record<string, string>>({});
  const [radixState, setRadixState] = useState<Record<string, string>>({});
  
  const [baseTimeUnit, setBaseTimeUnit] = useState<string>('1 ns');
  const [displayTimeUnit, setDisplayTimeUnit] = useState<string>('1 ns');

  // Selection & UI State
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [rowHeight, setRowHeight] = useState(30);

  // Splitter state
  const [leftPaneWidth, setLeftPaneWidth] = useState(350);
  const [nameColRatio, setNameColRatio] = useState(0.7);
  const nameColWidth = Math.max(50, leftPaneWidth * nameColRatio);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<'main' | 'col' | null>(null);

  // Viewport state
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Markers
  const [activeMarker, setActiveMarker] = useState<number | null>(null);
  const [savedMarkers, setSavedMarkers] = useState<Marker[]>([]);

  // Edge Search
  const [edgeSearchMode, setEdgeSearchMode] = useState<string>('change');
  const [edgeSearchValue, setEdgeSearchValue] = useState<string>('');

  const [showMarkerUtility, setShowMarkerUtility] = useState<boolean>(false);

  // Context Menus
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, nodeIds: string[], type: 'signal' | 'group'} | null>(null);
  const [markerMenu, setMarkerMenu] = useState<{x: number, y: number, markerId: string} | null>(null);

  // DnD State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const requestedSignalsRef = useRef<Set<string>>(new Set());

  return {
    treeData, setTreeData,
    signalData, setSignalData,
    signalColors, setSignalColors,
    radixState, setRadixState,
    baseTimeUnit, setBaseTimeUnit,
    displayTimeUnit, setDisplayTimeUnit,
    selectedNodeIds, setSelectedNodeIds,
    rowHeight, setRowHeight,
    leftPaneWidth, setLeftPaneWidth,
    nameColRatio, setNameColRatio,
    nameColWidth,
    isDraggingSplitter, setIsDraggingSplitter,
    offsetX, setOffsetX,
    offsetY, setOffsetY,
    scaleX, setScaleX,
    isDragging, setIsDragging,
    dragStart, setDragStart,
    canvasSize, setCanvasSize,
    activeMarker, setActiveMarker,
    savedMarkers, setSavedMarkers,
    edgeSearchMode, setEdgeSearchMode,
    edgeSearchValue, setEdgeSearchValue,
    showMarkerUtility, setShowMarkerUtility,
    contextMenu, setContextMenu,
    markerMenu, setMarkerMenu,
    draggedNodeId, setDraggedNodeId,
    dropTargetId, setDropTargetId,
    scrollContainerRef,
    requestedSignalsRef
  };
}
