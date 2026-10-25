"use client";

import { Avatar, Button, Dropdown, Label, Separator } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, type Key } from "react";
import { apiClient } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth";

function getInitials(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  const initials = localPart
    .trim()
    .split(/[._-]+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const initials = getInitials(user.email);

  const handleAction = async (key: Key) => {
    if (key === "profile") {
      router.push("/profile");
    } else if (key === "settings") {
      router.push("/settings");
    } else if (key === "logout") {
      setIsLoggingOut(true);

      try {
        await apiClient.POST("/api/v1/auth/logout", { credentials: "include" });
      } finally {
        router.replace("/login");
        router.refresh();
      }
    }
  };

  return (
    <Dropdown>
      <Button
        isIconOnly
        aria-label={`Open user menu for ${user.email}`}
        className="rounded-full"
        isDisabled={isLoggingOut}
        variant="ghost"
      >
        <Avatar size="sm">
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar>
      </Button>
      <Dropdown.Popover className="min-w-48" placement="bottom end">
        <Dropdown.Menu onAction={(key) => void handleAction(key)}>
          <Dropdown.Item id="profile" textValue="Profile">
            <Label>Profile</Label>
          </Dropdown.Item>
          <Dropdown.Item id="settings" textValue="Settings">
            <Label>Settings</Label>
          </Dropdown.Item>
          <Separator />
          <Dropdown.Item id="logout" textValue="Log out" variant="danger">
            <Label>Log out</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
