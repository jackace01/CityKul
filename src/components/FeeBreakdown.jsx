// src/components/FeeBreakdown.jsx
export default function FeeBreakdown({
  rent = 0,
  deposit = 0,
  platformFee = 0,
  fixedFee = 0,
}) {
  const totalPay = Number(rent || 0) + Number(deposit || 0) + Number(platformFee || 0) + Number(fixedFee || 0);

  const Row = ({ label, value, bold }) => (
    <div className={`flex items-center justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>₹ {Number(value || 0).toLocaleString()}</span>
    </div>
  );

  return (
    <div className="rounded-lg ring-1 ring-[var(--color-border)] p-3 bg-[var(--color-surface)]">
      <div className="font-semibold mb-2">Fee Breakdown</div>
      <div className="space-y-1">
        <Row label="Rent" value={rent} />
        <Row label="Refundable deposit (escrow)" value={deposit} />
        <Row label="Platform fee" value={platformFee} />
        <Row label="Booking fee" value={fixedFee} />
        <div className="pt-2 border-t border-[var(--color-border)]" />
        <Row label="You pay now" value={totalPay} bold />
        <div className="text-[11px] text-[var(--color-muted)] mt-1">
          Note: Deposit & rent are escrowed until release. Fees are non-refundable once paid.
        </div>
      </div>
    </div>
  );
}
