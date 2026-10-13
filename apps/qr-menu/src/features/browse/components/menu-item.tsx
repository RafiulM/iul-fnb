import { Plus } from "lucide-react";
import { rp } from "@starter/shared/fnb/domain";
import type { MenuDto } from "@starter/shared/fnb/types";

type Props = {
  menu: MenuDto;
  /** Portions of this menu already in the cart. */
  qty: number;
  /** Popular strip: no tags, no description. */
  compact?: boolean;
  /** Ordering is off (cafe closed / browse-only). */
  blocked: boolean;
  onOpen: (id: string) => void;
  onAdd: (id: string) => void;
};

/** One menu tile: opens the detail page, plus a quick "add one" button (design itemBody). */
export function MenuItemBody({
  menu: m,
  qty,
  compact,
  blocked,
  onOpen,
  onAdd,
}: Props) {
  return (
    <>
      <button
        type="button"
        className="pl-item-main"
        data-open={m.id}
        aria-label={`${m.name}, ${rp(m.price)}${m.isAvailable ? "" : ", habis"}${qty ? `, ${qty} di keranjang` : ""}. Lihat detail`}
        onClick={() => onOpen(m.id)}
      >
        <span className="pl-thumb" aria-hidden="true">
          {m.imageUrl}
          {qty ? <span className="pl-qty">{qty}</span> : null}
        </span>
        <span className="pl-info">
          {!compact && m.tags.length ? (
            <span className="pl-tags">
              {m.tags.map((t) => (
                <span key={t} className="pl-tag">
                  {t}
                </span>
              ))}
            </span>
          ) : null}
          <span className="pl-name">{m.name}</span>
          {compact ? null : <span className="pl-desc">{m.description}</span>}
          <span className="pl-price">{rp(m.price)}</span>
        </span>
      </button>
      {m.isAvailable ? (
        <button
          type="button"
          className="pl-add"
          data-add={m.id}
          aria-disabled={blocked ? "true" : undefined}
          aria-label={
            blocked
              ? `Tambah ${m.name} — tidak tersedia, kafe sedang tutup`
              : `Tambah ${m.name} ke keranjang`
          }
          onClick={() => onAdd(m.id)}
        >
          <Plus aria-hidden="true" style={{ fontSize: 18 }} />
        </button>
      ) : (
        <button
          type="button"
          className="pl-chip pl-sold"
          data-tone="danger"
          data-add={m.id}
          aria-disabled="true"
          aria-label={`${m.name} habis — tidak bisa ditambahkan`}
          onClick={() => onAdd(m.id)}
        >
          Habis
        </button>
      )}
    </>
  );
}
