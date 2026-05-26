import React from 'react';
import { Marker } from '../types/waveform';

interface ContextMenusProps {
  contextMenu: {x: number, y: number, nodeIds: string[], type: 'signal' | 'group'} | null;
  setContextMenu: (menu: null) => void;
  markerMenu: {x: number, y: number, markerId: string} | null;
  setMarkerMenu: (menu: null) => void;
  setRadixState: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSignalColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSavedMarkers: React.Dispatch<React.SetStateAction<Marker[]>>;
  onGroupSelected?: () => void;
  setTreeData: React.Dispatch<React.SetStateAction<TreeNode[]>>;
}

/**
 * Renders the floating context menus for right-clicking signals, groups, and markers.
 * Isolated from the main component to prevent DOM bloat.
 */
export const WaveformContextMenus: React.FC<ContextMenusProps> = ({
  contextMenu,
  setContextMenu,
  markerMenu,
  setMarkerMenu,
  setRadixState,
  setSignalColors,
  setSavedMarkers,
  onGroupSelected,
  setTreeData
}) => {
  const handleExpand = (expand: boolean, recursive: boolean) => {
    if (!contextMenu) return;
    setTreeData(prev => {
        const toggle = (nodes: TreeNode[]): TreeNode[] => {
           return nodes.map(n => {
              if (n.id === contextMenu.nodeIds[0]) {
                 const newN = { ...n, expanded: expand };
                 if (recursive && newN.children) newN.children = toggleRecursive(newN.children, expand);
                 return newN;
              }
              if (n.children) return { ...n, children: toggle(n.children) };
              return n;
           });
        };
        const toggleRecursive = (nodes: TreeNode[], ex: boolean): TreeNode[] => {
           return nodes.map(n => {
              const newN = { ...n, expanded: ex };
              if (newN.children) newN.children = toggleRecursive(newN.children, ex);
              return newN;
           });
        };
        return toggle(prev);
    });
    setContextMenu(null);
  };

  return (
    <>
      {/* Signal Context Menu */}
      {contextMenu && (
        <div style={{ position: 'absolute', top: contextMenu.y, left: contextMenu.x, backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', padding: '5px 0', zIndex: 100, minWidth: '150px' }}>
          {contextMenu.type === 'signal' && (
            <>
              <div style={{ padding: '8px 15px', borderBottom: '1px solid #555', color: '#aaa', fontSize: '12px', fontWeight: 'bold' }}>Radix</div>
              {['Binary', 'Hex', 'Octal', 'Decimal', 'Unsigned', 'ASCII'].map(r => (
                <div 
                  key={r}
                  onClick={() => {
                    setRadixState(prev => {
                      const next = { ...prev };
                      contextMenu.nodeIds.forEach(id => next[id] = r.toLowerCase());
                      return next;
                    });
                    setContextMenu(null);
                  }}
                  style={{ padding: '8px 15px', cursor: 'pointer', color: 'white', fontSize: '14px' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#444'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {r}
                </div>
              ))}
            </>
          )}

          {onGroupSelected && (
            <>
              <div style={{ padding: '8px 15px', borderBottom: '1px solid #555', borderTop: '1px solid #555', color: '#aaa', fontSize: '12px', fontWeight: 'bold' }}>Organization</div>
              <div 
                onClick={() => {
                  onGroupSelected();
                  setContextMenu(null);
                }}
                style={{ padding: '8px 15px', cursor: 'pointer', color: 'white', fontSize: '14px' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#444'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Group Selected
              </div>
            </>
          )}

          <div style={{ padding: '8px 15px', borderBottom: '1px solid #555', borderTop: '1px solid #555', color: '#aaa', fontSize: '12px', fontWeight: 'bold' }}>View</div>
          <div onClick={() => handleExpand(true, false)} style={{ padding: '8px 15px', cursor: 'pointer', color: 'white', fontSize: '14px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#444'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Expand</div>
          <div onClick={() => handleExpand(false, false)} style={{ padding: '8px 15px', cursor: 'pointer', color: 'white', fontSize: '14px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#444'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Collapse</div>
          <div onClick={() => handleExpand(true, true)} style={{ padding: '8px 15px', cursor: 'pointer', color: 'white', fontSize: '14px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#444'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Expand All</div>
          <div onClick={() => handleExpand(false, true)} style={{ padding: '8px 15px', cursor: 'pointer', color: 'white', fontSize: '14px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#444'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Collapse All</div>

          <div style={{ padding: '8px 15px', borderBottom: '1px solid #555', borderTop: '1px solid #555', color: '#aaa', fontSize: '12px', fontWeight: 'bold' }}>Color</div>
          <label style={{ display: 'block', padding: '8px 15px', cursor: 'pointer', color: 'white', fontSize: '14px' }}>
            Change Color
            <input 
              type="color" style={{ display: 'none' }} 
              onChange={e => {
                const val = e.target.value;
                setSignalColors(prev => {
                  const next = { ...prev };
                  contextMenu.nodeIds.forEach(id => next[id] = val);
                  return next;
                });
                setContextMenu(null);
              }}
            />
          </label>
          <div 
            onClick={() => {
              setSignalColors(prev => {
                const next = { ...prev };
                contextMenu.nodeIds.forEach(id => delete next[id]);
                return next;
              });
              setContextMenu(null);
            }} 
            style={{ padding: '8px 15px', cursor: 'pointer', color: 'white', fontSize: '14px' }}
          >
            Reset Color
          </div>
        </div>
      )}

      {/* Marker Context Menu */}
      {markerMenu && (
        <div style={{ position: 'absolute', top: markerMenu.y, left: markerMenu.x, backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', padding: '5px 0', zIndex: 100, minWidth: '150px' }}>
          <div style={{ padding: '8px 15px', color: 'white', fontSize: '14px' }}>
            <input 
              type="text" placeholder="Rename marker..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const newName = e.currentTarget.value.trim();
                  if (newName) {
                     setSavedMarkers(prev => {
                        if (prev.some(m => m.name === newName)) {
                           alert('A marker with this name already exists.');
                           return prev;
                        }
                        return prev.map(m => m.id === markerMenu.markerId ? { ...m, name: newName } : m);
                     });
                  }
                  setMarkerMenu(null);
                }
              }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', background: '#222', color: 'white', border: '1px solid #555', padding: '4px' }}
              autoFocus
            />
          </div>
          <div 
            onClick={() => {
              setSavedMarkers(prev => prev.filter(m => m.id !== markerMenu.markerId));
              setMarkerMenu(null);
            }} 
            style={{ padding: '8px 15px', cursor: 'pointer', color: '#ff6666', fontSize: '14px' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#444'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Remove Marker
          </div>
        </div>
      )}
    </>
  );
};
