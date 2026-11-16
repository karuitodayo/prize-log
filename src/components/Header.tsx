import "./Header.css";

interface HeaderProps {
  subtitle?: string;
}

export function Header({ subtitle }: HeaderProps) {
  return (
    <header className="app-header">
      <span className="app-header-title">
        PRIZE <span className="text-accent">LOG</span>
      </span>
      {subtitle && <span className="app-header-subtitle">{subtitle}</span>}
    </header>
  );
}
