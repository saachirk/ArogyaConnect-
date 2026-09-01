interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  accent?: string;
  iconBg?: string;
  onClick?: () => void;
}

export default function StatCard({ icon, value, label, accent = 'var(--brand-teal)', iconBg, onClick }: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{ '--stat-accent': accent, '--stat-icon-bg': iconBg ?? undefined, cursor: onClick ? 'pointer' : 'default' } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
