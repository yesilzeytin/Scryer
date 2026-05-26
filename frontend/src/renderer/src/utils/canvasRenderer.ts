import { TreeNode, Marker } from '../types/waveform';
import { formatValue } from './formatters';

interface RenderProps {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  visibleNodes: { node: TreeNode, depth: number }[];
  signalData: Record<string, any[]>;
  signalColors: Record<string, string>;
  radixState: Record<string, string>;
  offsetX: number;
  scaleX: number;
  selectedNodeIds: string[];
  activeMarker: number | null;
  savedMarkers: Marker[];
  maxTime: number;
  rowHeight: number;
  displayTimeUnit: string;
  baseTimeUnit: string;
  offsetY: number;
}

const RULER_HEIGHT = 30;

/**
 * Pure function to render the entire canvas state.
 * Extracted from the main component to separate drawing logic from React state.
 */
export function renderCanvas({
  ctx, width, height, visibleNodes, signalData, signalColors, radixState,
  offsetX, scaleX, selectedNodeIds, activeMarker, savedMarkers,
  maxTime, rowHeight, displayTimeUnit, baseTimeUnit, offsetY
}: RenderProps) {

  // Clear canvas
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, width, height);
  
  // Draw Ruler Background
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, width, RULER_HEIGHT);
  
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, RULER_HEIGHT);
  ctx.lineTo(width, RULER_HEIGHT);
  ctx.stroke();
  
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';

  // RULER RENDERING: Determine dynamic visual steps
  let stepVisual = 100 * scaleX; 
  let stepTime = 1000; 
  while (stepVisual > 200) { stepVisual /= 2; stepTime /= 2; }
  while (stepVisual < 50) { stepVisual *= 2; stepTime *= 2; }

  const firstTick = Math.floor(-offsetX / (stepTime * 0.1 * scaleX)) * stepTime;
  
  // Time unit formatting
  const timeMultipliers: Record<string, number> = {
    '1 fs': 1e-15, '10 fs': 1e-14, '100 fs': 1e-13,
    '1 ps': 1e-12, '10 ps': 1e-11, '100 ps': 1e-10,
    '1 ns': 1e-9, '10 ns': 1e-8, '100 ns': 1e-7,
    '1 us': 1e-6, '10 us': 1e-5, '100 us': 1e-4,
    '1 ms': 1e-3, '1 s': 1
  };
  const baseMult = timeMultipliers[baseTimeUnit] || 1e-9;
  const dispMult = timeMultipliers[displayTimeUnit] || 1e-9;
  const factor = baseMult / dispMult;

  // Draw Ruler Ticks and Grid
  for (let t = firstTick; (t * scaleX + offsetX) < width; t += stepTime) {
    if (t < 0) continue;
    const x = t * scaleX + offsetX;
    
    ctx.beginPath();
    ctx.moveTo(x, RULER_HEIGHT - 5);
    ctx.lineTo(x, RULER_HEIGHT);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x, RULER_HEIGHT);
    ctx.lineTo(x, height);
    ctx.stroke();
    
    const displayTime = Math.round(t * factor * 100) / 100;
    ctx.textAlign = (x < 15) ? 'left' : 'center';
    ctx.fillText(displayTime.toString(), x + (x < 15 ? 2 : 0), RULER_HEIGHT - 10);
  }

  // Clip the canvas so signals do not draw over the ruler
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, RULER_HEIGHT, width, height - RULER_HEIGHT);
  ctx.clip();

  // Draw Signals
  let yPos = RULER_HEIGHT + offsetY;
  visibleNodes.forEach((item) => {
    // Optimization: Skip drawing if completely out of bounds
    if (yPos > height || yPos + rowHeight < RULER_HEIGHT) {
      yPos += rowHeight;
      return;
    }

    const node = item.node;
    if (selectedNodeIds.includes(node.id)) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, yPos, width, rowHeight);
    }
    
    if (node.type === 'signal' && node.full_name && signalData[node.full_name]) {
      const transitions = signalData[node.full_name];
      if (transitions.length > 0) {
        const isSingleBit = (node.bitwidth === 1);
        const color = signalColors[node.id] || '#00ff00';
        const radix = radixState[node.id] || 'hex';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        
        const drawHeight = rowHeight - 8;
        const midY = yPos + rowHeight / 2;
        const topY = midY - drawHeight / 2;
        const botY = midY + drawHeight / 2;
        
        ctx.beginPath();
        for (let i = 0; i < transitions.length; i++) {
          const t = transitions[i];
          const nextT = i < transitions.length - 1 ? transitions[i+1] : { time: maxTime };
          
          const startX = Math.max(0, t.time * scaleX + offsetX);
          const endX = Math.min(width, nextT.time * scaleX + offsetX);
          
          if (endX < 0 || startX > width) continue; 
          
          const valStr = String(t.value).toLowerCase();
          const isAllX = /^[xXuUwWhHlL\-]+$/.test(valStr);
          const isAllZ = /^[zZ]+$/.test(valStr);
          const hasX = /[^01]/.test(valStr);
          
          if (isAllX) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(startX, topY, endX - startX, drawHeight);
            ctx.strokeStyle = '#ff0000';
            ctx.strokeRect(startX, topY, endX - startX, drawHeight);
          } else if (isAllZ) {
            ctx.strokeStyle = '#ffff00';
            ctx.beginPath();
            ctx.moveTo(startX, midY);
            ctx.lineTo(endX, midY);
            ctx.stroke();
          } else {
            if (hasX && !isSingleBit) {
              ctx.strokeStyle = '#ffff00';
            } else {
              ctx.strokeStyle = color;
            }

            if (isSingleBit) {
              const y = t.value == '1' ? topY : botY;
              if (i > 0 && startX > 0 && !isAllX && !isAllZ) {
                const prevVal = String(transitions[i-1].value).toLowerCase();
                if (!/^[xz]+$/.test(prevVal)) {
                  ctx.lineTo(startX, y);
                } else {
                  ctx.moveTo(startX, y);
                }
              } else {
                ctx.moveTo(startX, y);
              }
              ctx.lineTo(endX, y);
            } else {
              ctx.beginPath();
              ctx.moveTo(startX, topY);
              ctx.lineTo(endX, topY);
              ctx.moveTo(startX, botY);
              ctx.lineTo(endX, botY);
              ctx.stroke();
              
              if (i > 0 && startX > 0) {
                ctx.beginPath();
                ctx.moveTo(startX, botY);
                ctx.lineTo(startX + 2, midY);
                ctx.lineTo(startX, topY);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(startX, botY);
                ctx.lineTo(startX - 2, midY);
                ctx.lineTo(startX, topY);
                ctx.stroke();
              }
              
              if (endX - startX > 20) {
                const formatted = formatValue(t.value, node.bitwidth || 1, radix);
                ctx.fillStyle = '#ffffff';
                ctx.font = '11px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const textWidth = ctx.measureText(formatted).width;
                if (endX - startX > textWidth + 10) {
                  ctx.fillText(formatted, startX + (endX - startX)/2, midY);
                } else {
                  ctx.fillText('..', startX + (endX - startX)/2, midY);
                }
              }
            }
          }
        }
        if (isSingleBit) ctx.stroke();
      }
    }
    yPos += rowHeight;
  });

  ctx.restore(); // Restore clip region so markers draw normally

  // Draw frozen markers
  savedMarkers.forEach(m => {
    const mx = m.time * scaleX + offsetX;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx, RULER_HEIGHT);
    ctx.lineTo(mx, height);
    ctx.stroke();
    ctx.fillStyle = '#ffff00';
    ctx.fillText(m.name, mx, RULER_HEIGHT - 5);
  });

  // Draw active cursor marker
  if (activeMarker !== null) {
    const mx = activeMarker * scaleX + offsetX;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx, RULER_HEIGHT);
    ctx.lineTo(mx, height);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`A`, mx, RULER_HEIGHT - 5);
  }
}
