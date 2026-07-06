import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  Search,
  Star,
  WalletCards,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getInstructors } from "@/services/instructors.service";
import type { InstructorListItem, InstructorSearchParams } from "@/types/instructor";

type FilterMenu = "Rating" | "Price" | "Availability" | null;

const ratingOptions = [
  { label: "Any Rating", value: undefined },
  { label: "4.5+", value: 4.5 },
  { label: "4.8+", value: 4.8 },
];
const priceOptions = [
  { label: "Any Price", value: undefined },
  { label: "Up to 100 EGP", value: 100 },
  { label: "Up to 150 EGP", value: 150 },
  { label: "Up to 200 EGP", value: 200 },
];
const availabilityOptions = [
  { label: "Any Availability", value: undefined },
  { label: "Available Now", value: true },
  { label: "Not Available", value: false },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function valueOrMissing(value: string | null | undefined, fallback = "Not added yet") {
  return value?.trim() ? value : fallback;
}

function splitSkills(value: string | null) {
  return value?.split(",").map((skill) => skill.trim()).filter(Boolean) ?? [];
}

function formatRating(value: string | null | undefined) {
  const rating = Number.parseFloat(value ?? "0");
  return rating > 0 ? rating.toFixed(1) : "No ratings yet";
}

function formatPrice(value: string | null | undefined) {
  const price = Number.parseFloat(value ?? "0");
  return price > 0 ? `${price.toFixed(2)} EGP` : "Not set";
}

function verificationClass(status: InstructorListItem["verification_status"]) {
  if (status === "verified") {
    return "bg-emerald-400/15 text-emerald-300 ring-emerald-400/25";
  }
  if (status === "pending_verification") {
    return "bg-tertiary/15 text-tertiary ring-tertiary/25";
  }
  return "bg-error/15 text-error ring-error/25";
}

function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-sm py-xs text-label-md uppercase ring-1",
        available
          ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/25"
          : "bg-on-surface-variant/15 text-zinc-400 ring-outline-variant",
      )}
    >
      {available ? "Available" : "Not available"}
    </span>
  );
}

function InstructorCard({ instructor }: { instructor: InstructorListItem }) {
  const skills = splitSkills(instructor.skills);
  const rating = Number.parseFloat(instructor.rating ?? "0");

  return (
    <article className="flex min-h-[390px] flex-col rounded-lg border border-[#27272A] bg-[#18181B] p-lg transition hover:border-primary/50 hover:bg-[#27272A] hover:shadow-[0_4px_20px_rgba(139,92,246,0.05)]">
      <div className="mb-md flex items-start justify-between gap-md">
        <div className="flex min-w-0 items-center gap-md">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 text-body-md font-semibold text-on-primary">
            {initials(instructor.full_name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-headline-md text-zinc-100">{instructor.full_name}</h2>
            <p className="truncate text-body-sm text-zinc-400">
              {valueOrMissing(instructor.specialization)}
            </p>
          </div>
        </div>

        <AvailabilityBadge available={instructor.is_available_for_instant} />
      </div>

      <div className="mb-md flex flex-wrap items-center gap-sm">
        <span className="flex items-center gap-xs rounded-full bg-tertiary/15 px-sm py-xs text-body-sm text-tertiary">
          <Star className={cn("size-4", rating > 0 && "fill-current")} />
          {formatRating(instructor.rating)}
        </span>
        <span className={cn("flex items-center gap-xs rounded-full px-sm py-xs text-label-md uppercase ring-1", verificationClass(instructor.verification_status))}>
          <BadgeCheck className="size-4" />
          {instructor.verification_status.replaceAll("_", " ")}
        </span>
      </div>

      <p className="line-clamp-3 flex-1 text-body-sm text-zinc-400">
        {valueOrMissing(instructor.bio, "No bio added yet")}
      </p>

      <div className="mt-md flex flex-wrap gap-sm">
        {skills.length > 0 ? (
          skills.slice(0, 4).map((skill) => (
            <span className="rounded-full bg-[#121214] px-sm py-xs text-body-sm text-zinc-400 ring-1 ring-outline-variant" key={skill}>
              {skill}
            </span>
          ))
        ) : (
          <span className="text-body-sm text-zinc-400">No skills added yet</span>
        )}
      </div>

      <div className="my-lg grid gap-sm rounded-md border border-[#27272A] bg-[#121214] p-md text-body-sm sm:grid-cols-2">
        <div className="flex items-center gap-sm text-zinc-400">
          <WalletCards className="size-4 text-secondary" />
          <span>{formatPrice(instructor.price_per_session)}</span>
        </div>
        <div className="flex items-center gap-sm text-zinc-400">
          <BriefcaseBusiness className="size-4 text-secondary" />
          <span>{valueOrMissing(instructor.experience)}</span>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-sm">
        <Link className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90" to={`/student/instructors/${instructor.id}`}>
          View Profile
        </Link>
        <Link className="inline-flex h-10 items-center justify-center rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10" to="/student/requests/create">
          Create Request
        </Link>
      </div>
    </article>
  );
}

export function BrowseInstructorsPage() {
  const [instructors, setInstructors] = useState<InstructorListItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [minRating, setMinRating] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [availability, setAvailability] = useState<boolean | undefined>();
  const [activeMenu, setActiveMenu] = useState<FilterMenu>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo<InstructorSearchParams>(
    () => ({
      search: searchTerm || undefined,
      specialization: specialization || undefined,
      min_rating: minRating,
      max_price: maxPrice,
      availability,
    }),
    [availability, maxPrice, minRating, searchTerm, specialization],
  );

  useEffect(() => {
    async function loadInstructors() {
      setLoading(true);
      try {
        const data = await getInstructors(params);
        setInstructors(data);
        setError("");
      } catch {
        setError("Could not load instructors. Make sure you are logged in and the backend is running.");
      } finally {
        setLoading(false);
      }
    }

    void loadInstructors();
  }, [params]);

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-sm flex items-center gap-sm text-label-md uppercase text-zinc-400">
              <span>Student</span>
              <span className="size-1 rounded-full bg-outline" />
              <span className="text-secondary">Browse Instructors</span>
            </div>
            <h1 className="text-headline-lg text-zinc-100">Find Your Instructor</h1>
            <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
              Browse real registered instructors and review their profiles before creating a request.
            </p>
          </div>

          <div className="flex items-center gap-sm rounded-lg border border-primary/20 bg-primary/10 px-md py-sm text-body-sm text-primary">
            <Award className="size-4" />
            Registered instructor network
          </div>
        </div>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-md">
          <div className="flex flex-col gap-md xl:flex-row xl:items-center">
            <form
              className="flex min-w-0 flex-1 flex-col gap-sm sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                setSearchTerm(searchInput.trim());
              }}
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-md top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input className="h-11 border-[#27272A] bg-[#121214] pl-10 text-zinc-100" onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by name, specialization, skill, or bio..." value={searchInput} />
              </div>
              <Input className="h-11 border-[#27272A] bg-[#121214] text-zinc-100 sm:w-64" onChange={(event) => setSpecialization(event.target.value)} placeholder="Specialization" value={specialization} />
              <button className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90" type="submit">
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-sm">
              <div className="relative">
                <button className="flex h-11 items-center gap-sm rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-400 transition hover:border-primary/50 hover:bg-[#27272A] hover:text-zinc-100" onClick={() => setActiveMenu(activeMenu === "Rating" ? null : "Rating")} type="button">
                  {ratingOptions.find((option) => option.value === minRating)?.label ?? "Rating"}
                  <ChevronDown className="size-4" />
                </button>
                {activeMenu === "Rating" ? (
                  <div className="absolute right-0 z-20 mt-xs w-44 rounded-md border border-[#27272A] bg-[#18181B] p-xs shadow-lg">
                    {ratingOptions.map((option) => (
                      <button className="block w-full rounded-md px-sm py-xs text-left text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100" key={option.label} onClick={() => { setMinRating(option.value); setActiveMenu(null); }} type="button">
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button className="flex h-11 items-center gap-sm rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-400 transition hover:border-primary/50 hover:bg-[#27272A] hover:text-zinc-100" onClick={() => setActiveMenu(activeMenu === "Price" ? null : "Price")} type="button">
                  {priceOptions.find((option) => option.value === maxPrice)?.label ?? "Price"}
                  <ChevronDown className="size-4" />
                </button>
                {activeMenu === "Price" ? (
                  <div className="absolute right-0 z-20 mt-xs w-44 rounded-md border border-[#27272A] bg-[#18181B] p-xs shadow-lg">
                    {priceOptions.map((option) => (
                      <button className="block w-full rounded-md px-sm py-xs text-left text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100" key={option.label} onClick={() => { setMaxPrice(option.value); setActiveMenu(null); }} type="button">
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button className="flex h-11 items-center gap-sm rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-400 transition hover:border-primary/50 hover:bg-[#27272A] hover:text-zinc-100" onClick={() => setActiveMenu(activeMenu === "Availability" ? null : "Availability")} type="button">
                  {availabilityOptions.find((option) => option.value === availability)?.label ?? "Availability"}
                  <ChevronDown className="size-4" />
                </button>
                {activeMenu === "Availability" ? (
                  <div className="absolute right-0 z-20 mt-xs w-48 rounded-md border border-[#27272A] bg-[#18181B] p-xs shadow-lg">
                    {availabilityOptions.map((option) => (
                      <button className="block w-full rounded-md px-sm py-xs text-left text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100" key={option.label} onClick={() => { setAvailability(option.value); setActiveMenu(null); }} type="button">
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading instructors..." /> : null}

        {!loading && instructors.length > 0 ? (
          <section className="grid gap-lg md:grid-cols-2 2xl:grid-cols-3">
            {instructors.map((instructor) => (
              <InstructorCard instructor={instructor} key={instructor.id} />
            ))}
          </section>
        ) : null}

        {!loading && instructors.length === 0 ? (
          <EmptyState
            message="Registered instructors will appear here once they complete their profiles."
            title="No instructors found"
          />
        ) : null}
      </div>
    </>
  );
}
