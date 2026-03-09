"use client";

import { useRef, useCallback, KeyboardEvent, useEffect } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
  /** When true, inputs use type="password" so characters are hidden (e.g. for PIN). */
  masked?: boolean;
  /** When true (default), focus first input when value is empty. Set false for second/confirmation inputs. */
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  error,
  masked = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  useEffect(() => {
    if (autoFocus && value.length === 0) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus, value.length]);

  const handleChange = useCallback(
    (index: number, digit: string) => {
      const sanitized = digit.replace(/\D/g, "").slice(-1);
      const next = [...digits];
      next[index] = sanitized;
      const newValue = next.join("");
      onChange(newValue);

      if (sanitized && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, length, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    },
    [length, onChange]
  );

  return (
    <div className="flex justify-center gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type={masked ? "password" : "text"}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={masked ? `PIN digit ${i + 1}` : `Digit ${i + 1}`}
          aria-invalid={!!error}
          autoComplete={masked ? "off" : i === 0 ? "one-time-code" : "off"}
          className={`h-14 w-12 rounded-xl border-2 bg-white text-center text-xl font-semibold text-app-body outline-none transition-colors focus:border-app-primary ${
            error ? "border-danger" : "border-default-200"
          } ${disabled ? "opacity-50" : ""}`}
        />
      ))}
    </div>
  );
}
