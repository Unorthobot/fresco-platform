'use client';

interface Stock { name: string; value: string; description: string; }
interface Flow { name: string; rate: string; from: string; to: string; }

interface StockFlowProps {
  stocks: Stock[];
  inflows: Flow[];
  outflows: Flow[];
  keyConstraint: string;
}

export function StockFlowDiagram({ stocks, inflows, outflows, keyConstraint }: StockFlowProps) {
  if (!stocks?.length) return null;

  return (
    <div>
      {/* Visual */}
      <div className="space-y-3 mb-4">
        {/* Inflows */}
        {inflows?.length > 0 && (
          <div>
            <p className="text-[10px] text-fresco-graphite-light uppercase tracking-wide mb-1.5">Inflows</p>
            <div className="flex flex-wrap gap-1.5">
              {inflows.map((f, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="px-2.5 py-1 border border-fresco-border text-fresco-xs text-fresco-graphite-mid bg-white">
                    <span className="font-medium text-fresco-black">{f.name}</span>
                    {f.rate && <span className="text-fresco-graphite-light"> · {f.rate}</span>}
                  </div>
                  <svg width="16" height="10" viewBox="0 0 16 10">
                    <path d="M0 5 L10 5 M7 2 L10 5 L7 8" stroke="#888" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stocks */}
        <div>
          <p className="text-[10px] text-fresco-graphite-light uppercase tracking-wide mb-1.5">Stocks</p>
          <div className="flex flex-wrap gap-2">
            {stocks.map((s, i) => (
              <div key={i} className="border-2 border-fresco-black px-4 py-3 bg-fresco-light-gray min-w-[120px]">
                <p className="text-fresco-xs font-medium text-fresco-black">{s.name}</p>
                {s.value && <p className="text-fresco-xs text-fresco-graphite-light mt-0.5">{s.value}</p>}
                {s.description && <p className="text-[9px] text-fresco-graphite-light mt-0.5 italic">{s.description}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Outflows */}
        {outflows?.length > 0 && (
          <div>
            <p className="text-[10px] text-fresco-graphite-light uppercase tracking-wide mb-1.5">Outflows</p>
            <div className="flex flex-wrap gap-1.5">
              {outflows.map((f, i) => (
                <div key={i} className="flex items-center gap-1">
                  <svg width="16" height="10" viewBox="0 0 16 10">
                    <path d="M0 5 L10 5 M7 2 L10 5 L7 8" stroke="#888" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                  <div className="px-2.5 py-1 border border-fresco-border text-fresco-xs text-fresco-graphite-mid bg-white">
                    <span className="font-medium text-fresco-black">{f.name}</span>
                    {f.rate && <span className="text-fresco-graphite-light"> · {f.rate}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key constraint */}
      {keyConstraint && (
        <div className="p-3 bg-fresco-light-gray border-l-2 border-fresco-black">
          <p className="text-[10px] font-medium uppercase tracking-wide text-fresco-graphite-light mb-0.5">Key constraint</p>
          <p className="text-fresco-xs text-fresco-graphite-soft">{keyConstraint}</p>
        </div>
      )}
    </div>
  );
}
