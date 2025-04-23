"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
}

export const Button = ({
  className = "",
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={`px-4 py-2 rounded-md font-medium text-white ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}; 