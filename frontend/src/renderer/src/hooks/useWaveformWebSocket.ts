import { useCallback, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { TreeNode, WebSocketMessage } from '../types/waveform';

interface WebSocketProps {
  port: string;
  setTreeData: (data: TreeNode[]) => void;
  setBaseTimeUnit: (unit: string) => void;
  setDisplayTimeUnit: (unit: string) => void;
  setSignalData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  visibleNodes: { node: TreeNode, depth: number }[];
  offsetY: number;
  canvasHeight: number;
  rowHeight: number;
  requestedSignalsRef: React.MutableRefObject<Set<string>>;
}

/**
 * Encapsulates the WebSocket connection logic and the debounced lazy-loading
 * transition requester.
 */
export function useWaveformWebSocket({
  port,
  setTreeData,
  setBaseTimeUnit,
  setDisplayTimeUnit,
  setSignalData,
  visibleNodes,
  offsetY,
  canvasHeight,
  rowHeight,
  requestedSignalsRef
}: WebSocketProps) {
  
  const socketUrl = port ? `ws://127.0.0.1:${port}/ws` : null;

  const { sendMessage } = useWebSocket(socketUrl, {
    shouldReconnect: useCallback(() => true, []),
    onOpen: useCallback((e: WebSocketEventMap['open']) => {
      console.log('WebSocket connected. Requesting all signals...');
      // We can use the raw websocket instance to send if sendMessage isn't stable inside onOpen
      (e.target as WebSocket).send(JSON.stringify({ type: 'get_all_signals' }));
    }, []),
    onMessage: useCallback((e: WebSocketEventMap['message']) => {
      const msg: WebSocketMessage = JSON.parse((e as MessageEvent).data);
      
      if (msg.type === 'all_signals') {
        setTreeData(msg.data as TreeNode[]);
        
        if (msg.time_unit) {
          setBaseTimeUnit(msg.time_unit);
          setDisplayTimeUnit(msg.time_unit);
        }
      } else if (msg.type === 'transitions') {
        if (msg.signal_path && msg.data) {
          setSignalData(prev => ({
            ...prev,
            [msg.signal_path as string]: msg.data as any[]
          }));
        }
      }
    }, [setTreeData, setBaseTimeUnit, setDisplayTimeUnit, setSignalData])
  });

  // LAZY LOADING: We only request transitions for signals that are currently visible
  useEffect(() => {
    if (visibleNodes.length === 0) return;
    
    // Calculate which elements are currently visible via the scroll offsetY
    const startIndex = Math.max(0, Math.floor(-offsetY / rowHeight));
    const visibleCount = Math.ceil(canvasHeight / rowHeight) + 1;
    const endIndex = Math.min(visibleNodes.length, startIndex + visibleCount);
    
    const visibleSignals = visibleNodes.slice(startIndex, endIndex);
    
    // Debounce the fetch by 150ms so rapid scrolling doesn't spam the backend
    const timeoutId = setTimeout(() => {
      visibleSignals.forEach(item => {
         const node = item.node;
         // Only request if it's a signal we haven't asked for yet
         if (node.type === 'signal' && node.full_name && !requestedSignalsRef.current.has(node.full_name)) {
            requestedSignalsRef.current.add(node.full_name);
            sendMessage(JSON.stringify({
              type: 'get_transitions',
              signal_path: node.full_name,
              time_start: 0,
              time_end: 1000000000 // In the future, we could window this time request too!
            }));
         }
      });
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [visibleNodes, offsetY, canvasHeight, rowHeight, sendMessage, requestedSignalsRef]);

  return { sendMessage };
}
