import type { ReactNode } from "react";
import "./Card.css";

interface CardProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Card({ children, className, id }: CardProps) {
  return (
    <div id={id} className={`card${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
