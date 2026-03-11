'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MovingBorderCard } from '@/components/ui/moving-border';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  CornerUpRight,
  MessageCircle,
  PhoneCall,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCoordinatorStore } from '@/store/useCoordinatorStore';
import { useReceptionistStore } from '@/store/useReceptionistStore';

export default function AIPage() {
  const router = useRouter();
  const coordinatorSetupComplete = useCoordinatorStore((s) => s.setupComplete);
  const receptionistSetupComplete = useReceptionistStore((s) => s.setupComplete);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-4 pb-8 gap-8">
      {/* Agent Cards */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-16 items-stretch px-6">
        {/* Reception Card */}
        <MovingBorderCard
          borderRadius="1rem"
          duration={3500}
          containerClassName="w-full transition-all hover:shadow-lg hover:-translate-y-1"
          borderColor="#f59e0b"
          className="flex flex-col items-start gap-6 bg-neutral-0 px-8 py-8"
        >
          <div className="flex w-full items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl">
              <AvatarImage src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png" alt="Reception Agent" />
              <AvatarFallback className="rounded-xl bg-amber-100 text-amber-600 text-sm font-medium">RA</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start gap-1">
              <span className="text-sm text-amber-600 italic font-medium">24/7</span>
              <span className="text-xl font-semibold text-gray-900">Reception</span>
            </div>
          </div>
          <div>
            <span className="text-base font-semibold text-gray-900">Never miss a call.</span>
          </div>
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100">
                <PhoneCall className="h-4 w-4 text-neutral-600" />
              </div>
              <span className="text-sm text-gray-700">Answers and logs every call</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100">
                <CornerUpRight className="h-4 w-4 text-neutral-600" />
              </div>
              <span className="text-sm text-gray-700">Routes urgent issues fast</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100">
                <Bell className="h-4 w-4 text-neutral-600" />
              </div>
              <span className="text-sm text-gray-700">Sends updates when status changes</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 mt-auto">
            <ShimmerButton
              className="w-full h-10 justify-between px-4 text-sm font-medium"
              onClick={() => router.push('/ai/receptionist')}
            >
              {receptionistSetupComplete ? 'Open Receptionist' : 'Try Call Intake'} <ArrowRight className="h-4 w-4" />
            </ShimmerButton>
            <Button
              variant="ghost"
              className="w-full text-gray-500"
              onClick={() => router.push(receptionistSetupComplete ? '/ai/receptionist' : '/ai/receptionist?setup=true')}
            >
              {receptionistSetupComplete ? 'Settings' : 'Routing Settings'}
            </Button>
          </div>
        </MovingBorderCard>

        {/* Coverage Coordinator Card */}
        <MovingBorderCard
          borderRadius="1rem"
          duration={3000}
          containerClassName="w-full transition-all hover:shadow-lg hover:-translate-y-1"
          borderColor="#22c55e"
          className="flex flex-col items-start gap-6 bg-neutral-0 px-8 py-8"
        >
          <div className="flex w-full items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl">
              <AvatarImage src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png" alt="Coverage Coordinator" />
              <AvatarFallback className="rounded-xl bg-green-100 text-green-600 text-sm font-medium">CC</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start gap-1">
              <span className="text-sm text-green-600 italic font-medium">Coverage</span>
              <span className="text-xl font-semibold text-gray-900">Coordinator</span>
            </div>
          </div>
          <div>
            <span className="text-base font-semibold text-gray-900">Fills shifts in minutes.</span>
          </div>
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100">
                <AlertCircle className="h-4 w-4 text-neutral-600" />
              </div>
              <span className="text-sm text-gray-700">Detects call-outs / no-shows</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100">
                <Users className="h-4 w-4 text-neutral-600" />
              </div>
              <span className="text-sm text-gray-700">Finds best matches</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100">
                <CheckCircle className="h-4 w-4 text-neutral-600" />
              </div>
              <span className="text-sm text-gray-700">Reaches out + assigns automatically</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 mt-auto">
            <ShimmerButton
              className="w-full h-10 justify-between px-4 text-sm font-medium"
              onClick={() => router.push('/ai/coordinator')}
            >
              {coordinatorSetupComplete ? 'Open Coordinator' : 'See Coverage Flow'} <ArrowRight className="h-4 w-4" />
            </ShimmerButton>
            <Button
              variant="ghost"
              className="w-full text-gray-500"
              onClick={() => router.push(coordinatorSetupComplete ? '/ai/coordinator' : '/ai/coordinator?setup=true')}
            >
              {coordinatorSetupComplete ? 'Settings' : 'Turn On Coordinator'}
            </Button>
          </div>
        </MovingBorderCard>

        {/* Visit Verification Card */}
        <MovingBorderCard
          borderRadius="1rem"
          duration={4000}
          containerClassName="w-full transition-all hover:shadow-lg hover:-translate-y-1"
          borderColor="#3b82f6"
          className="flex flex-col items-start gap-6 bg-neutral-0 px-8 py-8"
        >
          <div className="flex w-full items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl">
              <AvatarImage src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-11.png" alt="Visit Verification" />
              <AvatarFallback className="rounded-xl bg-blue-100 text-blue-600 text-sm font-medium">VV</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start gap-1">
              <span className="text-sm text-blue-600 italic font-medium">EVV + Notes</span>
              <span className="text-xl font-semibold text-gray-900">Visit Verification</span>
            </div>
          </div>
          <div>
            <span className="text-base font-semibold text-gray-900">Catch missing info before billing.</span>
          </div>
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100">
                <Clock className="h-4 w-4 text-neutral-600" />
              </div>
              <span className="text-sm text-gray-700">Checks clock-in/out</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100">
                <AlertTriangle className="h-4 w-4 text-neutral-600" />
              </div>
              <span className="text-sm text-gray-700">Flags late arrivals</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100">
                <MessageCircle className="h-4 w-4 text-neutral-600" />
              </div>
              <span className="text-sm text-gray-700">Chases missing notes</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 mt-auto">
            <ShimmerButton className="w-full h-10 justify-between px-4 text-sm font-medium">
              Open Verification Queue <ArrowRight className="h-4 w-4" />
            </ShimmerButton>
            <Button variant="ghost" className="w-full text-gray-500">
              Rules
            </Button>
          </div>
        </MovingBorderCard>
      </div>
    </div>
  );
}
