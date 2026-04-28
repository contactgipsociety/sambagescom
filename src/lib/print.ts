import type { InvoiceDoc, Party } from "./types";
import { xof, dateFr, docTotals } from "./format";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const openPrint = (html: string) => {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 350);
};

const baseStyle = `
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;margin:0;padding:24px}
  h1{margin:0;font-size:22px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #e5e7eb}
  th{background:#f3f4f6;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  .right{text-align:right}
  .totals{margin-top:14px;width:300px;margin-left:auto;font-size:13px}
  .totals div{display:flex;justify-content:space-between;padding:4px 0}
  .totals .ttc{border-top:2px solid #111;font-weight:700;font-size:15px;margin-top:6px;padding-top:8px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:14px}
  .muted{color:#6b7280;font-size:12px}
  .badge{display:inline-block;padding:3px 8px;border-radius:4px;background:#f3f4f6;font-size:11px;text-transform:uppercase}
`;

export const printInvoice = (doc: InvoiceDoc, party?: Party, company = { name: "Mon Entreprise", address: "Dakar, Sénégal", ninea: "" }) => {
  const t = docTotals(doc);
  const titre = doc.kind === "facture" ? "FACTURE" : doc.kind === "devis" ? "DEVIS" : "BON D'ACHAT";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${titre} ${doc.number}</title><style>${baseStyle}</style></head><body>
    <div class="head">
      <div>
        <h1>${escapeHtml(company.name)}</h1>
        <div class="muted">${escapeHtml(company.address)}${company.ninea ? " · NINEA " + escapeHtml(company.ninea) : ""}</div>
      </div>
      <div style="text-align:right">
        <div class="badge">${titre}</div>
        <div style="font-size:18px;font-weight:700;margin-top:6px">${escapeHtml(doc.number)}</div>
        <div class="muted">Date : ${dateFr(doc.date)}</div>
        ${doc.dueDate ? `<div class="muted">Échéance : ${dateFr(doc.dueDate)}</div>` : ""}
      </div>
    </div>
    <div style="margin-top:18px">
      <div class="muted">${doc.kind === "achat" ? "Fournisseur" : "Client"}</div>
      <div style="font-weight:600;font-size:15px">${escapeHtml(party?.name ?? "—")}</div>
      ${party?.address ? `<div class="muted">${escapeHtml(party.address)}</div>` : ""}
      ${party?.phone ? `<div class="muted">Tél : ${escapeHtml(party.phone)}</div>` : ""}
      ${party?.ninea ? `<div class="muted">NINEA : ${escapeHtml(party.ninea)}</div>` : ""}
    </div>
    <table>
      <thead><tr><th>Désignation</th><th class="right">Qté</th><th class="right">PU HT</th><th class="right">TVA</th><th class="right">Total HT</th></tr></thead>
      <tbody>
      ${doc.lines.map((l) => `<tr>
        <td>${escapeHtml(l.description)}</td>
        <td class="right">${l.quantity}</td>
        <td class="right">${xof(l.unitPriceHT)}</td>
        <td class="right">${l.tvaRate}%</td>
        <td class="right">${xof(l.quantity * l.unitPriceHT)}</td>
      </tr>`).join("")}
      </tbody>
    </table>
    <div class="totals">
      <div><span>Total HT</span><span>${xof(t.ht)}</span></div>
      <div><span>TVA</span><span>${xof(t.tva)}</span></div>
      <div class="ttc"><span>Total TTC</span><span>${xof(t.ttc)}</span></div>
    </div>
    ${doc.notes ? `<div style="margin-top:24px;font-size:12px;color:#374151"><strong>Notes :</strong><br>${escapeHtml(doc.notes)}</div>` : ""}
    <div style="margin-top:40px;text-align:center;font-size:11px;color:#9ca3af">Merci pour votre confiance.</div>
  </body></html>`;
  openPrint(html);
};

export const printTicket = (doc: InvoiceDoc, party?: Party, company = { name: "Mon Entreprise", address: "Dakar, Sénégal" }) => {
  const t = docTotals(doc);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${doc.number}</title>
  <style>
    @page{size:80mm auto;margin:4mm}
    body{font-family:'Courier New',monospace;width:72mm;margin:0;color:#000;font-size:12px}
    .c{text-align:center}.r{text-align:right}.b{font-weight:700}
    hr{border:none;border-top:1px dashed #000;margin:6px 0}
    table{width:100%;border-collapse:collapse;font-size:11px}
    td{padding:1px 0;vertical-align:top}
  </style></head><body>
    <div class="c b" style="font-size:14px">${escapeHtml(company.name)}</div>
    <div class="c">${escapeHtml(company.address)}</div>
    <hr>
    <div>Ticket: <span class="b">${escapeHtml(doc.number)}</span></div>
    <div>Date: ${dateFr(doc.date)} ${new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>
    ${party ? `<div>Client: ${escapeHtml(party.name)}</div>` : ""}
    <hr>
    <table>
      ${doc.lines.map((l) => `
        <tr><td colspan="2">${escapeHtml(l.description)}</td></tr>
        <tr><td>${l.quantity} x ${xof(l.unitPriceHT)}</td><td class="r">${xof(l.quantity * l.unitPriceHT)}</td></tr>
      `).join("")}
    </table>
    <hr>
    <table>
      <tr><td>Total HT</td><td class="r">${xof(t.ht)}</td></tr>
      <tr><td>TVA</td><td class="r">${xof(t.tva)}</td></tr>
      <tr><td class="b" style="font-size:14px">TOTAL</td><td class="r b" style="font-size:14px">${xof(t.ttc)}</td></tr>
    </table>
    <hr>
    <div class="c">Merci de votre visite !</div>
    <div class="c" style="margin-top:4px;font-size:10px">${doc.number}</div>
  </body></html>`;
  openPrint(html);
};
