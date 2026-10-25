"use client";

import { Avatar, Button, Dropdown, Label, Separator } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { Key } from "react";
import type { SessionUser } from "@/lib/auth";

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}

export function UserMenu({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const initials = user ? getInitials(user.name) : "U";

  const handleAction = (key: Key) => {
    if (key === "profile") {
      router.push("/profile");
    } else if (key === "settings") {
      router.push("/settings");
    } else if (key === "logout") {
      router.push("/login");
    }
  };

  return (
    <Dropdown>
      <Button isIconOnly aria-label="Open user menu" className="rounded-full" variant="ghost">
        <Avatar size="sm">
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar>
      </Button>
      <Dropdown.Popover className="min-w-48" placement="bottom end">
        <Dropdown.Menu onAction={handleAction}>
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
