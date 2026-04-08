'use client';

interface IPOItem { label: string; note: string; }

interface IPOMapProps {
  inputs: IPOItem[];
  processes: IPOItem[];
  outputs: IPOItem[];
  bottleneck?: string;
}

export function IPOMap({ inputs, processes, outputs, bottleneck }: IPOMapProps) {
  if (!inputs?.length && !processes?.length && !outputs?.length) return null;

  const columns = [
    { label: 'Input', items: inputs || [], color: 'border-fresco-border' },
    { label: 'Process', items: processes || [], color: 'border-fresco-black' },
    { label: 'Output', items: outputs || [], color: 'border-fresco-border' },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-0 border border-fresco-border overflow-hidden">
        {columns.map((col, ci) => (
          <div key={ci} className={`${ci < 2 ? 'border-r border-fresco-border' : ''}`}>
            {/* Column header */}
            <div className={`px-3 py-2 border-b ${col.color} bg-fresco-light-gray`}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-mid">
                {col.label}
              </p>
            </div>
            {/* Items */}
            <div className="p-2 space-y-1.5 min-h-[80px]">
              {col.items.map((item, i) => (
                <div key={i} className={`px-2.5 py-2 bg-white border ${
                  ci === 1 ? 'border-fresco-black/20' : 'border-fresco-border-light'
                }`}>
                  <p className="text-fresco-xs font-medium text-fresco-black leading-snug">{item.label}</p>
                  {item.note && (
                    <p className="text-[10px] text-fresco-graphite-light mt-0.5 leading-tight">{item.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Flow arrows */}
      <div className="flex items-center px-1 mt-1 mb-2">
        <div className="flex-1 h-px bg-fresco-border" />
        <div className="flex items-center gap-1 px-2">
          <div className="w-12 h-px bg-fresco-graphite-light" />
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M0,0 L8,4 L0,8 Z" fill="#888" />
          </svg>
        </div>
        <div className="flex-1 h-px bg-fresco-border" />
        <div className="flex items-center gap-1 px-2">
          <div className="w-12 h-px bg-fresco-graphite-light" />
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M0,0 L8,4 L0,8 Z" fill="#888" />
          </svg>
        </div>
        <div className="flex-1 h-px bg-fresco-border" />
      </div>

      {/* Bottleneck */}
      {bottleneck && (
        <div className="p-3 bg-fresco-light-gray border-l-2 border-fresco-black">
          <p className="text-[10px] font-medium uppercase tracking-wide text-fresco-graphite-light mb-0.5">
            Bottleneck
          </p>
          <p className="text-fresco-xs text-fresco-graphite-soft">{bottleneck}</p>
        </div>
      )}
    </div>
  );
}
