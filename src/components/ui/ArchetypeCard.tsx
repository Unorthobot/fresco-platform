'use client';

// System Archetype recognition card.
// Identifies which recurring system pattern applies to the situation.

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  'Fixes that Fail':        'A short-term fix relieves symptoms but creates side effects that make the original problem worse over time.',
  'Shifting the Burden':    'A symptomatic solution diverts attention from the fundamental fix, which atrophies from disuse.',
  'Limits to Growth':       'A reinforcing growth loop is being slowed or stopped by a balancing constraint.',
  'Eroding Goals':          'When there is a gap between goal and performance, the goal gets lowered instead of performance raised.',
  'Escalation':             'Two actors each respond to the other\'s actions by increasing their own, creating an arms race.',
  'Success to the Successful': 'Two activities compete for a shared resource; whichever gets more resources wins more, widening the gap.',
  'Tragedy of the Commons': 'Multiple actors share a resource and each benefits from using more of it — depleting it for everyone.',
  'Accidental Adversaries': 'Two parties in a mutually beneficial relationship take actions that inadvertently undermine each other.',
};

const ARCHETYPE_ESCAPE: Record<string, string> = {
  'Fixes that Fail':        'Address the fundamental problem. Reduce reliance on the symptomatic fix.',
  'Shifting the Burden':    'Invest in the fundamental solution, even if it takes longer.',
  'Limits to Growth':       'Remove or weaken the constraint, or scale back the growth ambition.',
  'Eroding Goals':          'Hold the goal firm. Focus effort on closing the performance gap.',
  'Escalation':             'One side must unilaterally reduce. Negotiated settlements rarely hold.',
  'Success to the Successful': 'Deliberately allocate resources to the losing activity, or separate the two.',
  'Tragedy of the Commons': 'Regulate access to the shared resource, or privatise it.',
  'Accidental Adversaries': 'Expose the dynamic explicitly. Redesign incentives so both parties benefit from the other\'s success.',
};

interface ArchetypeCardProps {
  name: string;
  description: string;
  loop: string;
  escape: string;
}

export function ArchetypeCard({ name, description, loop, escape }: ArchetypeCardProps) {
  const canonicalDescription = ARCHETYPE_DESCRIPTIONS[name] || description;
  const canonicalEscape = ARCHETYPE_ESCAPE[name] || escape;

  return (
    <div className="border border-fresco-border overflow-hidden">
      {/* Header */}
      <div className="bg-fresco-black px-4 py-3">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">
            System archetype detected
          </span>
        </div>
        <p className="text-fresco-base font-medium text-white">{name}</p>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 bg-fresco-white">
        {/* What this archetype is */}
        <div>
          <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">What this pattern means</p>
          <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed">{canonicalDescription}</p>
        </div>

        {/* How it manifests in this situation */}
        <div>
          <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">How it shows up here</p>
          <div className="p-3 bg-fresco-light-gray border-l-2 border-fresco-graphite-light">
            <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed">{loop}</p>
          </div>
        </div>

        {/* How to escape */}
        <div>
          <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">How to break out</p>
          <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed">{canonicalEscape}</p>
        </div>
      </div>
    </div>
  );
}
