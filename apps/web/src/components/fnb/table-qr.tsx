import { QRCodeSVG } from "qrcode.react";
import { tableMenuUrl } from "@/lib/env";

/**
 * Scannable QR code for a table: encodes the full customer menu link
 * (`tableMenuUrl`), so any phone camera opens the table's menu.
 */
export function TableQr({
  code,
  size = 160,
  decorative = false,
}: {
  /** The table's QR token (`qrCode`). */
  code: string;
  size?: number;
  decorative?: boolean;
}) {
  return (
    <QRCodeSVG
      value={tableMenuUrl(code)}
      size={size}
      level="M"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#1D1E1C"
      shapeRendering="crispEdges"
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "QR code menu meja" })}
    />
  );
}
