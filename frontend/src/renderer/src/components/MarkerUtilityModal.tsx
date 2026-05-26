import React, { useState } from 'react';
import { Marker, TreeNode } from '../types/waveform';

interface Props {
  markers: Marker[];
  activeMarker: number | null;
  signalData: Record<string, any[]>;
  treeData: TreeNode[];
  selectedNodeIds: string[];
  onClose: () => void;
}

export const MarkerUtilityModal: React.FC<Props> = ({ markers, activeMarker, signalData, treeData, selectedNodeIds, onClose }) => {
  const points: { id: string, name: string, time: number }[] = [];
  if (activeMarker !== null) {
     points.push({ id: 'active', name: 'Active Marker', time: activeMarker });
  }
  markers.forEach(m => points.push({ id: m.id, name: m.name, time: m.time }));

  const [pointA, setPointA] = useState<string>(points.length > 0 ? points[0].id : '');
  const [pointB, setPointB] = useState<string>(points.length > 1 ? points[1].id : (points.length > 0 ? points[0].id : ''));

  const pA = points.find(p => p.id === pointA) || points[0];
  const pB = points.find(p => p.id === pointB) || points[1] || points[0];

  let timeA = pA ? pA.time : 0;
  let timeB = pB ? pB.time : 0;
  let diff = Math.abs(timeA - timeB);
  
  // Find currently selected signal from the left pane
  let selectedFullName: string | null = null;
  let selectedName: string | null = null;
  if (selectedNodeIds.length > 0) {
     const walk = (nodes: TreeNode[]) => {
        for (const n of nodes) {
           if (n.id === selectedNodeIds[0]) { selectedFullName = n.full_name || null; selectedName = n.name; return; }
           if (n.children) walk(n.children);
        }
     };
     walk(treeData);
  }

  let timesChanged = 0;
  let positiveEdges = 0;
  if (selectedFullName && signalData[selectedFullName]) {
     const trans = signalData[selectedFullName];
     const minT = Math.min(timeA, timeB);
     const maxT = Math.max(timeA, timeB);
     let lastVal = null;
     for (const t of trans) {
        if (t.time >= minT && t.time <= maxT) {
           timesChanged++;
           if (lastVal === '0' && t.value === '1') positiveEdges++;
        }
        lastVal = t.value;
     }
  }

  // Frequency based on positive edges of selected signal
  const freqHz = (diff > 0 && positiveEdges > 0) ? (positiveEdges / (diff * 1e-12)) : 0;
  let freqStr = 'N/A';
  if (freqHz > 0) {
     if (freqHz >= 1e9) freqStr = (freqHz / 1e9).toFixed(3) + ' GHz';
     else if (freqHz >= 1e6) freqStr = (freqHz / 1e6).toFixed(3) + ' MHz';
     else if (freqHz >= 1e3) freqStr = (freqHz / 1e3).toFixed(3) + ' kHz';
     else freqStr = freqHz.toFixed(3) + ' Hz';
  }

  return (
    <>
       <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#2d2d2d', border: '1px solid #555', borderRadius: '8px', padding: '15px', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', width: '350px', color: '#eee', fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '15px' }}>
             <h3 style={{ margin: 0, fontSize: '16px' }}>Marker Utility</h3>
             <button onClick={onClose} style={{ background: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer', fontSize: '16px' }}>&times;</button>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
             <div style={{ flex: 1, marginRight: '10px' }}>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Point A</label><br/>
                <select value={pointA} onChange={e => setPointA(e.target.value)} style={{ background: '#111', color: 'white', padding: '6px', width: '100%', border: '1px solid #444', borderRadius: '4px' }}>
                   {points.length === 0 && <option value="">No markers</option>}
                   {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>
             <div style={{ flex: 1, marginLeft: '10px' }}>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Point B</label><br/>
                <select value={pointB} onChange={e => setPointB(e.target.value)} style={{ background: '#111', color: 'white', padding: '6px', width: '100%', border: '1px solid #444', borderRadius: '4px' }}>
                   {points.length === 0 && <option value="">No markers</option>}
                   {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>
          </div>

          <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse', fontSize: '14px' }}>
             <tbody>
                <tr>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid #444' }}>Time A</td>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid #444', textAlign: 'right' }}>{timeA}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid #444' }}>Time B</td>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid #444', textAlign: 'right' }}>{timeB}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid #444' }}>Period (|A - B|)</td>
                  <td style={{ padding: '6px 4px', borderBottom: '1px solid #444', textAlign: 'right', fontWeight: 'bold', color: '#ffcc00' }}>{diff}</td>
                </tr>
             </tbody>
          </table>

          <div style={{ marginBottom: '10px', background: '#1a1a1a', padding: '10px', borderRadius: '4px', border: '1px solid #333' }}>
             <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>
                Signal: <span style={{ color: 'white' }}>{selectedName || "None selected"}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px' }}>Times Changed:</span>
                <strong style={{ color: '#00ff00', fontSize: '13px' }}>{selectedName ? timesChanged : '-'}</strong>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px' }}>Frequency:</span>
                <strong style={{ color: '#00ccff', fontSize: '13px' }}>{selectedName ? freqStr : '-'}</strong>
             </div>
          </div>
       </div>
    </>
  );
};
