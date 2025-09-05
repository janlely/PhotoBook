
import React, { useCallback } from 'react';

interface ToggleOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface ToggleSelectorProps<T = string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'outline' | 'filled' | 'minimal';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'gray';
  disabled?: boolean;
  fullWidth?: boolean;
  wrap?: boolean;
  spacing?: 'tight' | 'normal' | 'loose';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const ToggleSelector = <T,>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
  variant = 'default',
  color = 'primary',
  disabled = false,
  fullWidth = false,
  wrap = false,
  spacing = 'normal',
  rounded = 'md'
}: ToggleSelectorProps<T>) => {
  const handleKeyDown = useCallback((event: React.KeyboardEvent, optionValue: T) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onChange(optionValue);
    }
  }, [onChange]);

  // Size classes
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
    xl: 'px-6 py-3 text-lg'
  };

  // Spacing classes
  const spacingClasses = {
    tight: 'gap-0.5',
    normal: 'gap-0',
    loose: 'gap-1'
  };

  // Rounded classes
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  // Color themes
  const colorThemes = {
    primary: {
      active: 'bg-blue-500 text-white border-blue-500',
      inactive: 'bg-white text-gray-700 hover:bg-gray-50',
      disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed'
    },
    secondary: {
      active: 'bg-gray-500 text-white border-gray-500',
      inactive: 'bg-white text-gray-700 hover:bg-gray-50',
      disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed'
    },
    success: {
      active: 'bg-green-500 text-white border-green-500',
      inactive: 'bg-white text-gray-700 hover:bg-gray-50',
      disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed'
    },
    warning: {
      active: 'bg-yellow-500 text-white border-yellow-500',
      inactive: 'bg-white text-gray-700 hover:bg-gray-50',
      disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed'
    },
    danger: {
      active: 'bg-red-500 text-white border-red-500',
      inactive: 'bg-white text-gray-700 hover:bg-gray-50',
      disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed'
    },
    gray: {
      active: 'bg-gray-500 text-white border-gray-500',
      inactive: 'bg-white text-gray-700 hover:bg-gray-50',
      disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed'
    }
  };

  // Variant classes
  const variantClasses = {
    default: {
      container: `border border-gray-300 ${roundedClasses[rounded]} overflow-hidden`,
      separator: 'border-r border-gray-300'
    },
    outline: {
      container: `border border-gray-300 ${roundedClasses[rounded]} overflow-hidden`,
      separator: 'border-r border-gray-300'
    },
    filled: {
      container: `border border-gray-300 ${roundedClasses[rounded]} overflow-hidden`,
      separator: 'border-r border-gray-300'
    },
    minimal: {
      container: `${roundedClasses[rounded]} overflow-hidden`,
      separator: 'border-r border-gray-200'
    }
  };

  const layoutClasses = wrap
    ? 'flex flex-wrap'
    : fullWidth
      ? 'flex w-full'
      : 'flex';

  return (
    <div className={`${layoutClasses} ${variantClasses[variant].container} ${spacingClasses[spacing]} ${className}`}>
      {options.map((option, index) => {
        const isActive = value === option.value;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={String(option.value)}
            onClick={() => !isDisabled && onChange(option.value)}
            onKeyDown={(e) => !isDisabled && handleKeyDown(e, option.value)}
            disabled={isDisabled}
            className={`
              ${sizeClasses[size]} transition-all duration-200 font-medium
              ${index < options.length - 1 ? variantClasses[variant].separator : ''}
              ${isDisabled
                ? colorThemes[color].disabled
                : isActive
                  ? colorThemes[color].active
                  : colorThemes[color].inactive
              }
              focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50
              flex items-center justify-center gap-1
              ${fullWidth ? 'flex-1' : ''}
              ${wrap ? 'flex-shrink-0' : ''}
            `}
            aria-pressed={isActive}
            role="button"
            tabIndex={isDisabled ? -1 : 0}
          >
            {option.icon && (
              <span className="flex-shrink-0">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ToggleSelector;