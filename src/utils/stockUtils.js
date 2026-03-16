/**
 * stockUtils.js
 * Helpers for grouping duplicate stock entries and computing FIFO deductions.
 *
 * WHY:
 *  The same product (e.g. "TMR") may be purchased on different dates and stored
 *  as separate DB entries. In dropdowns these show as repeated entries.
 *  These helpers:
 *    1. Merge identical entries (same productName + same rate) into ONE virtual item
 *       that shows combined currentQty.
 *    2. Compute FIFO deduction splits so the oldest entry is drained first.
 */

/** Pick the cost-per-unit from a stock item (handles both field names). */
const getRate = (item) =>
  item?.openingRatePerUnit != null ? item.openingRatePerUnit : (item?.costPerUnit ?? 0);

/** Pick the database id from a stock item (handles _id and id). */
export const getStockId = (item) => item?._id ?? item?.id ?? null;

/**
 * Group stock items by productName + rate.
 *
 * Returns a new array where items sharing the same name & price become a
 * single virtual entry.  Properties of the merged entry:
 *   _id            – oldest (earliest purchaseDate) source item's _id
 *   currentQty     – sum of all source items' currentQty
 *   _isGrouped     – true (flag; false / absent on ungrouped items)
 *   _sourceItems   – original items sorted oldest → newest by purchaseDate
 *
 * Items that have no duplicate are returned unchanged.
 */
export const groupStocksByNameAndRate = (items) => {
  if (!Array.isArray(items) || items.length === 0) return items || [];

  const map = new Map();

  for (const item of items) {
    const name = (item.productName || '').trim().toLowerCase();
    // Multiply by 100 and round to avoid floating-point key collisions
    const rate = Math.round(getRate(item) * 100);
    // F-73 FIX: include category in key so products with same name+rate but
    // different categories (e.g. Feeding vs Medication) are not merged.
    const category = (item.category || '').trim().toLowerCase();
    const key = `${name}||${rate}||${category}`;

    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }

  const result = [];

  for (const group of map.values()) {
    if (group.length === 1) {
      // Single entry – no change needed
      result.push(group[0]);
      continue;
    }

    // Sort oldest → newest so FIFO works naturally
    const sorted = [...group].sort((a, b) => {
      const dA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
      const dB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
      return dA - dB;
    });

    const combinedQty = sorted.reduce(
      (sum, x) => sum + (Number(x.currentQty) || 0),
      0
    );

    // Merge: oldest item is the "representative", overriding only qty
    result.push({
      ...sorted[0],
      currentQty: combinedQty,
      _isGrouped: true,
      _sourceItems: sorted,
    });
  }

  return result;
};

/**
 * Build FIFO deduction list.
 *
 * Given a stock item (possibly grouped) and a total quantity to deduct,
 * returns [{id, quantity}] where oldest entries are drained first.
 *
 * @param {object} item        - A stock item (grouped or single)
 * @param {number} qtyNeeded   - Total quantity to deduct
 * @returns {{ id: string, quantity: number }[]}
 */
export const buildFifoDeductions = (item, qtyNeeded) => {
  if (!item || qtyNeeded <= 0) return [];

  const sources = item._isGrouped ? item._sourceItems : [item];
  let remaining = qtyNeeded;
  const result = [];

  for (const src of sources) {
    if (remaining <= 0) break;
    const available = Number(src.currentQty) || 0;
    if (available <= 0) continue;
    const deduct = Math.min(remaining, available);
    result.push({ id: getStockId(src), quantity: deduct });
    remaining -= deduct;
  }

  return result;
};

/**
 * Convenience: run FIFO deductions via stockAPI after a successful submit.
 *
 * @param {object} stockAPI     - The stockAPI service object
 * @param {object} item         - The grouped/single stock item
 * @param {number} qty          - Quantity to deduct
 * @param {string} reason       - Audit reason string
 */
export const deductStockFifo = async (stockAPI, item, qty, reason = 'Usage') => {
  const deductions = buildFifoDeductions(item, qty);
  await Promise.all(
    deductions.map((d) => stockAPI.adjustStock(d.id, d.quantity, 'deduct', reason))
  );
};
