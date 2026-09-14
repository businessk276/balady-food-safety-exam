export function CircularLoader({ label }: { label?: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><span className="circular-loader" aria-hidden="true" />{label && <span>{label}</span>}</div>;
}
