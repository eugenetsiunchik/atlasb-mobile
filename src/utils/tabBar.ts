export const CURVED_TAB_BAR_HEIGHT = 66;
export const CURVED_TAB_BAR_CONTENT_GAP = 24;

export function getBottomTabContentPadding(bottomInset: number) {
  return bottomInset + CURVED_TAB_BAR_HEIGHT + CURVED_TAB_BAR_CONTENT_GAP;
}
