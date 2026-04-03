export default function SwissFlag({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="4" fill="#FF0000" />
      <rect x="13" y="6" width="6" height="20" rx="1" fill="white" />
      <rect x="6" y="13" width="20" height="6" rx="1" fill="white" />
    </svg>
  );
}
