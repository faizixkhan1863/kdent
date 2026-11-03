import type { ReactNode } from "react";

type EyebrowProps = {
  children: ReactNode;
  center?: boolean;
  dark?: boolean;
  className?: string;
};

export default function Eyebrow({ children, center, dark, className = "" }: EyebrowProps) {
  return (
    <span className={`eyebrow ${dark ? "eyebrow-dark" : ""} ${center ? "eyebrow-center" : ""} ${className}`}>
      {children}
    </span>
  );
}
