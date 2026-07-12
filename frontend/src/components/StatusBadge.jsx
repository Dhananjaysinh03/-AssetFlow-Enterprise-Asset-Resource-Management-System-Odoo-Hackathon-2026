// Renders any lifecycle/booking status as a consistent color-coded pill.
// This one component is reused on Dashboard, Directory, Allocations, and
// Bookings so a given status always looks identical everywhere — that
// consistency is the design system's signature element.

export default function StatusBadge({ status }) {
  if (!status) return null;
  const className = `status-pill status-${status.toLowerCase()}`;
  const label = status.replace(/_/g, ' ');
  return <span className={className}>{label}</span>;
}
