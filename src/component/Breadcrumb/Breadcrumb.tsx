"use client";
import Link from "next/link";
import type { ReactNode } from "react";

interface BreadcrumbItem { label: string; href?: string; icon?: ReactNode }
export default function Breadcrumbkhabar({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="research-breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.href || item.label}-${index}`} className="research-breadcrumb-item">
          {item.href ? <Link href={item.href}>{item.icon}<span>{item.label}</span></Link> : <span>{item.icon}<span>{item.label}</span></span>}
          {index < items.length - 1 ? <i>/</i> : null}
        </span>
      ))}
    </nav>
  );
}
