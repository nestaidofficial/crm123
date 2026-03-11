"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";

interface Day1CountdownProps {
  startDate: string;
  isDay1PhaseActive: boolean;
  className?: string;
}

export function Day1Countdown({
  startDate,
  isDay1PhaseActive,
  className,
}: Day1CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isToday: boolean;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isToday: false, isPast: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const start = new Date(startDate);
      const now = new Date();

      // Set both to start of day for comparison
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const difference = startDay.getTime() - today.getTime();
      const isToday = difference === 0;
      const isPast = difference < 0;

      if (isPast) {
        // Calculate days past
        const daysPast = Math.abs(Math.floor(difference / (1000 * 60 * 60 * 24)));
        return { days: daysPast, hours: 0, minutes: 0, seconds: 0, isToday: false, isPast: true };
      }

      if (isToday) {
        // Calculate time left in the day
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const timeLeftInDay = endOfDay.getTime() - now.getTime();

        return {
          days: 0,
          hours: Math.floor((timeLeftInDay / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((timeLeftInDay / 1000 / 60) % 60),
          seconds: Math.floor((timeLeftInDay / 1000) % 60),
          isToday: true,
          isPast: false,
        };
      }

      // Future date
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isToday: false,
        isPast: false,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [startDate]);

  // Don't show if not in Day 1 phase
  if (!isDay1PhaseActive) return null;

  // Past start date - show warning
  if (timeLeft.isPast) {
    return (
      <Card
        className={cn(
          "border-2 border-red-200 bg-gradient-to-r from-red-50 to-red-100 overflow-hidden",
          className
        )}
      >
        <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-red-800">
                  Day 1 Compliance Overdue
                </h3>
                <Badge className="bg-red-200 text-red-800 text-[10px]">
                  {timeLeft.days} day{timeLeft.days !== 1 ? "s" : ""} past
                </Badge>
              </div>
              <p className="text-xs text-red-700 mt-0.5">
                I-9 documents must be completed. Federal deadline has passed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Today - show urgent countdown
  if (timeLeft.isToday) {
    return (
      <Card
        className={cn(
          "border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 overflow-hidden animate-pulse",
          className
        )}
      >
        <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500 shadow-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-amber-800">
                  TODAY: Complete Day 1 Requirements
                </h3>
                <Badge className="bg-amber-200 text-amber-800 text-[10px] animate-bounce">
                  URGENT
                </Badge>
              </div>
              <p className="text-xs text-amber-700">
                I-9 Section 1 must be completed by end of day
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-amber-800 font-mono">
                <div className="bg-amber-200 rounded px-2 py-1">
                  <span className="text-lg font-bold">{String(timeLeft.hours).padStart(2, "0")}</span>
                </div>
                <span className="text-lg">:</span>
                <div className="bg-amber-200 rounded px-2 py-1">
                  <span className="text-lg font-bold">{String(timeLeft.minutes).padStart(2, "0")}</span>
                </div>
                <span className="text-lg">:</span>
                <div className="bg-amber-200 rounded px-2 py-1">
                  <span className="text-lg font-bold">{String(timeLeft.seconds).padStart(2, "0")}</span>
                </div>
              </div>
              <p className="text-[10px] text-amber-700 mt-1">Time remaining today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Future date - show countdown
  return (
    <Card
      className={cn(
        "border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 overflow-hidden",
        className
      )}
    >
      <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-blue-500">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-blue-800">
              Day 1: {startDate}
            </h3>
            <p className="text-xs text-blue-700 mt-0.5">
              I-9 documents must be completed on this date
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-800">
              {timeLeft.days}
            </div>
            <p className="text-[10px] text-blue-600">
              day{timeLeft.days !== 1 ? "s" : ""} until Day 1
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
