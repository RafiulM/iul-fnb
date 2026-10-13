import { sql } from "drizzle-orm";
import type { SalesReportDto } from "@starter/shared/fnb/api";
import type { SalesReportInput } from "@starter/shared/validators/fnb/reports";
import { db } from "../db";
import { addDays, CAFE_TIME_ZONE } from "../lib/fnb";

const TZ = sql.raw(`'${CAFE_TIME_ZONE}'`);

async function rows<T>(query: ReturnType<typeof sql>) {
  const result = await db.execute(query);
  return result.rows as T[];
}

/**
 * Sales for an inclusive cafe-local date range. Revenue counts finished
 * (SELESAI) orders only; one-day ranges are bucketed by hour, longer ones by day.
 */
export async function salesReport({
  from,
  to,
}: SalesReportInput): Promise<SalesReportDto> {
  const inRange = sql`o.business_date BETWEEN ${from}::date AND ${to}::date`;
  const done = sql`${inRange} AND o.status = 'SELESAI'`;
  const local = sql`(o.created_at AT TIME ZONE ${TZ})`;
  const bucket: "hour" | "day" = from === to ? "hour" : "day";

  const [summary] = await rows<{
    revenue: number;
    orders: number;
    cancelled: number;
  }>(sql`
    SELECT coalesce(sum(o.total_amount) FILTER (WHERE o.status = 'SELESAI'), 0)::bigint::float8 AS revenue,
           count(*) FILTER (WHERE o.status = 'SELESAI')::int AS orders,
           count(*) FILTER (WHERE o.status = 'DIBATALKAN')::int AS cancelled
    FROM orders o WHERE ${inRange}`);

  const seriesRows = await rows<{
    bucket: string;
    revenue: number;
    orders: number;
  }>(
    bucket === "hour"
      ? sql`SELECT to_char(${local}, 'YYYY-MM-DD"T"HH24') AS bucket,
                   sum(o.total_amount)::float8 AS revenue, count(*)::int AS orders
            FROM orders o WHERE ${done} GROUP BY 1`
      : sql`SELECT to_char(o.business_date, 'YYYY-MM-DD') AS bucket,
                   sum(o.total_amount)::float8 AS revenue, count(*)::int AS orders
            FROM orders o WHERE ${done} GROUP BY 1`,
  );
  const seriesBy = new Map(seriesRows.map((r) => [r.bucket, r]));
  const keys: string[] = [];
  if (bucket === "hour")
    for (let h = 0; h < 24; h++)
      keys.push(`${from}T${String(h).padStart(2, "0")}`);
  else for (let d = from; d <= to; d = addDays(d, 1)) keys.push(d);
  const series = keys.map((key) => ({
    bucket: key,
    revenue: seriesBy.get(key)?.revenue ?? 0,
    orders: seriesBy.get(key)?.orders ?? 0,
  }));

  const topMenus = await rows<SalesReportDto["topMenus"][number]>(sql`
    SELECT oi.menu_id AS "menuId",
           (array_agg(oi.name ORDER BY o.created_at DESC))[1] AS name,
           (array_agg(oi.image_url ORDER BY o.created_at DESC))[1] AS "imageUrl",
           sum(oi.qty)::int AS qty,
           sum(oi.qty * oi.price)::float8 AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE ${done}
    GROUP BY oi.menu_id, CASE WHEN oi.menu_id IS NULL THEN oi.name END
    ORDER BY qty DESC, revenue DESC
    LIMIT 5`);

  const [{ totalQty } = { totalQty: 0 }] = await rows<{ totalQty: number }>(sql`
    SELECT coalesce(sum(oi.qty), 0)::int AS "totalQty"
    FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE ${done}`);

  const splits = await rows<{
    kind: string;
    key: string;
    count: number;
    amount: number;
  }>(sql`
    SELECT 'payment' AS kind, o.payment_method AS key, count(*)::int AS count,
           sum(o.total_amount)::float8 AS amount
    FROM orders o WHERE ${done} AND o.payment_method IS NOT NULL GROUP BY 2
    UNION ALL
    SELECT 'source', o.order_type, count(*)::int, sum(o.total_amount)::float8
    FROM orders o WHERE ${done} GROUP BY 2`);
  const split = (kind: string, key: string) => {
    const r = splits.find((s) => s.kind === kind && s.key === key);
    return { count: r?.count ?? 0, amount: r?.amount ?? 0 };
  };

  const heatmap = await rows<{ dow: number; hour: number; orders: number }>(sql`
    SELECT extract(dow FROM ${local})::int AS dow,
           extract(hour FROM ${local})::int AS hour,
           count(*)::int AS orders
    FROM orders o WHERE ${done} GROUP BY 1, 2 ORDER BY 1, 2`);

  const dailyRows = await rows<SalesReportDto["daily"][number]>(sql`
    SELECT to_char(o.business_date, 'YYYY-MM-DD') AS date,
           count(*)::int AS orders,
           sum(o.total_amount)::float8 AS revenue,
           coalesce(sum(o.total_amount) FILTER (WHERE o.payment_method = 'CASH'), 0)::float8 AS cash,
           coalesce(sum(o.total_amount) FILTER (WHERE o.payment_method = 'NON_CASH'), 0)::float8 AS "nonCash"
    FROM orders o WHERE ${done} GROUP BY 1 ORDER BY 1`);

  const s = summary ?? { revenue: 0, orders: 0, cancelled: 0 };
  return {
    from,
    to,
    timeZone: CAFE_TIME_ZONE,
    summary: {
      revenue: s.revenue,
      orders: s.orders,
      averageOrder: s.orders ? Math.round(s.revenue / s.orders) : 0,
      cancelled: s.cancelled,
    },
    bucket,
    series,
    topMenus,
    totalQty,
    payment: {
      CASH: split("payment", "CASH"),
      NON_CASH: split("payment", "NON_CASH"),
    },
    source: { QR: split("source", "QR"), MANUAL: split("source", "MANUAL") },
    heatmap,
    daily: dailyRows,
  };
}
