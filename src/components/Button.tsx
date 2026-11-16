import type { ButtonHTMLAttributes } from "react";
import "./Button.css";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  fullWidth,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const cls = [
    "btn",
    `btn-${variant}`,
    fullWidth ? "btn-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={cls} {...rest} />;
}
