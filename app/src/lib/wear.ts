// Closet, Sort and Worth only show things you wear. Same list as the value-items function.
export const WEAR = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories"];
// Things the reader sometimes files under accessories or bags that you don't wear.
export const NOT_WEAR = /\b(i?pad|iphone|phone|tablet|laptop|kindle)\b.*\b(case|cover|stand|sleeve)\b|\b(case|cover) for\b|adapter|charger|cable|key ?card|compression bags?|packing cubes?|vacuum bags?|luggage tags?/i;
