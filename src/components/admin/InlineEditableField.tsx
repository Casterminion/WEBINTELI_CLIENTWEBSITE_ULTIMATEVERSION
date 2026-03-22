"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type InlineEditableFieldProps = {
  value: string | null;
  onSave: (value: string | null) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "select" | "textarea";
  options?: string[];
  rows?: number;
  disabled?: boolean;
  saving?: boolean;
  inputClassName?: string;
  displayClassName?: string;
  /** Wrapper element for display/edit modes. "dd" for dl/dd context, "span" for h1/p. */
  as?: "dd" | "span";
};

export function InlineEditableField({
  value,
  onSave,
  placeholder,
  type = "text",
  options = [],
  rows = 3,
  disabled = false,
  saving = false,
  inputClassName = "",
  displayClassName = "",
  as: Wrapper = "dd",
}: InlineEditableFieldProps) {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  const displayValue = (value ?? "").trim() || "—";

  const commitSave = useCallback(() => {
    const trimmed = editValue.trim();
    const newValue = trimmed || null;
    if (newValue !== (value ?? null)) {
      onSave(newValue);
    }
    setIsEditing(false);
  }, [editValue, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && type !== "textarea") {
        e.preventDefault();
        commitSave();
      }
      if (e.key === "Escape") {
        setEditValue(value ?? "");
        setIsEditing(false);
        inputRef.current?.blur();
      }
    },
    [commitSave, type, value]
  );

  const startEditing = useCallback(() => {
    if (disabled) return;
    setEditValue(value ?? "");
    setIsEditing(true);
  }, [disabled, value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      if (type === "textarea" && inputRef.current) {
        (inputRef.current as HTMLTextAreaElement).setSelectionRange(
          (value ?? "").length,
          (value ?? "").length
        );
      }
    }
  }, [isEditing, type, value]);

  if (disabled) {
    return (
      <Wrapper
        className={displayClassName}
        style={{ color: "var(--admin-text)" }}
      >
        {displayValue}
      </Wrapper>
    );
  }

  if (isEditing) {
    const baseInputClass =
      "admin-input w-full rounded-lg px-3 py-2 text-sm min-w-0 " + inputClassName;

    if (type === "select") {
      return (
        <Wrapper className="min-w-0">
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitSave}
            onKeyDown={handleKeyDown}
            className={baseInputClass}
            style={{ color: "var(--admin-text)", borderColor: "var(--admin-border)" }}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Wrapper>
      );
    }

    if (type === "textarea") {
      return (
        <Wrapper className="min-w-0 sm:col-span-2">
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitSave}
            onKeyDown={handleKeyDown}
            rows={rows}
            placeholder={placeholder}
            className={`${baseInputClass} resize-y`}
            style={{ color: "var(--admin-text)", borderColor: "var(--admin-border)" }}
          />
        </Wrapper>
      );
    }

    return (
      <Wrapper className="min-w-0">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={baseInputClass}
          style={{ color: "var(--admin-text)", borderColor: "var(--admin-border)" }}
        />
      </Wrapper>
    );
  }

  return (
    <Wrapper
      role="button"
      tabIndex={0}
      onClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startEditing();
        }
      }}
      className={`cursor-pointer rounded px-1 -mx-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${displayClassName}`}
      style={{
        color: displayValue === "—" ? "var(--admin-text-muted)" : "var(--admin-text)",
      }}
    >
      {displayValue}
      {saving && (
        <span className="ml-1.5 text-xs" style={{ color: "var(--admin-text-muted)" }}>
          {t.admin?.saving ?? "Saving…"}
        </span>
      )}
    </Wrapper>
  );
}
