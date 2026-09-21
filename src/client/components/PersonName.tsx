import { personColor } from "../../shared/colors";
import type { Person } from "../../shared/types";

export function PersonName(props: { person: Person | undefined; fallback?: string }) {
  const color = () => (props.person ? personColor(props.person) : undefined);

  return (
    <span class="tc-pname" style={color() ? { color: color() } : undefined}>
      {props.person?.name ?? props.fallback ?? "?"}
    </span>
  );
}
