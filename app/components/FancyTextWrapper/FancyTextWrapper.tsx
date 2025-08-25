import React from "react";

export default function FancyTextWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fancy-text-wrapper">{children}</div>;
}
