import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import styles from "./navigation.module.css";

export type NavIcon =
  | "grid"
  | "paper"
  | "clock"
  | "person"
  | "shield"
  | "bank"
  | "upload"
  | "activity"
  | "chart"
  | "log"
  | "back";
export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  emphasis?: boolean;
  icon?: NavIcon;
}

const paths: Record<NavIcon, string> = {
  grid: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z",
  paper: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5",
  clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6",
  bank: "M4 5h16v16H4zM8 3v4M16 3v4M8 11h8M8 15h8",
  upload: "M12 16V3M7 8l5-5 5 5M4 14v7h16v-7",
  activity: "M2 12h5l3-8 4 16 3-8h5",
  chart: "M4 3v18h17M8 17v-5M13 17V7M18 17V4",
  log: "M5 3h14v18H5zM9 7h6M9 12h6M9 17h6",
  back: "M20 12H4M10 6l-6 6 6 6",
};

export function Navigation({
  items,
  label = "Chính",
  variant = "header",
}: {
  items: readonly NavItem[];
  label?: string;
  variant?: "header" | "rail";
}) {
  const location = useLocation();
  return <NavigationMenu key={location.key} items={items} label={label} variant={variant} />;
}

function NavigationMenu({
  items,
  label,
  variant,
}: {
  items: readonly NavItem[];
  label: string;
  variant: "header" | "rail";
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`${styles.toggle} ${variant === "rail" ? styles.railToggle : styles.headerToggle}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={open ? "M6 6l12 12M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
        {open ? "Đóng menu" : "Menu"}
      </button>
      <nav
        id={id}
        className={`${styles.nav} ${variant === "rail" ? styles.rail : styles.header} ${open ? styles.open : ""}`}
        aria-label={label}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={`${styles.link} ${item.emphasis ? styles.emphasis : ""}`}
            onClick={() => setOpen(false)}
          >
            {variant === "rail" && item.icon ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={paths[item.icon]} />
              </svg>
            ) : null}
            <span>{item.label}</span>
            {item.emphasis ? <span aria-hidden="true">↗</span> : null}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
