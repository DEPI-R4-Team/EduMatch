import { BadgeCheck, Clock3, LockKeyhole, UserCheck, UsersRound, WalletCards, Zap } from "lucide-react";
import { FloatingCard } from "@/components/animations/FloatingCard";

const GROUP_AVATARS = ["S1", "S2", "S3"] as const;

export function FloatingPreviews() {
  return (
    <div className="relative hidden h-[520px] w-full max-w-[980px] perspective-[1000px] lg:block" aria-hidden="true">
      <div className="absolute left-1/2 top-[46%] h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5cf6]/15 blur-[100px]" />

      <FloatingCard subtle className="absolute left-1/2 top-[45%] z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[#0a0a0a]/85 px-5 py-3 shadow-[0_0_32px_rgba(139,92,246,0.18)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-[#a78bfa]" />
          <span className="text-label-md font-bold text-white">Payment held safely</span>
        </div>
      </FloatingCard>

      <FloatingCard className="absolute left-[7%] top-10 z-30 w-[350px] -rotate-6 overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a]/92 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 hover:border-[#8b5cf6]/30">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#8b5cf6]/12 to-transparent" />
        <div className="relative z-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#8b5cf6]/25 bg-[#8b5cf6]/10 text-[#a78bfa]">
                <Zap className="h-5 w-5" />
              </span>
              <div>
                <p className="text-body-md font-bold text-white">Instant Help Request</p>
                <p className="text-body-sm text-gray-400">Urgent topic support</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-label-md font-bold text-emerald-300">
              Open
            </span>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-body-sm text-gray-400">Subject</span>
              <span className="text-body-sm font-bold text-white">Calculus</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-body-sm text-gray-400">Duration</span>
              <span className="inline-flex items-center gap-1 text-body-sm font-bold text-white">
                <Clock3 className="h-4 w-4 text-[#a78bfa]" />
                30 min
              </span>
            </div>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard className="absolute right-[8%] top-16 z-20 w-[355px] rotate-6 overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a]/92 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 hover:border-[#8b5cf6]/30">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#8b5cf6]/12 to-transparent" />
        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] text-label-lg font-black text-white">
              IA
            </div>
            <div>
              <p className="text-body-md font-bold text-white">Instructor Application</p>
              <p className="text-body-sm text-gray-400">Verified instructor matched</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <span className="inline-flex items-center gap-2 text-body-sm text-gray-400">
                <WalletCards className="h-4 w-4 text-[#a78bfa]" />
                Proposed price
              </span>
              <span className="text-body-sm font-black text-white">EGP 250</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-body-sm font-bold text-emerald-200">
                <BadgeCheck className="h-4 w-4" />
                Application fit
              </span>
              <UserCheck className="h-5 w-5 text-emerald-300" />
            </div>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard subtle className="absolute bottom-8 left-1/2 z-40 w-[390px] -translate-x-1/2 rotate-1 overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a]/92 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 hover:border-[#8b5cf6]/30">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#8b5cf6]/12 to-transparent" />
        <div className="relative z-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#8b5cf6]/25 bg-[#8b5cf6]/10 text-[#a78bfa]">
                <UsersRound className="h-5 w-5" />
              </span>
              <div>
                <p className="text-body-md font-bold text-white">Group Learning</p>
                <p className="text-body-sm text-gray-400">Shared request joined</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-label-md font-bold text-gray-300">
              3 students
            </span>
          </div>

          <div className="flex items-end justify-between gap-5 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <div>
              <p className="mb-3 text-body-sm text-gray-400">Avatars merging</p>
              <div className="flex -space-x-3">
                {GROUP_AVATARS.map((label, index) => (
                  <div
                    key={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#111] text-[11px] font-black text-white"
                    style={{ zIndex: GROUP_AVATARS.length - index }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-label-md text-gray-400">Payment share</p>
              <p className="text-headline-sm font-black text-[#a78bfa]">Recalculated</p>
            </div>
          </div>
        </div>
      </FloatingCard>
    </div>
  );
}
