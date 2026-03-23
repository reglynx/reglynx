'use client';

interface ComplianceScoreProps {
  score: number;
  totalRequired?: number;
  totalCurrent?: number;
}

export function ComplianceScore({
  score,
  totalRequired = 0,
  totalCurrent = 0,
}: ComplianceScoreProps) {
  const radius = 80;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const getColor = (s: number) => {
    if (s >= 80) return { stroke: '#10b981', text: 'text-emerald-600' };
    if (s >= 50) return { stroke: '#f59e0b', text: 'text-amber-600' };
    return { stroke: '#ef4444', text: 'text-red-600' };
  };

  const color = getColor(score);
  const missing = totalRequired - totalCurrent;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg
          width={200}
          height={200}
          viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`}
          className="-rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Score number in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-5xl font-bold ${color.text}`}>{score}</span>
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
        {totalRequired > 0 && (
          <p className="text-xs text-muted-foreground">
            {totalCurrent} of {totalRequired} required documents generated
            {missing > 0 && (
              <span className="text-amber-600 ml-1">· {missing} missing</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
