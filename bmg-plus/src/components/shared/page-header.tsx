interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode // actions slot (buttons, etc.)
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-headline-sm text-on-surface">{title}</h1>
        {subtitle && (
          <p className="text-body-md text-on-surface-variant mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}
