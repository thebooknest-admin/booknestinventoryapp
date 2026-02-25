'use client';

import { Printer } from 'lucide-react';
import { colors, typography, spacing, radii } from '@/styles/tokens';

interface Address {
  name: string;
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string | null;
}

interface PrintLabelButtonProps {
  fromAddress: Address;
  toAddress: Address;
  orderNumber?: string;
}

function formatAddress(addr: Address): string {
  const lines = [
    addr.name,
    addr.street,
    addr.street2 || '',
    `${addr.city}, ${addr.state} ${addr.zip}`,
    addr.country && addr.country !== 'US' ? addr.country : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export default function PrintLabelButton({
  fromAddress,
  toAddress,
  orderNumber,
}: PrintLabelButtonProps) {
  function handlePrint() {
    const fromLines = formatAddress(fromAddress);
    const toLines = formatAddress(toAddress);

    // Build a 4x6 shipping label layout for thermal printers
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Shipping Label${orderNumber ? ` — ${orderNumber}` : ''}</title>
  <style>
    @page {
      size: 4in 6in;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 4in;
      height: 6in;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      padding: 0.25in;
      display: flex;
      flex-direction: column;
    }
    .from-section {
      font-size: 9pt;
      line-height: 1.4;
      padding-bottom: 0.15in;
      border-bottom: 1px solid #999;
      margin-bottom: 0.2in;
    }
    .from-label {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
      margin-bottom: 2pt;
    }
    .to-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding-left: 0.4in;
    }
    .to-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
      margin-bottom: 4pt;
    }
    .to-address {
      font-size: 14pt;
      font-weight: bold;
      line-height: 1.5;
      white-space: pre-line;
    }
    .footer {
      border-top: 1px solid #999;
      padding-top: 0.1in;
      font-size: 7pt;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="from-section">
    <div class="from-label">From</div>
    <div style="white-space: pre-line;">${escapeHtml(fromLines)}</div>
  </div>

  <div class="to-section">
    <div class="to-label">Ship to</div>
    <div class="to-address">${escapeHtml(toLines)}</div>
  </div>

  <div class="footer">
    <span>The Book Nest</span>
    ${orderNumber ? `<span>Order: ${escapeHtml(orderNumber)}</span>` : ''}
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert('Please allow popups to print shipping labels.');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to render, then trigger print
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.sm} ${spacing.md}`,
        backgroundColor: colors.surface,
        color: colors.primary,
        border: `2px solid ${colors.primary}`,
        borderRadius: radii.sm,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <Printer size={16} />
      Print label
    </button>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}