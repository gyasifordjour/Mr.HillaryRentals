import { ArrowUpRight, ChevronLeft, ChartColumn, Clock3, TrendingUp } from "@/components/ui/Iconly";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { formatGHS } from "@/lib/utils";

const periods = ["Week", "Month", "Quarter", "6 month", "Year"] as const;
const periodMonths: Record<(typeof periods)[number], number> = {
  Week: 1,
  Month: 1,
  Quarter: 3,
  "6 month": 6,
  Year: 12,
};

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profiles, rentals, rentalRooms, rooms, payments } = useDemoWorkflows();
  const [period, setPeriod] = useState<(typeof periods)[number]>("Month");
  const today = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString("en-US", { month: "short" }), amount: 0 };
  });
  const activeRentals = rentals.filter((rental) => rental.status === "active");
  const monthlyRentalValue = activeRentals.reduce((total, rental) => total + rentalRooms
    .filter((link) => link.rental_id === rental.id)
    .reduce((roomTotal, link) => roomTotal + (rooms.find((room) => room.id === link.room_id)?.monthly_price ?? 0), 0), 0);

  payments.filter((payment) => payment.status === "paid").forEach((payment) => {
    const date = new Date(`${payment.date}T00:00:00`);
    const bucket = monthBuckets.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.amount += payment.amount;
  });
  if (!monthBuckets.some((bucket) => bucket.amount > 0) && monthlyRentalValue > 0) {
    monthBuckets[monthBuckets.length - 1].amount = monthlyRentalValue;
  }

  const rangeStart = new Date(today.getFullYear(), today.getMonth() - periodMonths[period] + 1, 1);
  const selectedTotal = payments
    .filter((payment) => payment.status === "paid" && new Date(`${payment.date}T00:00:00`) >= rangeStart)
    .reduce((total, payment) => total + payment.amount, 0) || monthlyRentalValue;
  const maxAmount = Math.max(...monthBuckets.map((bucket) => bucket.amount), 1);
  const selected = {
    total: formatGHS(selectedTotal),
    change: `${activeRentals.length} active`,
    bars: monthBuckets.map((bucket) => Math.max(bucket.amount ? (bucket.amount / maxAmount) * 100 : 8, 8)),
  };
  const farmers = profiles.filter((profile) => profile.role === "farmer");

  return (
    <div className="admin-analytics-page">
      <header className="admin-analytics-header">
        <button type="button" aria-label="Go back" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button>
        <h1>Analytics</h1>
        <button type="button" aria-label="Open sales history" onClick={() => toast.info("Sales history", "Detailed sales history will appear here.")}><Clock3 size={20} /></button>
      </header>

      <div className="admin-analytics-periods" role="tablist" aria-label="Analytics period">
        {periods.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={period === item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>
        ))}
      </div>

      <section className="admin-analytics-sales" aria-label="Sales summary">
        <div><strong>{selected.total}</strong><span>{selected.change}</span><TrendingUp size={14} /></div>
        <small>Overall sales</small>
      </section>

      <div className="admin-analytics-chart" aria-label={`${period} sales chart`}>
        {selected.bars.map((height, index) => (
          <div className={`admin-analytics-bar-column${monthBuckets[index].amount === maxAmount ? " highlighted" : ""}`} key={monthBuckets[index].key}>
            {monthBuckets[index].amount === maxAmount && <span className="admin-analytics-tooltip">{formatGHS(monthBuckets[index].amount)}</span>}
            <div className="admin-analytics-bar" style={{ height: `${height}%` }} />
            <small>{monthBuckets[index].label}</small>
          </div>
        ))}
      </div>

      <section className="admin-analytics-activity">
        <header><h2>Employee activity</h2><button type="button" onClick={() => navigate("/admin/farmers")}>View all</button></header>
        <div>
          {farmers.map((profile) => {
            const farmerRentals = rentals.filter((rental) => rental.farmer_id === profile.id);
            const assignedRooms = rentalRooms.filter((link) => farmerRentals.some((rental) => rental.id === link.rental_id)).length;
            const activeCount = farmerRentals.filter((rental) => rental.status === "active").length;
            const performance = rooms.length ? Math.round((assignedRooms / rooms.length) * 100) : 0;
            return (
              <button type="button" className="admin-analytics-employee" key={profile.id} onClick={() => navigate("/admin/farmers")}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" />
                  : <span>{profile.full_name.slice(0, 1)}</span>}
                <span className="admin-analytics-employee-copy"><strong>{profile.full_name}</strong><small>{activeCount} active rental{activeCount === 1 ? "" : "s"} · {assignedRooms} room{assignedRooms === 1 ? "" : "s"}</small></span>
                <b>{performance}% <ArrowUpRight size={15} /></b>
              </button>
            );
          })}
        </div>
      </section>

      <span className="admin-analytics-mobile-chart-icon" aria-hidden="true"><ChartColumn size={18} /></span>
    </div>
  );
}
