/**
 * Icon library for the Wallet Pass Studio.
 *
 * Registry of 200+ flat icons organized by category.
 * Uses Lucide icon names where available; falls back to custom SVG paths
 * for shapes and decorative elements not covered by Lucide.
 */

export type IconCategory =
  | 'food'
  | 'retail'
  | 'transport'
  | 'health'
  | 'finance'
  | 'social'
  | 'nature'
  | 'technology'
  | 'stamp'
  | 'badge'
  | 'decorative';

export interface IconDefinition {
  id: string;
  name: string;
  category: IconCategory;
  lucideName?: string;
  svgPath?: string;
}

/* ------------------------------------------------------------------ */
/*  Helper to create Lucide-based icon entries quickly                */
/* ------------------------------------------------------------------ */

function lucide(
  id: string,
  name: string,
  category: IconCategory,
  lucideName: string
): IconDefinition {
  return { id, name, category, lucideName };
}

function custom(
  id: string,
  name: string,
  category: IconCategory,
  svgPath: string
): IconDefinition {
  return { id, name, category, svgPath };
}

/* ------------------------------------------------------------------ */
/*  Icon Library                                                      */
/* ------------------------------------------------------------------ */

export const ICON_LIBRARY: IconDefinition[] = [
  /* -------------------------- Food (25) --------------------------- */
  lucide('coffee', 'Coffee', 'food', 'Coffee'),
  lucide('pizza', 'Pizza', 'food', 'Pizza'),
  lucide('croissant', 'Croissant', 'food', 'Croissant'),
  lucide('soup', 'Soup', 'food', 'Soup'),
  lucide('ice-cream', 'Ice Cream', 'food', 'IceCreamCone'),
  lucide('cake', 'Cake', 'food', 'Cake'),
  lucide('cup-soda', 'Cup Soda', 'food', 'CupSoda'),
  lucide('beer', 'Beer', 'food', 'Beer'),
  lucide('wine', 'Wine', 'food', 'Wine'),
  lucide('salad', 'Salad', 'food', 'Salad'),
  lucide('sandwich', 'Sandwich', 'food', 'Sandwich'),
  lucide('cookie', 'Cookie', 'food', 'Cookie'),
  lucide('donut', 'Donut', 'food', 'Donut'),
  lucide('cherry', 'Cherry', 'food', 'Cherry'),
  lucide('apple', 'Apple', 'food', 'Apple'),
  lucide('banana', 'Banana', 'food', 'Banana'),
  lucide('carrot', 'Carrot', 'food', 'Carrot'),
  lucide('egg', 'Egg', 'food', 'Egg'),
  lucide('fish', 'Fish', 'food', 'Fish'),
  lucide('beef', 'Beef', 'food', 'Beef'),
  lucide('cooking-pot', 'Cooking Pot', 'food', 'CookingPot'),
  lucide('utensils-crossed', 'Utensils Crossed', 'food', 'UtensilsCrossed'),
  lucide('utensils', 'Utensils', 'food', 'Utensils'),
  lucide('fork-knife', 'Fork Knife', 'food', 'Utensils'),
  lucide('microwave', 'Microwave', 'food', 'Microwave'),

  /* -------------------------- Retail (20) ------------------------- */
  lucide('shopping-bag', 'Shopping Bag', 'retail', 'ShoppingBag'),
  lucide('shopping-cart', 'Shopping Cart', 'retail', 'ShoppingCart'),
  lucide('store', 'Store', 'retail', 'Store'),
  lucide('gift', 'Gift', 'retail', 'Gift'),
  lucide('tag', 'Tag', 'retail', 'Tag'),
  lucide('shirt', 'Shirt', 'retail', 'Shirt'),
  lucide('gem', 'Gem', 'retail', 'Gem'),
  lucide('watch', 'Watch', 'retail', 'Watch'),
  lucide('glasses', 'Glasses', 'retail', 'Glasses'),
  lucide('scissors', 'Scissors', 'retail', 'Scissors'),
  lucide('package', 'Package', 'retail', 'Package'),
  lucide('truck', 'Truck', 'retail', 'Truck'),
  lucide('credit-card', 'Credit Card', 'retail', 'CreditCard'),
  lucide('wallet', 'Wallet', 'retail', 'Wallet'),
  lucide('banknote', 'Banknote', 'retail', 'Banknote'),
  lucide('receipt', 'Receipt', 'retail', 'Receipt'),
  lucide('percent', 'Percent', 'retail', 'Percent'),
  lucide('badge-percent', 'Badge Percent', 'retail', 'BadgePercent'),
  lucide('badge-dollar-sign', 'Badge Dollar Sign', 'retail', 'BadgeDollarSign'),
  lucide('coins', 'Coins', 'retail', 'Coins'),

  /* ------------------------ Transport (20) ------------------------ */
  lucide('bus', 'Bus', 'transport', 'Bus'),
  lucide('car', 'Car', 'transport', 'Car'),
  lucide('train', 'Train', 'transport', 'TrainFront'),
  lucide('plane', 'Plane', 'transport', 'Plane'),
  lucide('bike', 'Bike', 'transport', 'Bike'),
  lucide('ship', 'Ship', 'transport', 'Ship'),
  lucide('navigation', 'Navigation', 'transport', 'Navigation'),
  lucide('map-pin', 'Map Pin', 'transport', 'MapPin'),
  lucide('map', 'Map', 'transport', 'Map'),
  lucide('fuel', 'Fuel', 'transport', 'Fuel'),
  lucide('gauge', 'Gauge', 'transport', 'Gauge'),
  lucide('timer', 'Timer', 'transport', 'Timer'),
  lucide('traffic-cone', 'Traffic Cone', 'transport', 'TrafficCone'),
  lucide('parking-square', 'Parking', 'transport', 'ParkingSquare'),
  lucide('ticket', 'Ticket', 'transport', 'Ticket'),
  lucide('compass', 'Compass', 'transport', 'Compass'),
  lucide('locate', 'Locate', 'transport', 'Locate'),
  lucide('route', 'Route', 'transport', 'Route'),
  lucide('footprints', 'Footprints', 'transport', 'Footprints'),
  lucide('sailboat', 'Sailboat', 'transport', 'Sailboat'),

  /* -------------------------- Health (20) ------------------------- */
  lucide('heart', 'Heart', 'health', 'Heart'),
  lucide('activity', 'Activity', 'health', 'Activity'),
  lucide('stethoscope', 'Stethoscope', 'health', 'Stethoscope'),
  lucide('pill', 'Pill', 'health', 'Pill'),
  lucide('thermometer', 'Thermometer', 'health', 'Thermometer'),
  lucide('droplets', 'Droplets', 'health', 'Droplets'),
  lucide('baby', 'Baby', 'health', 'Baby'),
  lucide('brain', 'Brain', 'health', 'Brain'),
  lucide('eye', 'Eye', 'health', 'Eye'),
  lucide('ear', 'Ear', 'health', 'Ear'),
  lucide('bone', 'Bone', 'health', 'Bone'),
  lucide('dna', 'DNA', 'health', 'Dna'),
  lucide('microscope', 'Microscope', 'health', 'Microscope'),
  lucide('ambulance', 'Ambulance', 'health', 'Ambulance'),
  lucide('hospital', 'Hospital', 'health', 'Hospital'),
  lucide('shield-plus', 'Shield Plus', 'health', 'ShieldPlus'),
  lucide('heart-pulse', 'Heart Pulse', 'health', 'HeartPulse'),
  lucide('smile', 'Smile', 'health', 'Smile'),
  lucide('frown', 'Frown', 'health', 'Frown'),
  lucide('meh', 'Meh', 'health', 'Meh'),

  /* ------------------------- Finance (20) ------------------------- */
  lucide('dollar-sign', 'Dollar Sign', 'finance', 'DollarSign'),
  lucide('euro', 'Euro', 'finance', 'Euro'),
  lucide('pound-sterling', 'Pound Sterling', 'finance', 'PoundSterling'),
  lucide('japanese-yen', 'Japanese Yen', 'finance', 'JapaneseYen'),
  lucide('landmark', 'Landmark', 'finance', 'Landmark'),
  lucide('building-2', 'Building 2', 'finance', 'Building2'),
  lucide('piggy-bank', 'Piggy Bank', 'finance', 'PiggyBank'),
  lucide('trending-up', 'Trending Up', 'finance', 'TrendingUp'),
  lucide('trending-down', 'Trending Down', 'finance', 'TrendingDown'),
  lucide('bar-chart-3', 'Bar Chart', 'finance', 'BarChart3'),
  lucide('pie-chart', 'Pie Chart', 'finance', 'PieChart'),
  lucide('line-chart', 'Line Chart', 'finance', 'LineChart'),
  lucide('wallet-finance', 'Wallet', 'finance', 'Wallet'),
  lucide('credit-card-finance', 'Credit Card', 'finance', 'CreditCard'),
  lucide('banknote-finance', 'Banknote', 'finance', 'Banknote'),
  lucide('receipt-finance', 'Receipt', 'finance', 'Receipt'),
  lucide('calculator', 'Calculator', 'finance', 'Calculator'),
  lucide('scale', 'Scale', 'finance', 'Scale'),
  lucide('badge-dollar-sign-finance', 'Badge Dollar Sign', 'finance', 'BadgeDollarSign'),
  lucide('coins-finance', 'Coins', 'finance', 'Coins'),

  /* -------------------------- Social (20) ------------------------- */
  lucide('users', 'Users', 'social', 'Users'),
  lucide('user', 'User', 'social', 'User'),
  lucide('user-plus', 'User Plus', 'social', 'UserPlus'),
  lucide('user-check', 'User Check', 'social', 'UserCheck'),
  lucide('user-circle', 'User Circle', 'social', 'UserCircle'),
  lucide('message-circle', 'Message Circle', 'social', 'MessageCircle'),
  lucide('mail', 'Mail', 'social', 'Mail'),
  lucide('phone', 'Phone', 'social', 'Phone'),
  lucide('share-2', 'Share 2', 'social', 'Share2'),
  lucide('thumbs-up', 'Thumbs Up', 'social', 'ThumbsUp'),
  lucide('star', 'Star', 'social', 'Star'),
  lucide('heart-social', 'Heart', 'social', 'Heart'),
  lucide('bookmark', 'Bookmark', 'social', 'Bookmark'),
  lucide('bell', 'Bell', 'social', 'Bell'),
  lucide('calendar', 'Calendar', 'social', 'Calendar'),
  lucide('clock', 'Clock', 'social', 'Clock'),
  lucide('camera', 'Camera', 'social', 'Camera'),
  lucide('video', 'Video', 'social', 'Video'),
  lucide('music', 'Music', 'social', 'Music'),
  lucide('mic', 'Mic', 'social', 'Mic'),

  /* -------------------------- Nature (20) ------------------------- */
  lucide('sun', 'Sun', 'nature', 'Sun'),
  lucide('moon', 'Moon', 'nature', 'Moon'),
  lucide('cloud', 'Cloud', 'nature', 'Cloud'),
  lucide('cloud-rain', 'Cloud Rain', 'nature', 'CloudRain'),
  lucide('cloud-snow', 'Cloud Snow', 'nature', 'CloudSnow'),
  lucide('cloud-lightning', 'Cloud Lightning', 'nature', 'CloudLightning'),
  lucide('wind', 'Wind', 'nature', 'Wind'),
  lucide('thermometer-sun', 'Thermometer Sun', 'nature', 'ThermometerSun'),
  lucide('tree-pine', 'Tree Pine', 'nature', 'TreePine'),
  lucide('flower-2', 'Flower 2', 'nature', 'Flower2'),
  lucide('leaf', 'Leaf', 'nature', 'Leaf'),
  lucide('mountain', 'Mountain', 'nature', 'Mountain'),
  lucide('waves', 'Waves', 'nature', 'Waves'),
  lucide('flame', 'Flame', 'nature', 'Flame'),
  lucide('droplet', 'Droplet', 'nature', 'Droplet'),
  lucide('snowflake', 'Snowflake', 'nature', 'Snowflake'),
  lucide('rainbow', 'Rainbow', 'nature', 'Rainbow'),
  lucide('sunrise', 'Sunrise', 'nature', 'Sunrise'),
  lucide('sunset', 'Sunset', 'nature', 'Sunset'),
  lucide('star-nature', 'Star', 'nature', 'Star'),

  /* ------------------------ Technology (20) ----------------------- */
  lucide('smartphone', 'Smartphone', 'technology', 'Smartphone'),
  lucide('tablet', 'Tablet', 'technology', 'Tablet'),
  lucide('laptop', 'Laptop', 'technology', 'Laptop'),
  lucide('monitor', 'Monitor', 'technology', 'Monitor'),
  lucide('printer', 'Printer', 'technology', 'Printer'),
  lucide('hard-drive', 'Hard Drive', 'technology', 'HardDrive'),
  lucide('cpu', 'CPU', 'technology', 'Cpu'),
  lucide('wifi', 'Wifi', 'technology', 'Wifi'),
  lucide('bluetooth', 'Bluetooth', 'technology', 'Bluetooth'),
  lucide('battery', 'Battery', 'technology', 'Battery'),
  lucide('battery-charging', 'Battery Charging', 'technology', 'BatteryCharging'),
  lucide('plug', 'Plug', 'technology', 'Plug'),
  lucide('mouse', 'Mouse', 'technology', 'Mouse'),
  lucide('keyboard', 'Keyboard', 'technology', 'Keyboard'),
  lucide('headphones', 'Headphones', 'technology', 'Headphones'),
  lucide('camera-tech', 'Camera', 'technology', 'Camera'),
  lucide('video-tech', 'Video', 'technology', 'Video'),
  lucide('radio', 'Radio', 'technology', 'Radio'),
  lucide('tv', 'TV', 'technology', 'Tv'),
  lucide('gamepad-2', 'Gamepad 2', 'technology', 'Gamepad2'),

  /* --------------------------- Stamp (20) ------------------------- */
  lucide('stamp-circle', 'Circle', 'stamp', 'Circle'),
  lucide('stamp-square', 'Square', 'stamp', 'Square'),
  lucide('stamp-star', 'Star', 'stamp', 'Star'),
  lucide('stamp-heart', 'Heart', 'stamp', 'Heart'),
  lucide('stamp-diamond', 'Diamond', 'stamp', 'Diamond'),
  lucide('stamp-hexagon', 'Hexagon', 'stamp', 'Hexagon'),
  lucide('stamp-octagon', 'Octagon', 'stamp', 'Octagon'),
  lucide('stamp-triangle', 'Triangle', 'stamp', 'Triangle'),
  lucide('stamp-pentagon', 'Pentagon', 'stamp', 'Pentagon'),
  lucide('stamp-badge-check', 'Badge Check', 'stamp', 'BadgeCheck'),
  lucide('stamp-badge', 'Badge', 'stamp', 'Badge'),
  lucide('stamp-award', 'Award', 'stamp', 'Award'),
  lucide('stamp-trophy', 'Trophy', 'stamp', 'Trophy'),
  lucide('stamp-medal', 'Medal', 'stamp', 'Medal'),
  lucide('stamp-crown', 'Crown', 'stamp', 'Crown'),
  lucide('stamp-sparkles', 'Sparkles', 'stamp', 'Sparkles'),
  lucide('stamp-zap', 'Zap', 'stamp', 'Zap'),
  lucide('stamp-flame', 'Flame', 'stamp', 'Flame'),
  lucide('stamp-check-circle', 'Check Circle', 'stamp', 'CheckCircle'),
  lucide('stamp-x-circle', 'X Circle', 'stamp', 'XCircle'),

  /* --------------------------- Badge (20) ------------------------- */
  lucide('badge-shield', 'Shield', 'badge', 'Shield'),
  lucide('badge-shield-check', 'Shield Check', 'badge', 'ShieldCheck'),
  lucide('badge-shield-alert', 'Shield Alert', 'badge', 'ShieldAlert'),
  lucide('badge-shield-question', 'Shield Question', 'badge', 'ShieldQuestion'),
  lucide('badge-award', 'Award', 'badge', 'Award'),
  lucide('badge-trophy', 'Trophy', 'badge', 'Trophy'),
  lucide('badge-medal', 'Medal', 'badge', 'Medal'),
  lucide('badge-crown', 'Crown', 'badge', 'Crown'),
  lucide('badge-star', 'Star', 'badge', 'Star'),
  lucide('badge-thumbs-up', 'Thumbs Up', 'badge', 'ThumbsUp'),
  lucide('badge-heart', 'Heart', 'badge', 'Heart'),
  lucide('badge-bookmark', 'Bookmark', 'badge', 'Bookmark'),
  lucide('badge-bell', 'Bell', 'badge', 'Bell'),
  lucide('badge-flag', 'Flag', 'badge', 'Flag'),
  lucide('badge-pin', 'Pin', 'badge', 'Pin'),
  lucide('badge-tag', 'Tag', 'badge', 'Tag'),
  lucide('badge-check', 'Badge Check', 'badge', 'BadgeCheck'),
  lucide('badge-ribbon', 'Ribbon', 'badge', 'Ribbon'),
  custom(
    'badge-certificate',
    'Certificate',
    'badge',
    'M4 4h16v16H4z M8 8h8M8 12h8M8 16h5'
  ),
  custom(
    'badge-rosette',
    'Rosette',
    'badge',
    'M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z'
  ),

  /* ------------------------ Decorative (20) ----------------------- */
  lucide('deco-sparkles', 'Sparkles', 'decorative', 'Sparkles'),
  lucide('deco-zap', 'Zap', 'decorative', 'Zap'),
  lucide('deco-flame', 'Flame', 'decorative', 'Flame'),
  lucide('deco-crown', 'Crown', 'decorative', 'Crown'),
  lucide('deco-star', 'Star', 'decorative', 'Star'),
  lucide('deco-heart', 'Heart', 'decorative', 'Heart'),
  lucide('deco-music', 'Music', 'decorative', 'Music'),
  lucide('deco-palette', 'Palette', 'decorative', 'Palette'),
  lucide('deco-paintbrush', 'Paintbrush', 'decorative', 'Paintbrush'),
  lucide('deco-pen', 'Pen', 'decorative', 'Pen'),
  lucide('deco-type', 'Type', 'decorative', 'Type'),
  lucide('deco-image', 'Image', 'decorative', 'Image'),
  lucide('deco-film', 'Film', 'decorative', 'Film'),
  lucide('deco-sun', 'Sun', 'decorative', 'Sun'),
  lucide('deco-moon', 'Moon', 'decorative', 'Moon'),
  lucide('deco-cloud', 'Cloud', 'decorative', 'Cloud'),
  lucide('deco-flower', 'Flower', 'decorative', 'Flower2'),
  lucide('deco-leaf', 'Leaf', 'decorative', 'Leaf'),
  lucide('deco-tree', 'Tree', 'decorative', 'TreePine'),
  lucide('deco-gem', 'Gem', 'decorative', 'Gem'),
];

/* ------------------------------------------------------------------ */
/*  Lookup Utilities                                                  */
/* ------------------------------------------------------------------ */

export function getIconsByCategory(category: IconCategory): IconDefinition[] {
  return ICON_LIBRARY.filter((icon) => icon.category === category);
}

export function getIconById(id: string): IconDefinition | undefined {
  return ICON_LIBRARY.find((icon) => icon.id === id);
}

export function searchIcons(query: string): IconDefinition[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];
  return ICON_LIBRARY.filter(
    (icon) =>
      icon.name.toLowerCase().includes(normalized) ||
      icon.id.toLowerCase().includes(normalized) ||
      icon.category.toLowerCase().includes(normalized)
  );
}

export function getStampIcons(): IconDefinition[] {
  return getIconsByCategory('stamp');
}

export function getBadgeIcons(): IconDefinition[] {
  return getIconsByCategory('badge');
}
