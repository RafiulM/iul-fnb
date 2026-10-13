import {
  CircleCheck,
  Download,
  Minus,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import { fmtQty, stockStatus } from "@starter/shared/fnb/domain";
import type {
  IngredientDto,
  MenuDto,
  RecipeItemDto,
} from "@starter/shared/fnb/types";
import { Dialog } from "@/components/fnb/dialog";
import { joinList, r2, UNIT_NAME, when, type MoveGroup } from "../ledger";
import { StatusChip, StockBar } from "./stock-ui";

export function IngredientDrawer({
  ingredient,
  onClose,
  owner,
  menus,
  recipes,
  blocked,
  groups,
  now,
  onRecordIn,
  onEdit,
}: {
  /** null = closed. */
  ingredient: IngredientDto | null;
  onClose: () => void;
  owner: boolean;
  menus: MenuDto[];
  recipes: RecipeItemDto[];
  /** Ids of menus that cannot be sold right now. */
  blocked: string[];
  groups: MoveGroup[];
  now: number;
  onRecordIn: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <Dialog
      open={!!ingredient}
      onClose={onClose}
      kind="drawer"
      labelledBy="stok-d-title"
      data-part="drawer"
    >
      {ingredient ? (
        <DrawerContent
          i={ingredient}
          onClose={onClose}
          owner={owner}
          menus={menus}
          recipes={recipes}
          blocked={blocked}
          groups={groups}
          now={now}
          onRecordIn={onRecordIn}
          onEdit={onEdit}
        />
      ) : null}
    </Dialog>
  );
}

function DrawerContent({
  i,
  onClose,
  owner,
  menus,
  recipes,
  blocked,
  groups,
  now,
  onRecordIn,
  onEdit,
}: {
  i: IngredientDto;
  onClose: () => void;
  owner: boolean;
  menus: MenuDto[];
  recipes: RecipeItemDto[];
  blocked: string[];
  groups: MoveGroup[];
  now: number;
  onRecordIn: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const st = stockStatus(i);
  const uses = recipes.flatMap((r) => {
    const menu = menus.find((m) => m.id === r.menuId);
    return r.ingredientId === i.id && menu ? [{ r, menu }] : [];
  });
  const diff = r2(i.stockQty - i.minStock);
  const hit = uses.filter((u) => blocked.includes(u.menu.id));

  const moves = groups
    .flatMap((g) => {
      const line = g.lines.find((l) => l.ingredientId === i.id);
      return line ? [{ g, qty: line.qty }] : [];
    })
    .slice(0, 8);

  return (
    <>
      <div className="l-staf-dialog-head">
        <div>
          <span className="sk-eyebrow">Detail bahan</span>
          <h2 id="stok-d-title">{i.name}</h2>
          <p>
            Satuan {UNIT_NAME[i.unit]} ·{" "}
            {uses.length
              ? "dipakai di " + uses.length + " menu"
              : "belum dipakai di menu"}
          </p>
        </div>
        <button
          className="l-staf-iconbtn"
          type="button"
          aria-label="Tutup detail"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="l-staf-dialog-body">
        <div className="sk-hero">
          <div className="sk-hero-top">
            <span className="sk-eyebrow">Sisa stok sekarang</span>
            <StatusChip status={st} />
          </div>
          <div className="sk-big">{fmtQty(i.stockQty, i.unit)}</div>
          <StockBar ing={i} />
          <div className="sk-hero-meta">
            <span>
              Batas minimum <strong>{fmtQty(i.minStock, i.unit)}</strong>
            </span>
            {owner ? (
              <button
                type="button"
                className="sk-lnk"
                onClick={() => onEdit(i.id)}
              >
                Ubah batas
              </button>
            ) : null}
          </div>
        </div>

        {st === "HABIS" ? (
          <div className="l-staf-alert sk-note" data-tone="danger">
            <TriangleAlert aria-hidden="true" style={{ fontSize: 18 }} />
            <span>
              Stok habis.{" "}
              {hit.length
                ? joinList(hit.map((u) => u.menu.name)) +
                  " tidak bisa dipesan sampai bahan masuk."
                : "Catat bahan masuk saat barang datang."}
            </span>
          </div>
        ) : st === "MENIPIS" ? (
          <div className="l-staf-alert sk-note" data-tone="warning">
            <TriangleAlert aria-hidden="true" style={{ fontSize: 18 }} />
            <span>
              {diff < 0
                ? `Kurang ${fmtQty(-diff, i.unit)} dari batas minimum`
                : "Sudah menyentuh batas minimum"}{" "}
              — sebaiknya belanja hari ini.
            </span>
          </div>
        ) : (
          <div className="l-staf-alert sk-note" data-tone="positive">
            <CircleCheck aria-hidden="true" style={{ fontSize: 18 }} />
            <span>
              Masih aman, {fmtQty(diff, i.unit)} di atas batas minimum.
            </span>
          </div>
        )}

        <h3 className="sk-sec">Dipakai di</h3>
        {uses.length ? (
          <ul className="sk-uses">
            {uses.map(({ r, menu }) => {
              const n = Math.floor(i.stockQty / r.qtyUsed + 1e-9);
              return (
                <li key={r.id}>
                  <span className="l-staf-thumb" aria-hidden="true">
                    {menu.imageUrl}
                  </span>
                  <div className="sk-grow">
                    <strong>{menu.name}</strong>
                    <small>{fmtQty(r.qtyUsed, i.unit)} per porsi</small>
                  </div>
                  <div className="sk-est">
                    {n ? (
                      <span>
                        Cukup untuk{" "}
                        <strong>± {n.toLocaleString("id-ID")} porsi</strong>
                      </span>
                    ) : (
                      <strong>Tidak cukup 1 porsi</strong>
                    )}
                    {blocked.includes(menu.id) ? (
                      <StatusChip status="HABIS" label="Tidak bisa dipesan" />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="sk-faint">
            Bahan ini belum dipakai di resep menu mana pun, jadi tidak berkurang
            otomatis saat ada penjualan.
          </p>
        )}

        <h3 className="sk-sec">Pergerakan terakhir</h3>
        {moves.length ? (
          <ul className="sk-dmv">
            {moves.map(({ g, qty }) => {
              const isIn = g.dir === "in";
              return (
                <li key={g.key}>
                  <span
                    className="sk-mvi"
                    data-dir={isIn ? "in" : "out"}
                    aria-hidden="true"
                  >
                    {isIn ? (
                      <Plus style={{ fontSize: 14 }} />
                    ) : (
                      <Minus style={{ fontSize: 14 }} />
                    )}
                  </span>
                  <div className="sk-grow">
                    <strong>
                      <span className="sk-sr">
                        {isIn ? "Masuk" : "Keluar"}{" "}
                      </span>
                      {isIn ? "+" : "−"}
                      {fmtQty(qty, i.unit)}
                    </strong>
                    <small>
                      {(g.kind === "sale" ? g.title : g.note) ||
                        "Tanpa catatan"}
                    </small>
                  </div>
                  <span className="sk-mv-time">{when(g.createdAt, now)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="sk-faint">
            Belum ada pergerakan dalam 3 hari terakhir.
          </p>
        )}
      </div>
      <div className="l-staf-dialog-foot sk-drawer-foot">
        <button
          className="l-staf-btn"
          data-variant="primary"
          data-block=""
          type="button"
          onClick={() => onRecordIn(i.id)}
        >
          <Download aria-hidden="true" />
          Catat bahan masuk
        </button>
      </div>
    </>
  );
}
