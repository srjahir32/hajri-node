export function PageLoader({ label }: { label?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fff' }}>
      <div className="text-center">
        <div className="spinner-border text-primary" role="status" />
        {label ? <div className="mt-3 proxima_nova_semibold" style={{ color: '#808080' }}>{label}</div> : null}
      </div>
    </div>
  );
}
