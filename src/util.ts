import findDOMNode from 'rc-util/lib/Dom/findDOMNode';

/**
 * Our algorithm have additional one ghost item
 * whose index as `dataSource.length` to simplify the calculation
 */
export const GHOST_ITEM_KEY = '__rc_ghost_item__';

interface LocationItemResult {
  /** Located item index */
  index: number;
  /** Current item display baseline related with current container baseline */
  offsetPtg: number;
}

/**
 * Get location item and its align percentage with the scroll percentage.
 * We should measure current scroll position to decide which item is the location item.
 * And then fill the top count and bottom count with the base of location item.
 *
 * `total` should be the real count instead of `total - 1` in calculation.
 */
function getLocationItem(scrollPtg: number, total: number): LocationItemResult {
  const itemIndex = Math.floor(scrollPtg * total);
  const itemTopPtg = itemIndex / total;
  const itemBottomPtg = (itemIndex + 1) / total;
  const itemOffsetPtg = (scrollPtg - itemTopPtg) / (itemBottomPtg - itemTopPtg);

  return {
    index: itemIndex,
    offsetPtg: itemOffsetPtg,
  };
}

export function getScrollPercentage({
  scrollTop,
  scrollHeight,
  clientHeight,
}: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}): number {
  if (scrollHeight <= clientHeight) {
    return 0;
  }

  const scrollTopPtg = scrollTop / (scrollHeight - clientHeight);
  return scrollTopPtg;
}

export function getElementScrollPercentage(element: HTMLElement | null) {
  if (!element) {
    return 0;
  }

  return getScrollPercentage(element);
}

/**
 * Get node `offsetHeight`. We prefer node is a dom element directly.
 * But if not provided, downgrade to `findDOMNode` to get the real dom element.
 */
export function getNodeHeight(node: HTMLElement) {
  if (!node) {
    return 0;
  }

  return findDOMNode(node).offsetHeight;
}

/**
 * Get display items start, end, located item index. This is pure math calculation
 */
export function getRangeIndex(scrollPtg: number, itemCount: number, visibleCount: number) {
  const { index, offsetPtg } = getLocationItem(scrollPtg, itemCount);

  const beforeCount = Math.ceil(scrollPtg * visibleCount);
  const afterCount = Math.ceil((1 - scrollPtg) * visibleCount);

  return {
    itemIndex: index,
    itemOffsetPtg: offsetPtg,
    startIndex: Math.max(0, index - beforeCount),
    endIndex: Math.min(itemCount - 1, index + afterCount),
  };
}

interface ItemTopConfig {
  itemIndex: number;
  itemElementHeights: { [key: string]: number };
  itemOffsetPtg: number;

  scrollTop: number;
  scrollPtg: number;
  clientHeight: number;

  getItemKey: (index: number) => string;
}

/**
 * Calculate the located item related top with current window height
 */
export function getItemRelativeTop({
  itemIndex,
  itemOffsetPtg,
  itemElementHeights,
  scrollPtg,
  clientHeight,
  getItemKey,
}: Omit<ItemTopConfig, 'scrollTop'>) {
  const locatedItemHeight = itemElementHeights[getItemKey(itemIndex)] || 0;
  const locatedItemTop = scrollPtg * clientHeight;
  const locatedItemOffset = itemOffsetPtg * locatedItemHeight;
  return locatedItemTop - locatedItemOffset;
}

/**
 * Calculate the located item absolute top with whole scroll height
 */
export function getItemAbsoluteTop({ scrollTop, ...rest }: ItemTopConfig) {
  return scrollTop + getItemRelativeTop(rest);
}

interface CompareItemConfig {
  locatedItemRelativeTop: number;
  locatedItemIndex: number;
  compareItemIndex: number;
  getItemKey: (index: number) => string;
  startIndex: number;
  endIndex: number;
  itemElementHeights: { [key: string]: number };
}

export function getCompareItemRelativeTop({
  locatedItemRelativeTop,
  locatedItemIndex,
  compareItemIndex,
  startIndex,
  endIndex,
  getItemKey,
  itemElementHeights,
}: CompareItemConfig) {
  let originCompareItemTop: number = locatedItemRelativeTop;
  const compareItemKey = getItemKey(compareItemIndex);

  if (compareItemIndex <= locatedItemIndex) {
    for (let index = locatedItemIndex; index >= startIndex; index -= 1) {
      const key = getItemKey(index);
      if (key === compareItemKey) {
        break;
      }

      const prevItemKey = getItemKey(index - 1);
      originCompareItemTop -= itemElementHeights[prevItemKey] || 0;
    }
  } else {
    for (let index = locatedItemIndex; index <= endIndex; index += 1) {
      const key = getItemKey(index);
      if (key === compareItemKey) {
        break;
      }

      originCompareItemTop += itemElementHeights[key] || 0;
    }
  }

  return originCompareItemTop;
}
