"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Calendar, ChevronUp, ChevronDown, Inbox, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type Submission = {
  id: string;
  name: string;
  email: string;
  city: string;
  industry: string;
  service: string;
  package_price_display: string;
  created_at: string;
};

type SortKey = "created_at" | "name" | "package_price_display";
type SortDirection = "asc" | "desc";

export default function ClientRequestsPage() {
  const router = useRouter();
  const [data, setData] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
    } catch {
      setNotificationPermission("default");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
    } else {
      setNotificationPermission(Notification.permission);
    }

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("intake_submissions")
        .select("*")
        .is("assigned_to", null)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setError(error.message || "Unable to load submissions.");
      } else {
        setData((data ?? []) as Submission[]);
      }

      setLoading(false);
    };

    void load();

    const channel = supabase
      .channel("intake_submissions_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "intake_submissions" },
        (payload) => {
          if (!isMounted) return;
          const row = payload.new as Submission & { assigned_to: string | null };
          if (row.assigned_to !== null) return;

          setData((prev) => [row, ...prev]);

          if (typeof window === "undefined") return;
          if (!("Notification" in window)) return;
          if (Notification.permission !== "granted") return;

          try {
            const title = row.name ? `New lead: ${row.name}` : "New lead";
            const bodyParts: string[] = [];
            if (row.city) bodyParts.push(row.city);
            if (row.service) bodyParts.push(row.service);
            const body = bodyParts.join(" · ");

            const notification = new Notification(title, {
              body,
              tag: row.id,
            });

            notification.onclick = () => {
              window.focus();
              router.push(`/admin/leads/${row.id}`);
            };
          } catch {
            // Ignore notification errors
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [router]);

  const cities = useMemo(
    () => Array.from(new Set(data.map((d) => d.city))).filter(Boolean).sort(),
    [data]
  );
  const industries = useMemo(
    () => Array.from(new Set(data.map((d) => d.industry))).filter(Boolean).sort(),
    [data]
  );
  const services = useMemo(
    () => Array.from(new Set(data.map((d) => d.service))).filter(Boolean).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    return data
      .filter((item) => {
        const term = search.trim().toLowerCase();
        if (term) {
          const haystack = `${item.name} ${item.email} ${item.city} ${item.industry}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        if (cityFilter !== "all" && item.city !== cityFilter) return false;
        if (industryFilter !== "all" && item.industry !== industryFilter) return false;
        if (serviceFilter !== "all" && item.service !== serviceFilter) return false;

        if (fromDate) {
          const from = new Date(fromDate);
          const created = new Date(item.created_at);
          if (created < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate);
          const created = new Date(item.created_at);
          if (created > to) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1;

        if (sortKey === "created_at") {
          const av = new Date(a.created_at).getTime();
          const bv = new Date(b.created_at).getTime();
          return av === bv ? 0 : av > bv ? dir : -dir;
        }

        const av = (a[sortKey] ?? "").toString().toLowerCase();
        const bv = (b[sortKey] ?? "").toString().toLowerCase();
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      });
  }, [
    data,
    search,
    cityFilter,
    industryFilter,
    serviceFilter,
    fromDate,
    toDate,
    sortKey,
    sortDirection,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("lt-LT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const clearFilters = () => {
    setSearch("");
    setCityFilter("all");
    setIndustryFilter("all");
    setServiceFilter("all");
    setFromDate("");
    setToDate("");
    setSortKey("created_at");
    setSortDirection("desc");
  };

  const openDeleteConfirm = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmId(id);
  }, []);

  const performDelete = useCallback(async () => {
    const id = deleteConfirmId;
    if (!id) return;
    setDeletingId(id);
    setError(null);
    const { data: deleted, error } = await supabase
      .from("intake_submissions")
      .delete()
      .eq("id", id)
      .select("id");
    setDeletingId(null);
    setDeleteConfirmId(null);
    if (error) {
      setError(error.message || "Failed to delete.");
      return;
    }
    if (!deleted?.length) {
      setError("Delete was not allowed. You may need to be logged in as admin.");
      return;
    }
    setData((prev) => prev.filter((item) => item.id !== id));
  }, [deleteConfirmId]);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={!!deleteConfirmId}
        onClose={closeDeleteConfirm}
        onConfirm={performDelete}
        title="Delete submission?"
        message="Delete this submission? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deletingId === deleteConfirmId}
      />
      {notificationPermission !== "granted" &&
        notificationPermission !== "unsupported" && (
          <div
            className="rounded-md border px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            style={{
              borderColor: "var(--admin-border)",
              background: "var(--admin-panel)",
            }}
          >
            <div className="text-sm" style={{ color: "var(--admin-text)" }}>
              <p className="font-medium text-xs uppercase tracking-wider" style={{ color: "var(--admin-warning)" }}>Alert</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--admin-text-muted)" }}>
                Enable notifications to receive instant alerts when new leads arrive.
              </p>
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0 shrink-0">
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: "var(--admin-accent)",
                  color: "#ffffff",
                }}
              >
                Enable alerts
              </button>
            </div>
          </div>
        )}
      {/* Header + metric */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--admin-text)" }}>
            Client Requests
          </h1>
          <p className="mt-0.5 max-w-xl text-xs" style={{ color: "var(--admin-text-muted)" }}>
            Unclaimed intake submissions — review by city, industry and service.
          </p>
        </div>
        <div className="admin-metric flex items-center gap-4 rounded-md px-4 py-2.5 tabular-nums">
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
            Total
          </span>
          <span className="text-xl font-semibold">
            {filtered.length}
          </span>
        </div>
      </header>

      {/* Filters: collapsed by default */}
      <section
        className="rounded-md border overflow-hidden"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-panel)",
        }}
      >
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-xs transition-colors hover:bg-[var(--admin-bg-elevated)]"
          style={{ color: "var(--admin-text-muted)" }}
        >
          <span className="inline-flex items-center gap-2 uppercase tracking-wider font-medium">
            <Filter className="h-3.5 w-3.5 shrink-0" />
            Filters
            {(search || cityFilter !== "all" || industryFilter !== "all" || serviceFilter !== "all" || fromDate || toDate) && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "var(--admin-accent-dim)", color: "var(--admin-accent)" }}>
                Active
              </span>
            )}
          </span>
          {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
        </button>
        {filtersOpen && (
          <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: "var(--admin-border)" }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--admin-text-muted)" }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, email, city…"
                    className="admin-input w-full rounded-lg py-2 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>City</label>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>Industry</label>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All industries</option>
                  {industries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--admin-text-muted)" }}>Service</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="admin-input w-full rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All services</option>
                  {services.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" style={{ color: "var(--admin-text-muted)" }} />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="admin-input rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-sm" style={{ color: "var(--admin-text-muted)" }}>–</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="admin-input rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--admin-border-hover)] hover:bg-[var(--admin-bg-elevated)]"
                style={{ borderColor: "var(--admin-border)", color: "var(--admin-text-muted)" }}
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Table */}
      <section
        className="rounded-md border overflow-hidden"
        style={{
          borderColor: "var(--admin-border)",
          background: "var(--admin-panel)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3 text-[10px] font-medium uppercase tracking-wider"
          style={{ borderColor: "var(--admin-border)", color: "var(--admin-text-muted)" }}
        >
          <span>Submissions</span>
          <span className="hidden sm:inline">
            Sorted by{" "}
            {sortKey === "created_at"
              ? "Submitted at"
              : sortKey === "name"
              ? "Name"
              : "Price"}{" "}
            ({sortDirection})
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 px-5 py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--admin-accent)" }} />
            <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
              Loading submissions…
            </p>
            <div className="w-full space-y-3 px-5 pb-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="admin-skeleton h-12 w-full" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-16">
            <AlertCircle className="h-10 w-10" style={{ color: "var(--admin-accent)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>
              {error}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-16">
            <Inbox className="h-12 w-12" style={{ color: "var(--admin-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
              No submissions match your filters.
            </p>
          </div>
        ) : (
          <>
            {/* ── MOBILE CARDS (below md) ── */}
            <div className="md:hidden divide-y" style={{ borderColor: "var(--admin-border)" }}>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-4"
                  style={{ borderBottomColor: "var(--admin-border)" }}
                >
                  {/* Top: name + email */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--admin-text)" }}>
                        {item.name}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--admin-text-muted)" }}>
                        {item.email}
                      </p>
                    </div>
                    {item.package_price_display && (
                      <span
                        className="shrink-0 text-sm font-semibold tabular-nums"
                        style={{ color: "var(--admin-text)" }}
                      >
                        {item.package_price_display}
                      </span>
                    )}
                  </div>

                  {/* Middle: label-value grid */}
                  <div
                    className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md px-3 py-2.5 mb-3"
                    style={{ background: "var(--admin-bg)", border: "1px solid var(--admin-border)" }}
                  >
                    {([
                      ["City", item.city],
                      ["Industry", item.industry],
                      ["Service", item.service],
                    ] as [string, string][]).map(([label, val]) => (
                      <div key={label}>
                        <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: "var(--admin-text-muted)" }}>
                          {label}
                        </p>
                        <p className="text-xs" style={{ color: "var(--admin-text)" }}>
                          {val || "—"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Bottom: date + actions */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] tabular-nums" style={{ color: "var(--admin-text-muted)" }}>
                      {formatDate(item.created_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => openDeleteConfirm(e, item.id)}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-50"
                        style={{ color: "var(--admin-text-muted)" }}
                        title="Delete"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/leads/${item.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          background: "var(--admin-accent)",
                          color: "#ffffff",
                        }}
                      >
                        View Lead
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── DESKTOP TABLE (md and up) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--admin-text-muted)", background: "var(--admin-bg)" }}
                  >
                    <th
                      className="cursor-pointer select-none px-4 py-2.5"
                      onClick={() => toggleSort("name")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Name
                        {sortKey === "name" ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" style={{ color: "var(--admin-accent)" }} />
                          ) : (
                            <ChevronDown className="h-3 w-3" style={{ color: "var(--admin-accent)" }} />
                          )
                        ) : (
                          <ChevronDown className="h-3 w-3 opacity-25" />
                        )}
                      </span>
                    </th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">City</th>
                    <th className="px-4 py-2.5">Industry</th>
                    <th className="px-4 py-2.5">Service</th>
                    <th
                      className="cursor-pointer select-none px-4 py-2.5 text-right"
                      onClick={() => toggleSort("package_price_display")}
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Price
                        {sortKey === "package_price_display" ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" style={{ color: "var(--admin-accent)" }} />
                          ) : (
                            <ChevronDown className="h-3 w-3" style={{ color: "var(--admin-accent)" }} />
                          )
                        ) : (
                          <ChevronDown className="h-3 w-3 opacity-25" />
                        )}
                      </span>
                    </th>
                    <th
                      className="cursor-pointer select-none px-4 py-2.5 text-right"
                      onClick={() => toggleSort("created_at")}
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Submitted
                        {sortKey === "created_at" ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" style={{ color: "var(--admin-accent)" }} />
                          ) : (
                            <ChevronDown className="h-3 w-3" style={{ color: "var(--admin-accent)" }} />
                          )
                        ) : (
                          <ChevronDown className="h-3 w-3 opacity-25" />
                        )}
                      </span>
                    </th>
                    <th className="w-10 px-4 py-2.5 text-right" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className="admin-table-row cursor-pointer transition-colors"
                      style={{
                        borderBottom: "1px solid var(--admin-border)",
                      }}
                      onClick={() => router.push(`/admin/leads/${item.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/admin/leads/${item.id}`);
                        }
                      }}
                    >
                      <td className="px-4 py-2 font-medium text-sm" style={{ color: "var(--admin-text)" }}>
                        {item.name}
                      </td>
                      <td className="px-4 py-2 text-xs" style={{ color: "var(--admin-text-muted)" }}>
                        {item.email}
                      </td>
                      <td className="px-4 py-2 text-sm" style={{ color: "var(--admin-text)" }}>
                        {item.city}
                      </td>
                      <td className="px-4 py-2 text-sm" style={{ color: "var(--admin-text)" }}>
                        {item.industry}
                      </td>
                      <td className="px-4 py-2 text-sm" style={{ color: "var(--admin-text)" }}>
                        {item.service}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-sm font-semibold" style={{ color: "var(--admin-text)" }}>
                        {item.package_price_display || "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-xs whitespace-nowrap" style={{ color: "var(--admin-text-muted)" }}>
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => openDeleteConfirm(e, item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex items-center justify-center rounded p-1.5 text-[var(--admin-text-muted)] hover:bg-[var(--admin-danger)]/10 hover:text-[var(--admin-danger)] disabled:opacity-50 disabled:pointer-events-none transition-colors"
                          title="Delete submission"
                          aria-label="Delete submission"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
