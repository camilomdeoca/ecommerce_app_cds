"use client";

import { Button, ErrorMessage, InputGroup, Label, TextField } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
  autoComplete: string;
  error?: string | null;
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function PasswordField({
  autoComplete,
  error,
  label,
  name,
  placeholder,
  value,
  onChange,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField isRequired isInvalid={Boolean(error)} name={name}>
      <Label>{label}</Label>
      <InputGroup fullWidth>
        <InputGroup.Input
          autoComplete={autoComplete}
          minLength={8}
          placeholder={placeholder}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <InputGroup.Suffix onClick={(event) => event.stopPropagation()}>
          <Button
            isIconOnly
            aria-label={isVisible ? "Hide password" : "Show password"}
            aria-pressed={isVisible}
            size="sm"
            type="button"
            variant="ghost"
            onPress={() => setIsVisible((visible) => !visible)}
          >
            {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
      {error ? <ErrorMessage role="alert">{error}</ErrorMessage> : null}
    </TextField>
  );
}
