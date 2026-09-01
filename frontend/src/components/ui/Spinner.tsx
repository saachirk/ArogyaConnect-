export default function Spinner({ size = 'md', center = false }: { size?: 'sm' | 'md' | 'lg'; center?: boolean }) {
  const cls = `spinner${size === 'lg' ? ' spinner-lg' : ''}${size === 'sm' ? ' spinner-sm' : ''}`;
  if (center) return <div className="spinner-center"><span className={cls} /></div>;
  return <span className={cls} />;
}
