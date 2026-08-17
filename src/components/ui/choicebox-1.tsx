"use client";

import React, { useRef } from "react";
import clsx from "clsx";

interface ChoiceboxGroupProps {
  direction: "row" | "column";
  label?: string;
  showLabel?: boolean;
  onChange:
    | React.Dispatch<React.SetStateAction<string>>
    | React.Dispatch<React.SetStateAction<string[]>>;
  type: "radio" | "checkbox";
  value: string | string[];
  children: React.ReactNode;
  disabled?: boolean;
  /** When false, items ignore tap-to-select (long-press can still activate). */
  selectionActive?: boolean;
}

export const ChoiceboxGroup = ({
  direction,
  label,
  showLabel,
  onChange,
  type,
  value,
  children,
  disabled,
  selectionActive = true,
}: ChoiceboxGroupProps) => {
  return (
    <div className="flex flex-col gap-2">
      {showLabel && label && (
        <label className="font-sans text-[13px] text-ds-gray-1000">{label}</label>
      )}
      <div
        className={clsx(
          "flex gap-3",
          direction === "row" ? "flex-row flex-wrap" : "flex-col"
        )}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          const props = {
            onChange,
            type,
            valueSelected: value,
            selectionActive,
            ...(disabled ? { disabled: true } : {}),
          };
          return React.cloneElement(
            child as React.ReactElement<Record<string, unknown>>,
            props
          );
        })}
      </div>
    </div>
  );
};

const getChoiceboxGroupClasses = (
  isSelected: boolean,
  type: "radio" | "checkbox"
) => {
  let className = "relative border w-4 h-4 duration-200";
  if (type === "radio") {
    className +=
      " rounded-[50%] after:w-2 after:h-2 after:rounded-[50%] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 bg-ds-background-100";
    if (isSelected) {
      className += " border-ds-blue-900 after:bg-ds-blue-900 after:scale-100";
    } else {
      className += " border-ds-gray-500 after:bg-ds-gray-500 after:scale-0";
    }
  } else {
    className += " rounded inline-flex items-center justify-center";
    if (isSelected) {
      className += " bg-ds-blue-900 border-ds-blue-900";
    } else {
      className += " bg-ds-background-100 border-ds-gray-500";
    }
  }

  return className;
};

interface ChoiceboxItemProps {
  title: string;
  description: string;
  value: string;
  type?: "radio" | "checkbox";
  valueSelected?: string | string[];
  onChange?: (value: string | string[]) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  /** Always-visible footer (e.g. action buttons). Clicks do not toggle selection. */
  actions?: React.ReactNode;
  selectionActive?: boolean;
  /** Hold ~450ms to activate multi-select (parent should turn selectionActive on). */
  onLongPress?: () => void;
}

function ChoiceboxItem({
  title,
  description,
  value,
  type = "radio",
  valueSelected,
  onChange,
  disabled,
  children,
  actions,
  selectionActive = true,
  onLongPress,
}: ChoiceboxItemProps) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const isSelected = !!(
    typeof valueSelected === "string"
      ? value === valueSelected
      : valueSelected?.includes(value)
  );

  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const toggleSelect = () => {
    if (!onChange || disabled || !selectionActive) return;
    if (typeof valueSelected === "string") {
      onChange(value);
    } else if (valueSelected) {
      if (isSelected) {
        onChange(valueSelected.filter((item) => item !== value));
      } else {
        onChange([...valueSelected, value]);
      }
    } else {
      onChange([value]);
    }
  };

  const onClick = () => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    toggleSelect();
  };

  return (
    <div
      className={clsx(
        "border w-full rounded-2xl duration-150 shadow-sm overflow-hidden select-none",
        isSelected && selectionActive ? "border-ds-blue-600" : "border-ds-gray-400",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        isSelected && selectionActive ? "bg-ds-blue-100" : "bg-ds-background-100"
      )}
      onClick={onClick}
      onContextMenu={(e) => {
        if (onLongPress) e.preventDefault();
      }}
      onPointerDown={() => {
        if (disabled || !onLongPress) return;
        didLongPress.current = false;
        clearPress();
        pressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          onLongPress();
        }, 450);
      }}
      onPointerUp={clearPress}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
    >
      <div className="flex items-center gap-4 p-3">
        <div className="flex flex-col gap-1 font-sans text-sm min-w-0">
          <span
            className={clsx(
              "font-medium truncate",
              disabled
                ? "text-ds-gray-500"
                : isSelected && selectionActive
                  ? "text-ds-blue-900"
                  : "text-ds-gray-1000"
            )}
          >
            {title}
          </span>
          <span
            className={clsx(
              "text-xs truncate",
              disabled
                ? "text-ds-gray-500"
                : isSelected && selectionActive
                  ? "text-ds-blue-900"
                  : "text-ds-gray-900"
            )}
          >
            {description}
          </span>
        </div>
        {selectionActive && (
          <div className="flex items-center ml-auto shrink-0">
            <input
              disabled={disabled}
              type={type}
              value={value}
              checked={isSelected}
              onChange={toggleSelect}
              className="absolute w-[1px] h-[1px] p-0 m-[-1px] overflow-hidden whitespace-nowrap border-none"
            />
            <span className={getChoiceboxGroupClasses(isSelected, type)}>
              {type === "checkbox" && (
                <svg
                  className="shrink-0"
                  height="16"
                  viewBox="0 0 20 20"
                  width="16"
                  aria-hidden
                >
                  <path
                    className={
                      isSelected ? "stroke-ds-background-100" : "stroke-transparent"
                    }
                    d="M14 7L8.5 12.5L6 10"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </span>
          </div>
        )}
      </div>
      {actions && (
        <div
          className={clsx(
            "border-t px-3 pb-3 pt-3 space-y-2",
            isSelected && selectionActive ? "border-ds-blue-600" : "border-ds-gray-400"
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
      {children && isSelected && (
        <div
          className={clsx(
            "border-t",
            isSelected ? "border-ds-blue-600" : "border-ds-gray-400"
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

ChoiceboxGroup.Item = ChoiceboxItem;
