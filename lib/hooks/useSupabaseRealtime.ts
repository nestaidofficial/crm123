import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook for subscribing to Supabase real-time changes on a table.
 * Automatically handles subscription lifecycle and cleanup.
 * 
 * @param table - The table name to subscribe to
 * @param event - The event type ('INSERT', 'UPDATE', 'DELETE', or '*' for all)
 * @param callback - Function to call when changes occur
 * @param filter - Optional filter string (e.g., 'agency_id=eq.123')
 */
export function useSupabaseRealtime<T = any>(
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  callback: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: T;
    old: T;
  }) => void,
  filter?: string
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    
    // Create channel with unique name
    const channelName = `${table}_${event}_${Date.now()}`;
    let subscription = supabase.channel(channelName);

    // Build the subscription
    if (filter) {
      subscription = subscription.on(
        "postgres_changes" as any,
        {
          event,
          schema: "public",
          table,
          filter,
        },
        callback as any
      );
    } else {
      subscription = subscription.on(
        "postgres_changes" as any,
        {
          event,
          schema: "public",
          table,
        },
        callback as any
      );
    }

    // Subscribe
    subscription.subscribe();
    setChannel(subscription);

    // Cleanup on unmount
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [table, event, filter]);

  return channel;
}

/**
 * Hook for subscribing to multiple real-time events on a table.
 * Useful when you need to listen to INSERT, UPDATE, and DELETE simultaneously.
 */
export function useSupabaseRealtimeMulti<T = any>(
  table: string,
  callbacks: {
    onInsert?: (record: T) => void;
    onUpdate?: (record: T, old: T) => void;
    onDelete?: (record: T) => void;
  },
  filter?: string
) {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channelName = `${table}_multi_${Date.now()}`;
    let channel = supabase.channel(channelName);

    // Subscribe to INSERT
    if (callbacks.onInsert) {
      channel = channel.on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table,
          ...(filter && { filter }),
        },
        (payload: any) => {
          callbacks.onInsert?.(payload.new as T);
        }
      );
    }

    // Subscribe to UPDATE
    if (callbacks.onUpdate) {
      channel = channel.on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table,
          ...(filter && { filter }),
        },
        (payload: any) => {
          callbacks.onUpdate?.(payload.new as T, payload.old as T);
        }
      );
    }

    // Subscribe to DELETE
    if (callbacks.onDelete) {
      channel = channel.on(
        "postgres_changes" as any,
        {
          event: "DELETE",
          schema: "public",
          table,
          ...(filter && { filter }),
        },
        (payload: any) => {
          callbacks.onDelete?.(payload.old as T);
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
}
