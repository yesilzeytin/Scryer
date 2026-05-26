import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { TreeNode, Marker } from '../types/waveform';
import { formatValue } from '../utils/formatters';
import { renderCanvas } from '../utils/canvasRenderer';
import { useWaveformState } from '../hooks/useWaveformState';
import { useWaveformWebSocket } from '../hooks/useWaveformWebSocket';
import { WaveformContextMenus } from './WaveformContextMenus';
import { MarkerUtilityModal } from './MarkerUtilityModal';

const matchesEdge = (t: any, bitwidth: number, mode: string, searchValue: string) => {
   if (mode === 'change') return true;
   if (mode === 'assert') return String(t.value).trim() === '1';
   if (mode === 'deassert') return String(t.value).trim() === '0';
   if (mode === 'custom') {
       const search = searchValue.trim().toLowerCase();
       if (!search) return false;
       let s = search;
       if (search.startsWith("'b") || search.startsWith("'h") || search.startsWith("'o")) s = search.substring(2);
       
       const fHex = formatValue(t.value, bitwidth, 'hex').toLowerCase();
       const fBin = formatValue(t.value, bitwidth, 'binary').toLowerCase();
       const fDec = formatValue(t.value, bitwidth, 'decimal').toLowerCase();
       const fAsc = formatValue(t.value, bitwidth, 'ascii').toLowerCase();

       return (s === fHex || s === fBin || search === fDec || search === fAsc);
   }
   return false;
};

interface WaveformCanvasProps {
  port: string;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ port }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomRegion, setZoomRegion] = React.useState<{ startX: number, currentX: number, isRightClick: boolean } | null>(null);
  const [hoveredMarker, setHoveredMarker] = React.useState<{ name: string, time: number, x: number, y: number } | null>(null);
  
  // Custom Hook: Encapsulates all React state
  const state = useWaveformState();

  const flattenTree = useCallback((nodes: TreeNode[], depth = 0): { node: TreeNode, depth: number }[] => {
    let result: { node: TreeNode, depth: number }[] = [];
    for (const node of nodes) {
      result.push({ node, depth });
      if (node.type === 'group' && node.expanded && node.children) {
        result = result.concat(flattenTree(node.children, depth + 1));
      }
    }
    return result;
  }, []);

  const visibleNodes = useMemo(() => flattenTree(state.treeData), [state.treeData, flattenTree]);

  // Custom Hook: Encapsulates WebSocket and debounced lazy-loading
  const { sendMessage } = useWaveformWebSocket({
    port,
    setTreeData: state.setTreeData,
    setBaseTimeUnit: state.setBaseTimeUnit,
    setDisplayTimeUnit: state.setDisplayTimeUnit,
    setSignalData: state.setSignalData,
    visibleNodes,
    offsetY: state.offsetY,
    canvasHeight: state.canvasSize.height,
    rowHeight: state.rowHeight,
    requestedSignalsRef: state.requestedSignalsRef
  });

  const maxTime = useMemo(() => {
    let max = 1000;
    for (const path in state.signalData) {
      const trans = state.signalData[path];
      if (trans.length > 0) {
        max = Math.max(max, trans[trans.length - 1].time);
      }
    }
    return max;
  }, [state.signalData]);

  // Splitter Dragging
  useEffect(() => {
    if (!state.isDraggingSplitter) return;
    const handleWinMouseMove = (e: MouseEvent) => {
      if (state.isDraggingSplitter === 'main') {
        state.setLeftPaneWidth(Math.max(150, Math.min(e.clientX, window.innerWidth - 100)));
      } else if (state.isDraggingSplitter === 'col') {
        const newRatio = Math.max(0.1, Math.min(0.9, e.clientX / state.leftPaneWidth));
        state.setNameColRatio(newRatio);
      }
    };
    const handleWinMouseUp = () => state.setIsDraggingSplitter(null);
    window.addEventListener('mousemove', handleWinMouseMove);
    window.addEventListener('mouseup', handleWinMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWinMouseMove);
      window.removeEventListener('mouseup', handleWinMouseUp);
    };
  }, [state.isDraggingSplitter, state.leftPaneWidth, state.setLeftPaneWidth, state.setNameColRatio, state.setIsDraggingSplitter]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Scale canvas for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = state.canvasSize.width * dpr;
    canvas.height = state.canvasSize.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Delegate actual drawing commands to the pure renderer
    renderCanvas({
      ctx,
      width: state.canvasSize.width,
      height: state.canvasSize.height,
      visibleNodes,
      signalData: state.signalData,
      signalColors: state.signalColors,
      radixState: state.radixState,
      offsetX: state.offsetX,
      scaleX: state.scaleX,
      selectedNodeIds: state.selectedNodeIds,
      activeMarker: state.activeMarker,
      savedMarkers: state.savedMarkers,
      maxTime,
      rowHeight: state.rowHeight,
      displayTimeUnit: state.displayTimeUnit,
      baseTimeUnit: state.baseTimeUnit,
      offsetY: state.offsetY
    });

    if (zoomRegion) {
      ctx.fillStyle = zoomRegion.isRightClick ? 'rgba(255, 150, 100, 0.3)' : 'rgba(100, 150, 255, 0.3)';
      const leftX = Math.min(zoomRegion.startX, zoomRegion.currentX);
      const rightX = Math.max(zoomRegion.startX, zoomRegion.currentX);
      ctx.fillRect(leftX, 0, rightX - leftX, state.canvasSize.height);
      ctx.strokeStyle = zoomRegion.isRightClick ? 'rgb(255, 150, 100)' : 'rgb(100, 150, 255)';
      ctx.lineWidth = 1;
      ctx.strokeRect(leftX, 0, rightX - leftX, state.canvasSize.height);
    }

  }, [visibleNodes, state.signalData, state.signalColors, state.radixState, state.offsetX, state.offsetY, state.scaleX, state.canvasSize, state.selectedNodeIds, state.activeMarker, state.savedMarkers, maxTime, state.rowHeight, state.displayTimeUnit, state.baseTimeUnit, zoomRegion]);

  // Canvas resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        state.setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [state.setCanvasSize]);

  // Mouse Wheel Interactions (Zoom/Pan)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const mouseX = e.offsetX;
        const timeAtMouse = (mouseX - state.offsetX) / state.scaleX;
        
        const minScale = state.canvasSize.width / (maxTime * 0.1);
        const newScaleX = Math.max(minScale, Math.min(state.scaleX * zoomFactor, 100));
        
        state.setScaleX(newScaleX);
        state.setOffsetX(Math.min(0, mouseX - timeAtMouse * newScaleX));
      } else {
        state.setOffsetX(prev => Math.min(0, prev - e.deltaX));
        const maxScroll = Math.min(0, - (visibleNodes.length * state.rowHeight) + state.canvasSize.height - 100);
        const newY = Math.max(maxScroll, Math.min(0, state.offsetY - e.deltaY));
        state.setOffsetY(newY);
        if (state.scrollContainerRef.current) state.scrollContainerRef.current.scrollTop = -newY;
      }
    };
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [state.offsetX, state.offsetY, state.scaleX, visibleNodes.length, state.canvasSize, maxTime, state.rowHeight, state.setOffsetX, state.setOffsetY, state.setScaleX, state.scrollContainerRef]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;

    if (e.button === 0 && e.shiftKey) {
      state.setIsDragging(true);
      state.setDragStart({ x: e.clientX - state.offsetX, y: e.clientY - state.offsetY });
    } else if (e.button === 0 && !e.shiftKey) {
      setZoomRegion({ startX: x, currentX: x, isRightClick: false });
    } else if (e.button === 2) {
      setZoomRegion({ startX: x, currentX: x, isRightClick: true });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;

    if (state.isDragging) {
      state.setOffsetX(Math.min(0, e.clientX - state.dragStart.x));
      const maxScroll = Math.min(0, - (visibleNodes.length * state.rowHeight) + state.canvasSize.height - 100);
      const newY = Math.max(maxScroll, Math.min(0, e.clientY - state.dragStart.y));
      state.setOffsetY(newY);
      if (state.scrollContainerRef.current) state.scrollContainerRef.current.scrollTop = -newY;
    } else if (zoomRegion) {
      setZoomRegion({ ...zoomRegion, currentX: x });
    } else {
      let found = false;
      for (const m of state.savedMarkers) {
        const mx = m.time * state.scaleX + state.offsetX;
        if (Math.abs(x - mx) < 5) {
           setHoveredMarker({ name: m.name, time: m.time, x: e.clientX, y: e.clientY });
           found = true;
           break;
        }
      }
      if (!found && state.activeMarker !== null) {
        const mx = state.activeMarker * state.scaleX + state.offsetX;
        if (Math.abs(x - mx) < 5) {
           setHoveredMarker({ name: 'Active Marker', time: state.activeMarker, x: e.clientX, y: e.clientY });
           found = true;
        }
      }
      if (!found && hoveredMarker) setHoveredMarker(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    state.setIsDragging(false);
    if (zoomRegion) {
       const leftX = Math.min(zoomRegion.startX, zoomRegion.currentX);
       const rightX = Math.max(zoomRegion.startX, zoomRegion.currentX);
       
       if (rightX - leftX > 10) {
          const startTime = (leftX - state.offsetX) / state.scaleX;
          const endTime = (rightX - state.offsetX) / state.scaleX;
          const timeSpan = endTime - startTime;
          
          if (timeSpan > 0) {
             if (!zoomRegion.isRightClick) {
                 const newScaleX = state.canvasSize.width / timeSpan;
                 state.setScaleX(newScaleX);
                 state.setOffsetX( Math.min(0, -startTime * newScaleX) );
             } else {
                 const newScaleX = Math.max(state.canvasSize.width / (maxTime * 1.05), state.scaleX * ( (rightX - leftX) / state.canvasSize.width ));
                 const centerTime = (startTime + endTime) / 2;
                 state.setScaleX(newScaleX);
                 state.setOffsetX( Math.min(0, (state.canvasSize.width / 2) - (centerTime * newScaleX)) );
             }
          }
       } else if (e.type !== 'mouseleave' && !zoomRegion.isRightClick) {
          const clickedTime = (leftX - state.offsetX) / state.scaleX;
          state.setActiveMarker(clickedTime);
       }
       setZoomRegion(null);
    }
  };

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    
    // Check if clicked on a marker line
    for (const m of state.savedMarkers) {
      const mx = m.time * state.scaleX + state.offsetX;
      if (Math.abs(mouseX - mx) < 5) {
        state.setMarkerMenu({ x: e.clientX, y: e.clientY, markerId: m.id });
        return;
      }
    }
  };

  const addMarker = useCallback(() => {
    if (state.activeMarker === null) return;
    state.setSavedMarkers(prev => {
        let n = 0;
        const existingNames = new Set(prev.map(m => m.name));
        while (existingNames.has(`m${n}`)) { n++; }
        const newName = `m${n}`;
        return [...prev, { id: Math.random().toString(), name: newName, time: state.activeMarker as number }];
    });
  }, [state.activeMarker, state.setSavedMarkers]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 's' && state.activeMarker !== null) {
        addMarker();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.activeMarker, addMarker]);

  const handleGroupSelected = useCallback(() => {
     if (state.selectedNodeIds.length === 0) return;
     state.setTreeData(prev => {
        const nodesToGroup: TreeNode[] = [];
        let commonParentId: string | null = null;
        let multipleParents = false;

        const removeNodes = (nodes: TreeNode[], parentId: string | null): TreeNode[] => {
           return nodes.filter(n => {
              if (state.selectedNodeIds.includes(n.id)) {
                 nodesToGroup.push(n);
                 if (commonParentId === null && !multipleParents) {
                    commonParentId = parentId;
                 } else if (commonParentId !== parentId) {
                    multipleParents = true;
                    commonParentId = null;
                 }
                 return false;
              }
              if (n.children) n.children = removeNodes(n.children, n.id);
              return true;
           });
        };
        let newTree = removeNodes(JSON.parse(JSON.stringify(prev)), null);
        if (nodesToGroup.length === 0) return prev;

        let n = 0;
        const checkExists = (nodes: TreeNode[], name: string): boolean => {
           return nodes.some(node => node.name === name || (node.children && checkExists(node.children, name)));
        };
        while (checkExists(newTree, `Group_${n}`)) { n++; }

        const newGroup: TreeNode = {
           id: `group_${Math.random()}`,
           type: 'group',
           name: `Group_${n}`,
           children: nodesToGroup,
           expanded: true
        };

        if (!multipleParents && commonParentId !== null) {
            const insertIntoParent = (nodes: TreeNode[]): TreeNode[] => {
                return nodes.map(n => {
                    if (n.id === commonParentId) {
                        return { ...n, children: [newGroup, ...(n.children || [])] };
                    }
                    if (n.children) {
                        return { ...n, children: insertIntoParent(n.children) };
                    }
                    return n;
                });
            };
            return insertIntoParent(newTree);
        }

        return [newGroup, ...newTree];
     });
     state.setSelectedNodeIds([]);
  }, [state.selectedNodeIds, state.setTreeData, state.setSelectedNodeIds]);

  const findNextEdge = useCallback((direction: 'next' | 'prev') => {
     if (state.selectedNodeIds.length === 0) return;
     const selectedId = state.selectedNodeIds[0];
     let fullName: string | undefined;
     let bitwidth = 1;
     const findName = (nodes: TreeNode[]) => {
        for (const n of nodes) {
           if (n.id === selectedId) { fullName = n.full_name; bitwidth = n.bitwidth || 1; return; }
           if (n.children) findName(n.children);
        }
     };
     findName(state.treeData);
     if (!fullName || !state.signalData[fullName]) return;
     
     const transitions = state.signalData[fullName];
     if (transitions.length === 0) return;

     const currentTime = state.activeMarker !== null ? state.activeMarker : ( (-state.offsetX + state.canvasSize.width/2) / state.scaleX );

     let foundIndex = -1;
     if (direction === 'next') {
        for (let i = 0; i < transitions.length; i++) {
           if (transitions[i].time > currentTime + 1e-6) {
              if (matchesEdge(transitions[i], bitwidth, state.edgeSearchMode, state.edgeSearchValue)) {
                 foundIndex = i; break;
              }
           }
        }
     } else {
        for (let i = transitions.length - 1; i >= 0; i--) {
           if (transitions[i].time < currentTime - 1e-6) {
              if (matchesEdge(transitions[i], bitwidth, state.edgeSearchMode, state.edgeSearchValue)) {
                 foundIndex = i; break;
              }
           }
        }
     }

     if (foundIndex !== -1) {
        const targetTime = transitions[foundIndex].time;
        state.setActiveMarker(targetTime);
        state.setOffsetX( Math.min(0, (state.canvasSize.width / 2) - (targetTime * state.scaleX)) );
     } else {
        alert("No instance of entered value is found.");
     }
  }, [state.selectedNodeIds, state.treeData, state.signalData, state.activeMarker, state.offsetX, state.canvasSize.width, state.scaleX, state.edgeSearchMode, state.edgeSearchValue, state.setActiveMarker, state.setOffsetX]);

  const jumpMarker = useCallback((direction: 'next' | 'prev') => {
     const centerTime = state.activeMarker !== null ? state.activeMarker : ( (-state.offsetX + state.canvasSize.width/2) / state.scaleX );
     let targetTime: number | null = null;
     
     const times = [...state.savedMarkers.map(m => m.time)].sort((a, b) => a - b);
     
     if (direction === 'next') {
        const nextTime = times.find(t => t > centerTime + 1e-6);
        if (nextTime !== undefined) targetTime = nextTime;
     } else {
        const prevTime = [...times].reverse().find(t => t < centerTime - 1e-6);
        if (prevTime !== undefined) targetTime = prevTime;
     }

     if (targetTime !== null) {
        state.setActiveMarker(targetTime);
        state.setOffsetX( Math.min(0, (state.canvasSize.width / 2) - (targetTime * state.scaleX)) );
     }
  }, [state.activeMarker, state.offsetX, state.canvasSize.width, state.scaleX, state.savedMarkers, state.setActiveMarker, state.setOffsetX]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        state.setSelectedNodeIds(visibleNodes.map(n => n.node.id));
      } else if (e.shiftKey && e.key.toLowerCase() === 's' && state.activeMarker !== null) {
        addMarker();
      } else if (e.ctrlKey && e.key === 'ArrowRight') {
        findNextEdge('next');
      } else if (e.ctrlKey && e.key === 'ArrowLeft') {
        findNextEdge('prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.activeMarker, addMarker, findNextEdge, visibleNodes, state.setSelectedNodeIds]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#1e1e1e', color: '#ccc', fontFamily: 'sans-serif' }}>
      
      {/* Context Menus */}
      <WaveformContextMenus 
        contextMenu={state.contextMenu}
        setContextMenu={state.setContextMenu}
        markerMenu={state.markerMenu}
        setMarkerMenu={state.setMarkerMenu}
        setRadixState={state.setRadixState}
        setSignalColors={state.setSignalColors}
        setSavedMarkers={state.setSavedMarkers}
        onGroupSelected={handleGroupSelected}
        setTreeData={state.setTreeData}
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', padding: '5px 10px', backgroundColor: '#333', borderBottom: '1px solid #444', alignItems: 'center' }}>
        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginRight: '15px' }}>Save State</button>
        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginRight: '15px' }}>Load State</button>
        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>Help</button>
        
        <div style={{ width: '1px', height: '20px', backgroundColor: '#555', margin: '0 15px' }} />
        
        <button onClick={() => state.setScaleX(s => Math.min(s * 1.5, 100))} style={{ marginRight: '5px' }}>Zoom In (+)</button>
        <button onClick={() => state.setScaleX(s => Math.max(s / 1.5, state.canvasSize.width / (maxTime * 0.1)))} style={{ marginRight: '5px' }}>Zoom Out (-)</button>
        <button onClick={() => {
           const safeMaxTime = maxTime > 0 ? maxTime : 1000;
           const newScaleX = state.canvasSize.width / (safeMaxTime * 1.05);
           if (isFinite(newScaleX) && newScaleX > 0) {
              state.setScaleX(newScaleX);
              state.setOffsetX(0);
           }
        }} style={{ marginRight: '15px' }}>Zoom to Fit</button>
        <button onClick={addMarker} style={{ marginRight: '5px' }}>Freeze Marker (Shift+S)</button>
        <button onClick={() => state.setSavedMarkers([])} style={{ marginRight: '5px' }}>Clear All Markers</button>
        <button onClick={() => jumpMarker('prev')} style={{ padding: '2px 6px', marginRight: '2px' }}>&larr; Marker</button>
        <button onClick={() => jumpMarker('next')} style={{ padding: '2px 6px', marginRight: '15px' }}>Marker &rarr;</button>
        <button onClick={() => state.setShowMarkerUtility(true)} style={{ padding: '4px 8px', background: '#007acc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '15px' }}>Marker Calculator</button>

        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#333', padding: '2px 8px', borderRadius: '4px', marginRight: '15px' }}>
          <span style={{ fontSize: '12px', marginRight: '8px' }}>Search Edge:</span>
          <select value={state.edgeSearchMode} onChange={e => state.setEdgeSearchMode(e.target.value)} style={{ backgroundColor: '#222', color: 'white', border: '1px solid #555', marginRight: '5px', padding: '2px' }}>
            <option value="change">Value Change</option>
            <option value="assert">Assert High</option>
            <option value="deassert">Deassert Low</option>
            <option value="custom">Custom Value</option>
          </select>
          {state.edgeSearchMode === 'custom' && (
             <input type="text" placeholder="'hA54, 'b01, etc." value={state.edgeSearchValue} onChange={e => state.setEdgeSearchValue(e.target.value)} style={{ backgroundColor: '#222', color: 'white', border: '1px solid #555', width: '100px', marginRight: '5px', padding: '2px 4px' }} />
          )}
          <button onClick={() => findNextEdge('prev')} style={{ padding: '2px 6px', marginRight: '2px' }}>&larr; Prev</button>
          <button onClick={() => findNextEdge('next')} style={{ padding: '2px 6px' }}>Next &rarr;</button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <label style={{ marginRight: '10px' }}>Time Unit:</label>
          <select value={state.displayTimeUnit} onChange={(e) => state.setDisplayTimeUnit(e.target.value)} style={{ background: '#222', color: 'white', border: '1px solid #555' }}>
            <option value="1 fs">1 fs</option>
            <option value="10 fs">10 fs</option>
            <option value="100 fs">100 fs</option>
            <option value="1 ps">1 ps</option>
            <option value="10 ps">10 ps</option>
            <option value="100 ps">100 ps</option>
            <option value="1 ns">1 ns</option>
            <option value="10 ns">10 ns</option>
            <option value="100 ns">100 ns</option>
            <option value="1 us">1 us</option>
            <option value="10 us">10 us</option>
            <option value="100 us">100 us</option>
            <option value="1 ms">1 ms</option>
            <option value="1 s">1 s</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} onClick={() => { state.setContextMenu(null); state.setMarkerMenu(null); }}>
        
        {/* Left Pane containing Signal Tree and Values */}
        <div 
          style={{ width: `${state.leftPaneWidth}px`, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', borderRight: '1px solid #444', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', height: '30px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #444', fontSize: '12px', color: '#888' }}>
            <div style={{ width: `${state.nameColWidth}px`, padding: '8px 10px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Signal Name</div>
            <div 
              style={{ width: '4px', cursor: 'col-resize', backgroundColor: '#444' }} 
              onMouseDown={() => state.setIsDraggingSplitter('col')}
            />
            <div style={{ flex: 1, padding: '8px 10px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Value</div>
          </div>
          
          <div 
            ref={state.scrollContainerRef}
            style={{ flex: 1, position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}
            onScroll={(e) => {
               const newY = -e.currentTarget.scrollTop;
               if (newY !== state.offsetY) state.setOffsetY(newY);
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${visibleNodes.length * state.rowHeight}px` }}>
              {visibleNodes.map((item, idx) => {
                const realTop = idx * state.rowHeight;
                if (realTop < -state.offsetY - state.rowHeight * 5 || realTop > -state.offsetY + state.canvasSize.height + state.rowHeight * 5) return null;
                const node = item.node;
                
                let activeValue = '';
                if (node.type === 'signal' && node.full_name && state.signalData[node.full_name]) {
                  const transitions = state.signalData[node.full_name];
                  if (transitions.length > 0) {
                    let val = transitions[0].value;
                    if (state.activeMarker !== null) {
                      for (let i = transitions.length - 1; i >= 0; i--) {
                        if (transitions[i].time <= state.activeMarker) {
                          val = transitions[i].value;
                          break;
                        }
                      }
                    }
                    activeValue = formatValue(val, node.bitwidth || 1, state.radixState[node.id] || 'hex');
                  }
                }

                return (
                  <div 
                    key={node.id} 
                    draggable
                    onDragStart={(e) => {
                      state.setDraggedNodeId(node.id);
                      e.dataTransfer.setData('text/plain', node.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (state.draggedNodeId !== node.id) state.setDropTargetId(node.id);
                    }}
                    onDragLeave={() => state.setDropTargetId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.getData('text/plain');
                      if (draggedId && draggedId !== node.id) {
                         state.setTreeData(prev => {
                            let draggedNode: TreeNode | null = null;
                            const removeNode = (nodes: TreeNode[]): TreeNode[] => {
                               return nodes.filter(n => {
                                  if (n.id === draggedId) { draggedNode = n; return false; }
                                  if (n.children) n.children = removeNode(n.children);
                                  return true;
                               });
                            };
                            let newTree = removeNode(JSON.parse(JSON.stringify(prev)));
                            if (!draggedNode) return prev;
                            const insertNode = (nodes: TreeNode[]): TreeNode[] => {
                               const idx = nodes.findIndex(n => n.id === node.id);
                               if (idx !== -1) { nodes.splice(idx, 0, draggedNode!); return nodes; }
                               nodes.forEach(n => { if (n.type === 'group' && n.children) n.children = insertNode(n.children); });
                               return nodes;
                            };
                            return insertNode(newTree);
                         });
                      }
                      state.setDraggedNodeId(null);
                      state.setDropTargetId(null);
                    }}
                    style={{ position: 'absolute', top: realTop, width: '100%', height: `${state.rowHeight}px`, display: 'flex', borderBottom: '1px solid #333', backgroundColor: state.selectedNodeIds.includes(node.id) ? '#3a3a3a' : (state.dropTargetId === node.id ? '#4a4a4a' : 'transparent'), cursor: node.type === 'group' ? 'pointer' : 'default' }}
                    onClick={(e) => {
                      if (node.type === 'group') {
                        state.setTreeData(prev => {
                          const toggleExpand = (nodes: TreeNode[]): TreeNode[] => {
                            return nodes.map(n => {
                              if (n.id === node.id) return { ...n, expanded: !n.expanded };
                              if (n.children) return { ...n, children: toggleExpand(n.children) };
                              return n;
                            });
                          };
                          return toggleExpand(prev);
                        });
                      } else {
                        if (e.ctrlKey) {
                          state.setSelectedNodeIds(prev => prev.includes(node.id) ? prev.filter(i => i !== node.id) : [...prev, node.id]);
                        } else if (e.shiftKey) {
                           if (state.selectedNodeIds.length > 0) {
                              const lastId = state.selectedNodeIds[state.selectedNodeIds.length - 1];
                              const flatIds = visibleNodes.map(n => n.node.id);
                              const idx1 = flatIds.indexOf(lastId);
                              const idx2 = flatIds.indexOf(node.id);
                              if (idx1 !== -1 && idx2 !== -1) {
                                 const start = Math.min(idx1, idx2);
                                 const end = Math.max(idx1, idx2);
                                 const range = flatIds.slice(start, end + 1);
                                 state.setSelectedNodeIds(Array.from(new Set([...state.selectedNodeIds, ...range])));
                              }
                           } else {
                              state.setSelectedNodeIds([node.id]);
                           }
                        } else {
                          state.setSelectedNodeIds([node.id]);
                        }
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!state.selectedNodeIds.includes(node.id)) {
                        state.setSelectedNodeIds([node.id]);
                        state.setContextMenu({ x: e.clientX, y: e.clientY, nodeIds: [node.id], type: node.type });
                      } else {
                        state.setContextMenu({ x: e.clientX, y: e.clientY, nodeIds: state.selectedNodeIds, type: node.type });
                      }
                    }}
                  >
                    <div style={{ width: `${state.nameColWidth}px`, paddingLeft: `${5 + item.depth * 10}px` }}>
                      {node.type === 'group' ? (node.expanded ? '▼ ' : '▶ ') : ''}
                      {node.name}
                      {node.bitwidth && node.bitwidth > 1 ? `[${node.bitwidth-1}:0]` : ''}
                    </div>
                    <div style={{ width: '4px' }} />
                    <div style={{ flex: 1, padding: '8px 10px', color: state.radixState[node.id] === 'ascii' ? '#88ccff' : 'inherit' }}>{activeValue}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div 
          style={{ width: '5px', cursor: 'col-resize', backgroundColor: '#444' }} 
          onMouseDown={() => state.setIsDraggingSplitter('main')}
        />
        
        {/* Waveform Canvas Area */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', cursor: state.isDragging ? 'grabbing' : 'crosshair', pointerEvents: state.isDraggingSplitter ? 'none' : 'auto' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleCanvasContextMenu}
          />
        </div>
      </div>

      {hoveredMarker && (
         <div style={{ position: 'fixed', left: hoveredMarker.x + 15, top: hoveredMarker.y + 15, background: '#333', color: 'white', padding: '4px 8px', borderRadius: '4px', border: '1px solid #555', zIndex: 100, pointerEvents: 'none', fontSize: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            {hoveredMarker.name}: {hoveredMarker.time} {state.displayTimeUnit}
         </div>
      )}

      {state.showMarkerUtility && (
        <MarkerUtilityModal
           markers={state.savedMarkers}
           activeMarker={state.activeMarker}
           signalData={state.signalData}
           treeData={state.treeData}
           selectedNodeIds={state.selectedNodeIds}
           onClose={() => state.setShowMarkerUtility(false)}
        />
      )}
    </div>
  );
};
