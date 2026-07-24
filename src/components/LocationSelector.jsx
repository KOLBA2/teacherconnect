import { LOCATION_ONLINE, CITIES } from '../utils/premium';

// Reusable location dropdown: "💻 Online" pinned on top, then Georgian cities.
// `allowAll` adds an "all locations" option (for the search filter).
export default function LocationSelector({ value, onChange, allowAll = false, className = 'tc-input' }) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowAll && <option value="">ყველა ლოკაცია</option>}
      <option value={LOCATION_ONLINE.key}>{LOCATION_ONLINE.label}</option>
      <optgroup label="ქალაქები">
        {CITIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
