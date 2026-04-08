'use client';

interface CLDNode { id: string; label: string; }
interface CLDEdge { from: string; to: string; polarity: '+' | '-'; label?: string; }

interface CausalLoopProps {
  nodes: CLDNode[];
  edges: CLDEdge[];
  dominantLoop: string;
  loopType: 'reinforcing' | 'balancing' | 'both';
}

const LOOP_TYPE_LABELS = {
  reinforcing: 'R · Reinforcing loop — compounds over time',
  balancing:   'B · Balancing loop — seeks equilibrium',
  both:        'R + B · Mixed loops detected',
};

export function CausalLoopDiagram({ nodes, edges, dominantLoop, loopType }: CausalLoopProps) {
  if (!nodes?.length || !edges?.length) return null;

  // Layout nodes in a circle
  const W = 320, H = 240, cx = W / 2, cy = H / 2;
  const r = Math.min(cx, cy) - 48;
  const n = nodes.length;

  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    positions[node.id] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  // Draw curved arrow between two nodes
  function arrowPath(fromId: string, toId: string): string {
    const from = positions[fromId];
    const to = positions[toId];
    if (!from || !to) return '';
    // Offset endpoints toward center to avoid overlapping nodes
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nodeR = 22;
    const sx = from.x + (dx / dist) * nodeR;
    const sy = from.y + (dy / dist) * nodeR;
    const ex = to.x - (dx / dist) * nodeR;
    const ey = to.y - (dy / dist) * nodeR;
    // Slight curve via control point offset
    const midX = (sx + ex) / 2 - dy * 0.15;
    const midY = (sy + ey) / 2 + dx * 0.15;
    return `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  }

  // Arrowhead marker
  const markerId = 'cld-arrow';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
        <defs>
          <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#888" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const path = arrowPath(edge.from, edge.to);
          if (!path) return null;
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;
          // Polarity label position — midpoint of the curve
          const midX = (from.x + to.x) / 2 - (to.y - from.y) * 0.15;
          const midY = (from.y + to.y) / 2 + (to.x - from.x) * 0.15;
          return (
            <g key={i}>
              <path d={path} fill="none"
                stroke={edge.polarity === '+' ? '#000000' : '#888888'}
                strokeWidth={edge.polarity === '+' ? '1.5' : '1.5'}
                strokeOpacity={edge.polarity === '+' ? '0.7' : '0.45'}
                strokeDasharray={edge.polarity === '-' ? '4 2' : 'none'}
                markerEnd={`url(#${markerId})`}
              />
              <text x={midX} y={midY} textAnchor="middle" dominantBaseline="middle"
                fontSize="10" fontWeight="600"
                fill={edge.polarity === '+' ? '#000000' : '#888888'}
                opacity={edge.polarity === '+' ? '0.8' : '0.5'}>
                {edge.polarity}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const pos = positions[node.id];
          if (!pos) return null;
          const words = node.label.split(' ');
          return (
            <g key={node.id}>
              <circle cx={pos.x} cy={pos.y} r="22"
                fill="white" stroke="#000000" strokeWidth="1.5" />
              {words.slice(0, 2).map((word, wi) => (
                <text key={wi} x={pos.x} y={pos.y + (wi - (Math.min(words.length, 2) - 1) / 2) * 10}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="8" fontFamily="Inter, sans-serif"
                  fill="#000000" fontWeight="500">
                  {word.length > 8 ? word.slice(0, 7) + '…' : word}
                </text>
              ))}
            </g>
          );
        })}
      </svg>

      {/* Loop type + legend */}
      <div className="flex items-center gap-3 mt-2 mb-3">
        <span className="text-[10px] text-fresco-graphite-light">{LOOP_TYPE_LABELS[loopType]}</span>
        <div className="flex items-center gap-1.5 text-[9px] text-fresco-graphite-light">
          <span className="font-bold">+</span><span>reinforcing</span>
          <span className="mx-1 opacity-30">·</span>
          <span className="font-bold opacity-50">−</span><span>balancing</span>
        </div>
      </div>

      {/* Dominant loop description */}
      {dominantLoop && (
        <div className="p-3 bg-fresco-light-gray border-l-2 border-fresco-black">
          <p className="text-[10px] font-medium uppercase tracking-wide text-fresco-graphite-light mb-0.5">Dominant loop</p>
          <p className="text-fresco-xs text-fresco-graphite-soft">{dominantLoop}</p>
        </div>
      )}
    </div>
  );
}
