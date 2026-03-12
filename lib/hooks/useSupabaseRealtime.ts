import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

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
  // Store latest callback in a ref so the useEffect doesn't depend on it
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Deterministic channel name — no Date.now()
    const channelName = `${table}_${event}${filter ? `_${filter}` : ""}`;
    let subscription = supabase.channel(channelName);

    // Build the subscription
    const opts: Record<string, any> = {
      event,
      schema: "public",
      table,
      ...(filter && { filter }),
    };

    subscription = subscription.on(
      "postgres_changes" as any,
      opts,
      (payload: any) => callbackRef.current(payload)
    );

    // Subscribe
    subscription.subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [table, event, filter]);
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
  // Store latest callbacks in a ref so the useEffect doesn't depend on them
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channelName = `${table}_multi${filter ? `_${filter}` : ""}`;
    let channel = supabase.channel(channelName);

    // Subscribe to INSERT
    channel = channel.on(
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table,
        ...(filter && { filter }),
      },
      (payload: any) => {
        callbacksRef.current.onInsert?.(payload.new as T);
      }
    );

    // Subscribe to UPDATE
    channel = channel.on(
      "postgres_changes" as any,
      {
        event: "UPDATE",
        schema: "public",
        table,
        ...(filter && { filter }),
      },
      (payload: any) => {
        callbacksRef.current.onUpdate?.(payload.new as T, payload.old as T);
      }
    );

    // Subscribe to DELETE
    channel = channel.on(
      "postgres_changes" as any,
      {
        event: "DELETE",
        schema: "public",
        table,
        ...(filter && { filter }),
      },
      (payload: any) => {
        callbacksRef.current.onDelete?.(payload.old as T);
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
}
