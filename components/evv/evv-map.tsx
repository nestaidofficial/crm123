"use client";

import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, Navigation, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt?: string;
}

interface EVVMapProps {
  clientLocation?: { lat: number; lng: number };
  onClockIn?: (location: GeoPoint) => void;
  onClockOut?: (location: GeoPoint) => void;
  showClockInButton?: boolean;
  /** Allow Clock Out without first capturing Clock In this session (e.g. visit already has clock_in in DB) */
  clockInAlreadyRecorded?: boolean;
  /** Pre-populate the map with a previously saved clock-in GPS location */
  initialClockInLoc?: GeoPoint | null;
  /** Pre-populate the map with a previously saved clock-out GPS location */
  initialClockOutLoc?: GeoPoint | null;
}

export function EVVMap({
  clientLocation,
  onClockIn,
  onClockOut,
  showClockInButton = true,
  clockInAlreadyRecorded = false,
  initialClockInLoc,
  initialClockOutLoc,
}: EVVMapProps) {
  const [clockInLoc, setClockInLoc] = useState<GeoPoint | null>(initialClockInLoc ?? null);
  const [clockOutLoc, setClockOutLoc] = useState<GeoPoint | null>(initialClockOutLoc ?? null);

  // Sync with parent-provided initial locations whenever the entry changes
  useEffect(() => {
    setClockInLoc(initialClockInLoc ?? null);
  }, [initialClockInLoc]);

  useEffect(() => {
    setClockOutLoc(initialClockOutLoc ?? null);
  }, [initialClockOutLoc]);
  const [loadingIn, setLoadingIn] = useState(false);
  const [loadingOut, setLoadingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const captureLocation = useCallback(
    (onSuccess: (loc: GeoPoint) => void, setLoading: (v: boolean) => void) => {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        return;
      }
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: GeoPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            capturedAt: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          };
          onSuccess(loc);
          setLoading(false);
        },
        (err) => {
          setError(err.message || "Unable to get your location.");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    []
  );

  const handleClockIn = useCallback(() => {
    captureLocation((loc) => {
      setClockInLoc(loc);
      onClockIn?.(loc);
    }, setLoadingIn);
  }, [captureLocation, onClockIn]);

  const handleClockOut = useCallback(() => {
    captureLocation((loc) => {
      setClockOutLoc(loc);
      onClockOut?.(loc);
    }, setLoadingOut);
  }, [captureLocation, onClockOut]);

  // Build static map URL showing both pins
  const buildStaticMapUrl = () => {
    if (!apiKey || !clockInLoc) return null;

    const center = clockOutLoc
      ? `${((clockInLoc.lat + clockOutLoc.lat) / 2).toFixed(6)},${((clockInLoc.lng + clockOutLoc.lng) / 2).toFixed(6)}`
      : `${clockInLoc.lat},${clockInLoc.lng}`;

    const zoom = 17;
    const inMarker = `markers=color:green|label:IN|${clockInLoc.lat},${clockInLoc.lng}`;
    const outMarker = clockOutLoc
      ? `&markers=color:red|label:OUT|${clockOutLoc.lat},${clockOutLoc.lng}`
      : "";
    const clientMarker = clientLocation
      ? `&markers=color:blue|label:C|${clientLocation.lat},${clientLocation.lng}`
      : "";

    return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=600x192&scale=2&${inMarker}${outMarker}${clientMarker}&key=${apiKey}`;
  };

  const openInMaps = (lat: number, lng: number) =>
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");

  const hasAnyLocation = clockInLoc !== null;
  const staticUrl = hasAnyLocation ? buildStaticMapUrl() : null;

  return (
    <div className="space-y-3">
      {/* ── Map area ── */}
      <div className="relative rounded-lg overflow-hidden border border-neutral-200 bg-muted">
        {hasAnyLocation && staticUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={staticUrl}
              alt="Visit location map"
              className="w-full h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                const fallback = (e.target as HTMLImageElement)
                  .parentElement?.querySelector(".map-fallback") as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div className="map-fallback h-48 hidden flex-col items-center justify-center gap-2 p-4">
              <p className="text-xs text-muted-foreground text-center">
                Enable <strong>Maps Static API</strong> in Google Cloud Console to see the map.
              </p>
              <a
                href={`https://www.google.com/maps?q=${clockInLoc?.lat},${clockInLoc?.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline text-neutral-600"
              >
                Open in Google Maps ↗
              </a>
            </div>

            {/* Open in Maps overlay */}
            {clockInLoc && (
              <button
                onClick={() => openInMaps(clockInLoc.lat, clockInLoc.lng)}
                className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-white/90 border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-700 shadow-sm hover:bg-white transition-colors"
              >
                <Navigation className="h-3 w-3" />
                Open in Maps
              </button>
            )}
          </>
        ) : hasAnyLocation && !staticUrl ? (
          /* Has location but no API key */
          <div className="h-48 flex flex-col items-center justify-center gap-2 p-4">
            <MapPin className="h-6 w-6 text-neutral-400" />
            <p className="text-xs text-muted-foreground text-center">
              Add <code className="bg-neutral-100 px-1 rounded text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to .env.local for map display.
            </p>
            {clockInLoc && (
              <a
                href={`https://www.google.com/maps?q=${clockInLoc.lat},${clockInLoc.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline text-neutral-600"
              >
                Open in Google Maps ↗
              </a>
            )}
          </div>
        ) : (
          /* No location yet */
          <div className="h-48 flex flex-col items-center justify-center gap-2">
            <MapPin className="h-8 w-8 text-neutral-300" />
            <p className="text-sm text-neutral-400">No location captured yet</p>
          </div>
        )}
      </div>

      {/* ── Clock In / Out pill cards ── */}
      {showClockInButton && (
        <div className="grid grid-cols-2 gap-3">
          {/* Clock In card */}
          <div className={cn(
            "rounded-lg border p-3 space-y-2 transition-colors",
            clockInLoc
              ? "border-green-200 bg-green-50/50"
              : "border-neutral-200 bg-white"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <LogIn className={cn("h-4 w-4", clockInLoc ? "text-green-600" : "text-neutral-400")} />
                <span className="text-xs font-medium text-neutral-700">Clock In</span>
              </div>
              {clockInLoc && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  Captured
                </Badge>
              )}
            </div>

            {clockInLoc ? (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-green-800">{clockInLoc.capturedAt}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {clockInLoc.lat.toFixed(5)}, {clockInLoc.lng.toFixed(5)}
                </p>
                {clockInLoc.accuracy && (
                  <p className="text-[11px] text-muted-foreground">±{Math.round(clockInLoc.accuracy)}m accuracy</p>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                className="w-full h-7 text-xs rounded-md bg-green-600 hover:bg-green-700 text-white gap-1"
                onClick={handleClockIn}
                disabled={loadingIn}
              >
                {loadingIn
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <LogIn className="h-3.5 w-3.5" />}
                {loadingIn ? "Locating..." : "Clock In"}
              </Button>
            )}
          </div>

          {/* Clock Out card */}
          <div className={cn(
            "rounded-lg border p-3 space-y-2 transition-colors",
            clockOutLoc
              ? "border-red-200 bg-red-50/50"
              : (clockInLoc || clockInAlreadyRecorded)
                ? "border-neutral-200 bg-white"
                : "border-neutral-100 bg-neutral-50 opacity-60"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <LogOut className={cn("h-4 w-4", clockOutLoc ? "text-red-600" : "text-neutral-400")} />
                <span className="text-xs font-medium text-neutral-700">Clock Out</span>
              </div>
              {clockOutLoc && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  Captured
                </Badge>
              )}
            </div>

            {clockOutLoc ? (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-red-800">{clockOutLoc.capturedAt}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {clockOutLoc.lat.toFixed(5)}, {clockOutLoc.lng.toFixed(5)}
                </p>
                {clockOutLoc.accuracy && (
                  <p className="text-[11px] text-muted-foreground">±{Math.round(clockOutLoc.accuracy)}m accuracy</p>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs rounded-md border-red-200 text-red-600 hover:bg-red-50 gap-1"
                onClick={handleClockOut}
                disabled={loadingOut || (!clockInLoc && !clockInAlreadyRecorded)}
                title={(!clockInLoc && !clockInAlreadyRecorded) ? "Clock in first" : undefined}
              >
                {loadingOut
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <LogOut className="h-3.5 w-3.5" />}
                {loadingOut ? "Locating..." : "Clock Out"}
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 text-center px-2">{error}</p>
      )}

      {/* Legend */}
      {hasAnyLocation && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Clock-in location
          </span>
          {clockOutLoc && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Clock-out location
            </span>
          )}
          {clientLocation && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Client address
            </span>
          )}
        </div>
      )}
    </div>
  );
}
