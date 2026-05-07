export function getItemIcon(type?: string) {
  switch (type) {
    case "boost":
      return "/icons/xp_potion_hd.png";

    case "utility":
      return "/icons/default_chip.png";

    case "resource":
      return "/icons/default_scroll.png";

    default:
      return "/icons/default_item.png";
  }
}