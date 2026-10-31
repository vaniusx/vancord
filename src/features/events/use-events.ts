import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/auth-store";
import { requireSupabase } from "@/lib/supabase";

export type EventAttendance = "going" | "interested" | "declined";

export interface ServerEvent {
  id: string;
  server_id: string;
  channel_id: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  cover_url: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  cancelled_at: string | null;
  counts: Record<EventAttendance, number>;
  mine: EventAttendance | null;
  channel_name: string | null;
}

const SELECT = `
  id, server_id, channel_id, created_by, title, description, cover_url,
  starts_at, ends_at, location, cancelled_at,
  attendees:event_attendees(user_id, status),
  channel:channels(name)
`;

interface RawEvent {
  id: string;
  server_id: string;
  channel_id: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  cover_url: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  cancelled_at: string | null;
  attendees: Array<{ user_id: string; status: EventAttendance }> | null;
  channel: { name: string | null } | null;
}

function normalize(row: RawEvent, userId: string | undefined): ServerEvent {
  const counts: Record<EventAttendance, number> = {
    going: 0,
    interested: 0,
    declined: 0,
  };
  let mine: EventAttendance | null = null;
  for (const attendee of row.attendees ?? []) {
    counts[attendee.status] = (counts[attendee.status] ?? 0) + 1;
    if (attendee.user_id === userId) mine = attendee.status;
  }
  return {
    id: row.id,
    server_id: row.server_id,
    channel_id: row.channel_id,
    created_by: row.created_by,
    title: row.title,
    description: row.description,
    cover_url: row.cover_url,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    location: row.location,
    cancelled_at: row.cancelled_at,
    counts,
    mine,
    channel_name: row.channel?.name ?? null,
  };
}

export const eventsKey = (serverId: string | undefined) =>
  ["events", serverId] as const;

export function useServerEvents(serverId: string | undefined) {
  const user = useCurrentUser();

  return useQuery({
    queryKey: eventsKey(serverId),
    enabled: Boolean(serverId),
    queryFn: async (): Promise<ServerEvent[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_events")
        .select(SELECT)
        .eq("server_id", serverId!)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as RawEvent[]).map((row) =>
        normalize(row, user?.id),
      );
    },
  });
}

export function useUpcomingEvents(userId: string | undefined) {
  return useQuery({
    queryKey: ["events", "attending", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ServerEvent[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("event_attendees")
        .select(
          `status,
           event:server_events!inner(${SELECT.replace(/\n/g, " ")})`,
        )
        .eq("user_id", userId!)
        .in("status", ["going", "interested"])
        .limit(20);
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<{
        status: EventAttendance;
        event: RawEvent | null;
      }>;

      return rows
        .filter((row) => row.event && !row.event.cancelled_at)
        .map((row) => normalize(row.event!, userId))
        .filter((event) => new Date(event.starts_at).getTime() > Date.now() - 3_600_000)
        .sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
        );
    },
  });
}

export function useCreateEvent(serverId: string | undefined) {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      startsAt: string;
      endsAt?: string | null;
      channelId?: string | null;
      location?: string | null;
      coverUrl?: string | null;
    }) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_events")
        .insert({
          server_id: serverId!,
          created_by: user!.id,
          title: input.title,
          description: input.description ?? null,
          starts_at: input.startsAt,
          ends_at: input.endsAt ?? null,
          channel_id: input.channelId ?? null,
          location: input.location ?? null,
          cover_url: input.coverUrl ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventsKey(serverId) });
    },
  });
}

export function useUpdateEvent(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; cancel?: boolean } & Partial<{
      title: string;
      description: string | null;
      starts_at: string;
      ends_at: string | null;
      channel_id: string | null;
      location: string | null;
    }>) => {
      const supabase = requireSupabase();
      const { id, cancel, ...patch } = input;
      const { error } = await supabase
        .from("server_events")
        .update(
          cancel ? { cancelled_at: new Date().toISOString() } : patch,
        )
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventsKey(serverId) });
    },
  });
}

export function useSetAttendance(serverId: string | undefined) {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (input: { eventId: string; status: EventAttendance | null }) => {
      const supabase = requireSupabase();
      if (input.status === null) {
        const { error } = await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", input.eventId)
          .eq("user_id", user!.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("event_attendees")
        .upsert(
          {
            event_id: input.eventId,
            user_id: user!.id,
            status: input.status,
          },
          { onConflict: "event_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventsKey(serverId) });
      void queryClient.invalidateQueries({ queryKey: ["events", "attending"] });
    },
  });
}
