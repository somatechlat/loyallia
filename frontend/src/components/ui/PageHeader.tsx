import React from 'react';

/**
 * Props for the PageHeader component.
 */
interface PageHeaderProps {
  /** Main title of the page */
  title: React.ReactNode;
  /** Optional subtitle displayed below the title */
  subtitle?: React.ReactNode;
  /** Optional action elements displayed on the right side */
  actions?: React.ReactNode;
}

/**
 * @description Renders a reusable page header with title, subtitle, and action buttons.
 * @param {PageHeaderProps} props - Component props
 * @returns JSX.Element
 */
export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="page-header flex justify-between items-center">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-sm text-surface-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
