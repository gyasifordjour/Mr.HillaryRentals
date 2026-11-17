import { useState } from "react";
import { BadgeInfo, CalendarDays, CircleDollarSign, ReceiptText } from "@/components/ui/Iconly";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDemoWorkflows } from "@/features/demo/DemoWorkflowProvider";
import { formatGHS } from "@/lib/utils";
import { useMocks } from "@/lib/supabase";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const { payments, markPaymentPaid } = useDemoWorkflows();
  const [error, setError] = useState("");
  const records = payments.filter((payment) => payment.farmer_id === user?.id).sort((a, b) => b.date.localeCompare(a.date));
  const paidTotal = records.filter((payment) => payment.status === "paid").reduce((total, payment) => total + payment.amount, 0);
  const dueTotal = records.filter((payment) => payment.status === "due").reduce((total, payment) => total + payment.amount, 0);

  const markPaid = async (paymentId: string) => {
    setError("");
    try {
      await markPaymentPaid(paymentId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The sample payment could not be updated.");
    }
  };

  return (
    <div>
      <header className="dash-page-head">
        <div>
          <span className="dash-page-eyebrow">ACCOUNT SUMMARY</span>
          <h1>Payments</h1>
          <p>{useMocks ? "Review sample rental charges and payment records." : "Review recorded rental charges and payment history."}</p>
        </div>
      </header>

      <section className="dash-stats dash-stats-3" aria-label="Payment summary">
        <article className="dash-stat-card"><div className="dash-stat-top">{useMocks ? "Sample payments made" : "Payments made"}<span className="dash-stat-icon"><CircleDollarSign size={17} /></span></div><strong>{formatGHS(paidTotal)}</strong><small>{useMocks ? "Illustrative records only" : "Verified payment records"}</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">{useMocks ? "Sample amount due" : "Amount due"}<span className="dash-stat-icon"><CalendarDays size={17} /></span></div><strong>{formatGHS(dueTotal)}</strong><small>No payment is collected here</small></article>
        <article className="dash-stat-card"><div className="dash-stat-top">Records<span className="dash-stat-icon"><ReceiptText size={17} /></span></div><strong>{records.length}</strong><small>{useMocks ? "Rental charge examples" : "Payment history"}</small></article>
      </section>

      <section className="dash-panel">
        <div className="dash-panel-head"><h2>Payment history</h2><span className={`dash-badge ${useMocks ? "amber" : "green"}`}>{useMocks ? "SAMPLE DATA" : "PAYMENTS"}</span></div>
        {error && <p className="dash-form-error" role="alert">{error}</p>}
        {records.length ? <div className="dash-payment-list">
          {records.map((payment) => (
            <article className="dash-payment-card" key={payment.id}>
              <span className="dash-service-icon"><ReceiptText size={18} /></span>
              <div className="dash-payment-description">
                <strong>{payment.description}</strong>
                <span>Rental {payment.rental_id.toUpperCase()} · {formatDate(payment.date)} · Ref {payment.reference}</span>
              </div>
              <strong className="dash-payment-amount">{formatGHS(payment.amount)}</strong>
              <span className={`dash-badge ${payment.status === "paid" ? "green" : "amber"}`}>{useMocks ? `${payment.status === "paid" ? "Paid" : "Due"} · sample` : payment.status === "paid" ? "Paid" : "Due"}</span>
              {useMocks && payment.status === "due" && <button type="button" className="dash-secondary-button" onClick={() => void markPaid(payment.id)}>Mark paid (demo)</button>}
              <details className="dash-payment-receipt">
                <summary>Receipt details</summary>
                <p>{useMocks ? "Sample record only. " : ""}Reference: {payment.reference}.{useMocks ? " This is not a tax invoice or proof of a real transaction." : ""}</p>
              </details>
            </article>
          ))}
        </div> : <div className="dash-empty"><span className="dash-empty-icon"><ReceiptText size={20} /></span><strong>{useMocks ? "No payment examples for this account" : "No payments recorded"}</strong><p>Payment history will appear here when a payment provider is connected.</p></div>}
      </section>

      <aside className="dash-service-notice">
        <BadgeInfo size={18} />
        <div><strong>No payment provider is connected</strong><p>{useMocks ? "Amounts and status are illustrative. This page does not collect, transfer, or verify money; demo changes clear on reload." : "This page does not collect or verify money. Payment records will be added after a trusted provider integration is configured."}</p></div>
      </aside>
      {useMocks && <p className="dash-demo-note">Do not use these sample records as invoices, balances owed, or evidence of payment.</p>}
    </div>
  );
}
