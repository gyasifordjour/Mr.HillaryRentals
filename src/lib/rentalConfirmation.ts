import { formatGHS } from "@/lib/utils";

export interface RentalConfirmationDetails {
  reference: string;
  farmerName: string;
  farmerEmail: string | null;
  farmerPhone: string | null;
  farmName: string;
  farmLocation: string;
  rooms: { roomNumber: number; monthlyPrice: number }[];
  startDate: string;
  endDate: string;
  pigCount?: number;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function openRentalConfirmation(details: RentalConfirmationDetails) {
  const printWindow = window.open("", "_blank", "popup,width=900,height=1100");
  if (!printWindow) return false;

  const rooms = details.rooms.map((room) => `
    <tr>
      <td>Room ${String(room.roomNumber).padStart(2, "0")}</td>
      <td>${formatGHS(room.monthlyPrice)} / month</td>
    </tr>
  `).join("");
  const monthlyTotal = details.rooms.reduce((total, room) => total + room.monthlyPrice, 0);
  const issuedOn = new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Rental confirmation ${escapeHtml(details.reference)}</title>
      <style>
        @page { size: A4; margin: 18mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f3f5f1; color: #233327; font: 14px/1.5 Arial, sans-serif; }
        .sheet { width: min(100% - 32px, 780px); margin: 32px auto; padding: 54px 58px; background: #fff; box-shadow: 0 12px 40px #18271b1a; }
        .toolbar { display: flex; justify-content: flex-end; margin-bottom: 30px; }
        .toolbar button { border: 0; border-radius: 6px; padding: 11px 16px; background: #315b3b; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
        .brand { display: flex; justify-content: space-between; gap: 20px; padding-bottom: 24px; border-bottom: 2px solid #315b3b; }
        .brand-name { color: #315b3b; font-size: 15px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .issued { color: #718071; font-size: 12px; text-align: right; }
        h1 { margin: 34px 0 8px; color: #26382a; font-size: 30px; font-weight: 600; letter-spacing: -.03em; }
        .intro { margin: 0 0 28px; color: #697769; }
        .reference { display: inline-block; margin-bottom: 25px; padding: 7px 10px; border: 1px solid #e4eae1; border-radius: 5px; color: #536653; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
        .section-title { margin: 25px 0 10px; color: #536653; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 28px; padding: 18px; border: 1px solid #e7ece5; border-radius: 7px; }
        .details div { min-width: 0; }
        .details span { display: block; margin-bottom: 4px; color: #899487; font-size: 10px; }
        .details strong { overflow-wrap: anywhere; color: #344638; font-size: 13px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px 10px; border-bottom: 1px solid #e8ece6; text-align: left; }
        th { color: #7d897a; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
        td { color: #405041; font-size: 12px; }
        .total { display: flex; justify-content: flex-end; gap: 20px; padding: 15px 10px; color: #526250; font-size: 12px; }
        .total strong { color: #315b3b; font-size: 14px; }
        .notice { margin-top: 30px; padding: 15px 17px; border-left: 3px solid #789370; background: #f5f8f2; color: #647261; font-size: 11px; line-height: 1.6; }
        footer { margin-top: 38px; padding-top: 14px; border-top: 1px solid #e8ece6; color: #899387; font-size: 10px; }
        @media (max-width: 600px) { .sheet { padding: 28px 22px; } .details { grid-template-columns: 1fr; } }
        @media print { body { background: #fff; } .sheet { width: auto; margin: 0; padding: 0; box-shadow: none; } .toolbar { display: none; } }
      </style>
    </head>
    <body>
      <main class="sheet">
        <div class="toolbar"><button onclick="window.print()" type="button">Print or save as PDF</button></div>
        <header class="brand">
          <div class="brand-name">Trinity Integrated Farms</div>
          <div class="issued">Issued ${escapeHtml(issuedOn)}<br>Rental status: Confirmed</div>
        </header>
        <h1>Rental confirmation</h1>
        <p class="intro">This document confirms the active rental details recorded by Trinity Integrated Farms.</p>
        <div class="reference">REFERENCE ${escapeHtml(details.reference.toUpperCase())}</div>
        <h2 class="section-title">Farmer &amp; farm</h2>
        <section class="details">
          <div><span>Farmer</span><strong>${escapeHtml(details.farmerName)}</strong></div>
          <div><span>Farm</span><strong>${escapeHtml(details.farmName)}</strong></div>
          <div><span>Email</span><strong>${escapeHtml(details.farmerEmail || "Not provided")}</strong></div>
          <div><span>Location</span><strong>${escapeHtml(details.farmLocation)}</strong></div>
          <div><span>Phone</span><strong>${escapeHtml(details.farmerPhone || "Not provided")}</strong></div>
          ${details.pigCount === undefined ? "" : `<div><span>Number of pigs</span><strong>${details.pigCount}</strong></div>`}
        </section>
        <h2 class="section-title">Rental period</h2>
        <section class="details">
          <div><span>Start date</span><strong>${escapeHtml(details.startDate)}</strong></div>
          <div><span>End date</span><strong>${escapeHtml(details.endDate)}</strong></div>
        </section>
        <h2 class="section-title">Assigned rooms &amp; monthly rates</h2>
        <table>
          <thead><tr><th>Room</th><th>Monthly rate</th></tr></thead>
          <tbody>${rooms || "<tr><td colspan=\"2\">No room assigned</td></tr>"}</tbody>
        </table>
        ${details.rooms.length > 1 ? `<div class="total"><span>Total monthly rate</span><strong>${formatGHS(monthlyTotal)}</strong></div>` : ""}
        <p class="notice">This confirmation is not a rent receipt or proof of payment, and it is not a substitute for a signed tenancy agreement. Refer to the signed agreement for binding terms.</p>
        <footer>Generated from the rental record in FarmRent. Contact the farm administrator if any listed detail is incorrect.</footer>
      </main>
    </body>
  </html>`;

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 300);
  return true;
}
