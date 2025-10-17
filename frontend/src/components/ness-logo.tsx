/**
 * ness. Logo Component
 * Wordmark with branded dot in #00ADE8
 */

interface NessLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function NessLogo({ size = 'md', className = '' }: NessLogoProps) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={`font-['Montserrat'] font-medium ${sizes[size]} ${className}`}>
      <span className="text-foreground">ness</span>
      <span className="text-[#00ADE8]">.</span>
    </div>
  );
}

export function NessLogoWithTagline({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <NessLogo size="lg" />
      <p className="text-sm text-muted-foreground mt-1 font-['Montserrat']">
        Vulnerability Lifecycle Manager
      </p>
    </div>
  );
}

export function NSolveLogo({ size = 'md', className = '' }: NessLogoProps) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={`font-['Montserrat'] font-medium ${sizes[size]} ${className}`}>
      <span className="text-foreground">n</span>
      <span className="text-[#00ADE8]">.</span>
      <span className="text-foreground">Solve</span>
    </div>
  );
}

