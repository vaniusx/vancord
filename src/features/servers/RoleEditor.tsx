import { Check, ChevronDown, Loader2, Plus, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAssignRole,
  useBoostServer,
  useCreateRole,
  useDeleteRole,
  useMemberRoles,
  useRoles,
  useUpdateRole,
  useServerMembers,
  useEconomy,
} from "@/features/servers/use-roles";
import type { PermissionName, RoleDefinition } from "@/lib/models";
import { cn } from "@/lib/utils";

const PERMISSION_GROUPS: Array<{ key: string; items: PermissionName[] }> = [
  {
    key: "general",
    items: ["view_channels", "read_history", "send_messages", "add_reactions", "attach_files", "use_external_emoji", "mention_everyone"],
  },
  {
    key: "moderation",
    items: ["manage_messages", "timeout_members", "kick_members", "ban_members", "view_audit_log"],
  },
  {
    key: "server",
    items: ["manage_channels", "manage_roles", "manage_emojis"],
  },
  { key: "voice", items: ["connect_voice", "speak"] },
];

const SWATCHES = [
  "#B06A2E",
  "#2F4A6D",
  "#2E7F6E",
  "#8C4362",
  "#A15430",
  "#4B5B3F",
  "#17605C",
  "#5B82B8",
];

function PermissionGrid({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (permission: PermissionName) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-1.5">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.key} className="grid gap-1 sm:grid-cols-2">
          {group.items.map((permission) => {
            const active = selected.includes(permission);
            return (
              <button
                key={permission}
                type="button"
                onClick={() => onToggle(permission)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {active ? <Check className="size-2.5" /> : null}
                </span>
                <span className="truncate">{t(`permissions.${permission}`)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function RoleRow({ role, serverId }: { role: RoleDefinition; serverId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color ?? SWATCHES[0]);
  const [permissions, setPermissions] = useState<string[]>(role.permissions);
  const update = useUpdateRole(serverId);
  const remove = useDeleteRole(serverId);

  const toggle = (permission: PermissionName) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  };

  const save = () => {
    update.mutate(
      { id: role.id, name, color, permissions },
      {
        onSuccess: () => {
          toast.success(t("roles.saved"));
          setOpen(false);
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  return (
    <div className="rounded-lg border border-border/70">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: role.color ?? "var(--muted-foreground)" }}
        />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{role.name}</span>
        {role.is_default ? (
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {t("roles.default")}
          </span>
        ) : null}
        <span className="text-[11px] text-muted-foreground">{role.permissions.length}</span>
        <ChevronDown
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border/60 p-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`role-name-${role.id}`}>{t("roles.name")}</Label>
              <Input
                id={`role-name-${role.id}`}
                value={name}
                maxLength={64}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("roles.color")}</Label>
              <div className="flex flex-wrap gap-1">
                {SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={swatch}
                    onClick={() => setColor(swatch)}
                    className={cn(
                      "size-5 rounded-full ring-offset-1 transition-shadow",
                      color === swatch && "ring-2 ring-foreground",
                    )}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t("roles.permissions")}</Label>
            <PermissionGrid selected={permissions} onToggle={toggle} />
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7" onClick={save} disabled={update.isPending || !name.trim()}>
              {update.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              {t("common.save")}
            </Button>
            {!role.is_default ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-destructive"
                onClick={() => remove.mutate(role.id)}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                {t("roles.delete")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoleMembers({ role, serverId }: { role: RoleDefinition; serverId: string }) {
  const { t } = useTranslation();
  const { data: members } = useServerMembers(serverId);
  const { data: assignments } = useMemberRoles(serverId);
  const assign = useAssignRole(serverId);
  const [open, setOpen] = useState(false);

  const active = new Set(
    (assignments ?? [])
      .filter((entry) => entry.role_id === role.id)
      .map((entry) => entry.user_id),
  );

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-[11.5px] text-muted-foreground hover:text-foreground"
      >
        {t("roles.assign")} ({active.size})
      </button>
      {open ? (
        <div className="scrollbar-thin mt-1 max-h-44 space-y-0.5 overflow-y-auto rounded-md border border-border/60 p-1">
          {(members ?? []).map((member) => {
            const isActive = active.has(member.user_id);
            return (
              <button
                key={member.user_id}
                type="button"
                onClick={() =>
                  assign.mutate({
                    userId: member.user_id,
                    roleId: role.id,
                    active: !isActive,
                  })
                }
                className={cn(
                  "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[12px] transition-colors",
                  isActive ? "bg-primary/10" : "hover:bg-accent/60",
                )}
              >
                <Avatar profile={member.profile} size="xs" />
                <span className="min-w-0 flex-1 truncate">{member.profile.display_name}</span>
                {isActive ? <Check className="size-3 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function RoleEditor({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const { data: roles } = useRoles(serverId);
  const create = useCreateRole(serverId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), color: SWATCHES[1], permissions: ["view_channels", "read_history"] },
      {
        onSuccess: () => {
          setName("");
          setCreating(false);
        },
        onError: () => toast.error(t("common.error")),
      },
    );
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[12.5px] font-semibold">{t("roles.title")}</p>
        <p className="text-[11.5px] text-muted-foreground">{t("roles.subtitle")}</p>
      </div>

      {(roles ?? []).length === 0 ? (
        <p className="text-[11.5px] text-muted-foreground">{t("roles.noRoles")}</p>
      ) : null}

      {(roles ?? []).map((role) => (
        <div key={role.id}>
          <RoleRow role={role} serverId={serverId} />
          <RoleMembers role={role} serverId={serverId} />
        </div>
      ))}

      {creating ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            maxLength={64}
            placeholder={t("roles.newRole")}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
              if (event.key === "Escape") setCreating(false);
            }}
          />
          <Button size="sm" className="h-8" onClick={submit} disabled={create.isPending}>
            {t("common.save")}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-7" onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 size-3.5" />
          {t("roles.create")}
        </Button>
      )}
    </div>
  );
}

export function BoostPanel({ serverId, boostLevel }: { serverId: string; boostLevel: number }) {
  const { t } = useTranslation();
  const { data: economy } = useEconomy();
  const boost = useBoostServer();

  return (
    <div className="space-y-2 rounded-xl border border-border/70 p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-signal/15 text-signal">
          <Zap className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold">{t("economy.boostLevel")}</p>
          <p className="text-[11.5px] text-muted-foreground">
            {t("economy.level", { level: boostLevel })}
          </p>
        </div>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              boostLevel >= level ? "bg-signal" : "bg-secondary",
            )}
          />
        ))}
      </div>

      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {t("economy.boostHint")}
      </p>

      <Button
        size="sm"
        variant="outline"
        className="h-7"
        disabled={boost.isPending || (economy?.balance ?? 0) < 1000}
        onClick={() =>
          boost.mutate(serverId, {
            onSuccess: () => toast.success(t("economy.bought")),
            onError: () => toast.error(t("economy.notEnough")),
          })
        }
      >
        {boost.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
        {t("economy.boostServer")} · 1000
      </Button>
    </div>
  );
}
