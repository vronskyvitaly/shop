import {
  Apple,
  Baby,
  Backpack,
  Bike,
  BookOpen,
  Camera,
  Car,
  Coffee,
  CookingPot,
  Dumbbell,
  Flower2,
  Footprints,
  Gamepad2,
  Gem,
  Gift,
  Glasses,
  Headphones,
  Keyboard,
  Lamp,
  Laptop,
  Mouse,
  Package,
  PawPrint,
  Pill,
  Printer,
  Puzzle,
  Refrigerator,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Speaker,
  Tablet,
  Tv,
  WashingMachine,
  Watch,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

// Иконки-заглушки вместо фото товаров. Список совпадает с PRODUCT_ICONS на сервере (server/src/catalog/icons.ts).
// Когда появится S3, сюда добавится <img> с фото, а иконка останется запасным вариантом
const ICONS = {
  package: Package,
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  headphones: Headphones,
  tv: Tv,
  camera: Camera,
  watch: Watch,
  gamepad: Gamepad2,
  keyboard: Keyboard,
  mouse: Mouse,
  printer: Printer,
  speaker: Speaker,
  shirt: Shirt,
  footprints: Footprints,
  glasses: Glasses,
  gem: Gem,
  backpack: Backpack,
  baby: Baby,
  book: BookOpen,
  sofa: Sofa,
  lamp: Lamp,
  'cooking-pot': CookingPot,
  refrigerator: Refrigerator,
  'washing-machine': WashingMachine,
  dumbbell: Dumbbell,
  bike: Bike,
  car: Car,
  sparkles: Sparkles,
  pill: Pill,
  'paw-print': PawPrint,
  gift: Gift,
  coffee: Coffee,
  apple: Apple,
  wrench: Wrench,
  flower: Flower2,
  puzzle: Puzzle,
} satisfies Record<string, LucideIcon>;

export type ProductIconName = keyof typeof ICONS;
export const PRODUCT_ICONS = Object.keys(ICONS) as [ProductIconName, ...ProductIconName[]];

// Пастельный фон по имени иконки: карточки в сетке не сливаются в одну серую массу
const BACKGROUNDS = [
  'bg-blue-50',
  'bg-violet-50',
  'bg-amber-50',
  'bg-emerald-50',
  'bg-rose-50',
  'bg-sky-50',
  'bg-orange-50',
];
const COLORS = [
  'text-blue-500',
  'text-violet-500',
  'text-amber-500',
  'text-emerald-500',
  'text-rose-500',
  'text-sky-500',
  'text-orange-500',
];
const paletteIndex = (name: string) => [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % BACKGROUNDS.length;

export function IconGlyph({ name, className = 'size-5' }: { name: string; className?: string }) {
  const Icon = ICONS[name as ProductIconName] ?? Package;
  return <Icon className={className} aria-hidden strokeWidth={1.5} />;
}

// Квадратная «фотография» товара: иконка на цветном фоне
export function ProductImage({
  icon,
  className = '',
  iconClassName = 'size-1/2',
}: {
  icon: string;
  className?: string;
  iconClassName?: string;
}) {
  const i = paletteIndex(icon);
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-xl ${BACKGROUNDS[i]} ${COLORS[i]} ${className}`}
    >
      <IconGlyph name={icon} className={iconClassName} />
    </div>
  );
}
