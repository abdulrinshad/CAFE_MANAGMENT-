import React from 'react';

/**
 * Clean vector illustration food icons for Cafe Management.
 * Minimalist, compact, logo/icon style with soft warm cafe visual aesthetic.
 */

/* ── Dessert Icons ── */
export function CakeIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFF8F0" />
      <path d="M12 36H36V26C36 24.8954 35.1046 24 34 24H14C12.8954 24 12 24.8954 12 26V36Z" fill="#F4A261" opacity="0.3" stroke="#8D4925" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 36H36V30H12V36Z" fill="#8D4925" opacity="0.2" />
      <path d="M14 24C15.5 22.5 16.5 24 18 24C19.5 24 20.5 22.5 22 22.5C23.5 22.5 24.5 24 26 24C27.5 24 28.5 22.5 30 22.5C31.5 22.5 32.5 24 34 24" stroke="#D9534F" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="10" y1="36" x2="38" y2="36" stroke="#8D4925" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="17" r="3.5" fill="#D9534F" />
      <path d="M25 13.5C25 13.5 26.5 11 28 11.5" stroke="#4E9F76" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CupcakeIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFF5F7" />
      <path d="M15 26L17.5 37H30.5L33 26" fill="#8D4925" opacity="0.15" stroke="#8D4925" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M15 26C15 20 18 17 24 17C30 17 33 20 33 26C33 26 29 27.5 24 27.5C19 27.5 15 26 15 26Z" fill="#F4A261" opacity="0.4" stroke="#8D4925" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="24" cy="14" r="3.5" fill="#D9534F" />
      <line x1="21" y1="31" x2="20" y2="35" stroke="#8D4925" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="27" y1="31" x2="28" y2="35" stroke="#8D4925" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PastryIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFF8F0" />
      <path d="M11 32L37 17L33 34H11Z" fill="#E89D31" opacity="0.3" stroke="#8D4925" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M11 32C18 30 26 31 33 34" stroke="#8D4925" strokeWidth="2" />
      <path d="M20 22C24 23.5 28 26 31 29" stroke="#D9534F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Meals Icons ── */
export function MealPlateIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F4F8F5" />
      <circle cx="24" cy="24" r="14" fill="#FFFFFF" stroke="#3D2314" strokeWidth="2.2" />
      <circle cx="24" cy="24" r="9" fill="#E89D31" opacity="0.25" stroke="#3D2314" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="8" y1="17" x2="8" y2="31" stroke="#3D2314" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 17V22C7 23 9 23 9 22V17" stroke="#3D2314" strokeWidth="1.5" />
      <line x1="40" y1="17" x2="40" y2="31" stroke="#3D2314" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 17C38 17 42 18 40 22" stroke="#3D2314" strokeWidth="1.5" />
    </svg>
  );
}

export function RiceMealIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FAF8F2" />
      <path d="M12 24C12 30.6274 17.3726 36 24 36C30.6274 36 36 30.6274 36 24H12Z" fill="#E5E0D8" stroke="#3D2314" strokeWidth="2.2" />
      <path d="M15 24C15 20 18 17 24 17C30 17 33 20 33 24H15Z" fill="#FFFFFF" stroke="#3D2314" strokeWidth="1.8" />
      <path d="M23 15C23 15 24 13 26 14" stroke="#4E9F76" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ThaliIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FDF8F2" />
      <circle cx="24" cy="24" r="16" fill="#F0EAE1" stroke="#3D2314" strokeWidth="2" />
      <circle cx="18" cy="18" r="4" fill="#E89D31" opacity="0.6" stroke="#3D2314" strokeWidth="1.5" />
      <circle cx="30" cy="18" r="4" fill="#D9534F" opacity="0.6" stroke="#3D2314" strokeWidth="1.5" />
      <circle cx="24" cy="30" r="4" fill="#4E9F76" opacity="0.6" stroke="#3D2314" strokeWidth="1.5" />
      <circle cx="24" cy="22" r="3" fill="#FFFFFF" stroke="#3D2314" strokeWidth="1.2" />
    </svg>
  );
}

/* ── Juices Icons ── */
export function JuiceGlassIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFF9F2" />
      <path d="M16 16L18.5 37H29.5L32 16H16Z" fill="#F4A261" opacity="0.4" stroke="#3D2314" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M17.5 22H30.5L29.5 37H18.5L17.5 22Z" fill="#F4A261" />
      <line x1="27" y1="10" x2="21" y2="34" stroke="#D9534F" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="17" cy="16" r="3.5" fill="#E89D31" stroke="#3D2314" strokeWidth="1.5" />
    </svg>
  );
}

export function SmoothieIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FDF4F8" />
      <rect x="16" y="18" width="16" height="19" rx="3" fill="#E06D53" opacity="0.4" stroke="#3D2314" strokeWidth="2.2" />
      <path d="M16 18C16 14 20 12 24 12C28 12 32 14 32 18H16Z" fill="#FFFFFF" stroke="#3D2314" strokeWidth="2" />
      <line x1="27" y1="8" x2="23" y2="24" stroke="#3D2314" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M26 12C28 10 30 11 31 13" stroke="#4E9F76" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Breakfast Icons ── */
export function DosaIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFFDF8" />
      <path d="M10 28C10 28 20 18 38 20L34 30C20 28 10 28 10 28Z" fill="#E89D31" opacity="0.5" stroke="#3D2314" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="14" cy="34" r="3" fill="#FFFFFF" stroke="#3D2314" strokeWidth="1.5" />
      <circle cx="22" cy="35" r="2.5" fill="#4E9F76" opacity="0.8" stroke="#3D2314" strokeWidth="1.2" />
      <circle cx="28" cy="35" r="2.5" fill="#D9534F" opacity="0.7" stroke="#3D2314" strokeWidth="1.2" />
    </svg>
  );
}

export function IdliIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F8FAF7" />
      <ellipse cx="20" cy="22" rx="7" ry="4.5" fill="#FFFFFF" stroke="#3D2314" strokeWidth="2" />
      <ellipse cx="28" cy="27" rx="7" ry="4.5" fill="#FFFFFF" stroke="#3D2314" strokeWidth="2" />
      <ellipse cx="18" cy="31" rx="6" ry="4" fill="#FFFFFF" stroke="#3D2314" strokeWidth="2" />
      <circle cx="34" cy="20" r="3.5" fill="#E89D31" stroke="#3D2314" strokeWidth="1.5" />
    </svg>
  );
}

export function BreakfastPlateIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFFDF5" />
      <rect x="12" y="16" width="24" height="18" rx="4" fill="#FFFFFF" stroke="#3D2314" strokeWidth="2.2" />
      <circle cx="20" cy="25" r="4" fill="#E89D31" stroke="#3D2314" strokeWidth="1.8" />
      <rect x="27" y="21" width="6" height="8" rx="1" fill="#8D4925" opacity="0.6" stroke="#3D2314" strokeWidth="1.5" />
    </svg>
  );
}

/* ── Snacks Icons ── */
export function SandwichIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFF9F5" />
      <path d="M12 33L36 17V33H12Z" fill="#F4A261" opacity="0.3" stroke="#3D2314" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 33L36 17" stroke="#3D2314" strokeWidth="2.2" />
      <path d="M15 31L33 19" stroke="#4E9F76" strokeWidth="2" />
      <path d="M18 31L34 21" stroke="#D9534F" strokeWidth="2" />
    </svg>
  );
}

export function FriesIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFF7F5" />
      <path d="M16 24L18.5 37H29.5L32 24H16Z" fill="#D9534F" stroke="#3D2314" strokeWidth="2" strokeLinejoin="round" />
      <rect x="18" y="11" width="3" height="15" rx="1" fill="#E89D31" stroke="#3D2314" strokeWidth="1.5" />
      <rect x="22.5" y="9" width="3" height="17" rx="1" fill="#E89D31" stroke="#3D2314" strokeWidth="1.5" />
      <rect x="27" y="13" width="3" height="13" rx="1" fill="#E89D31" stroke="#3D2314" strokeWidth="1.5" />
    </svg>
  );
}

export function BurgerIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFFBF5" />
      <path d="M14 22C14 16 18 13 24 13C30 13 34 16 34 22H14Z" fill="#F4A261" stroke="#3D2314" strokeWidth="2" />
      <path d="M12 25C15 24 18 26 21 25C24 24 27 26 30 25C33 24 36 25 36 25" stroke="#4E9F76" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="14" y="28" width="20" height="4" rx="2" fill="#8D4925" stroke="#3D2314" strokeWidth="1.8" />
      <path d="M15 34H33" stroke="#F4A261" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 34H33" stroke="#3D2314" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ── Dinner Icons ── */
export function DinnerPlateIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F9F7FA" />
      <path d="M14 27C14 20 18 16 24 16C30 16 34 20 34 27H14Z" fill="#E5E0D8" stroke="#3D2314" strokeWidth="2.2" />
      <circle cx="24" cy="13" r="2.5" fill="#3D2314" />
      <line x1="10" y1="31" x2="38" y2="31" stroke="#3D2314" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function CurryIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFF9F5" />
      <path d="M14 24C14 29.5 18.5 34 24 34C29.5 34 34 29.5 34 24H14Z" fill="#D9534F" opacity="0.3" stroke="#3D2314" strokeWidth="2.2" />
      <path d="M14 24C16 22.5 19 25 24 23.5C29 22 32 25 34 24" stroke="#D9534F" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 16C21 16 22 18 21 20" stroke="#8D4925" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M27 15C27 15 28 17 27 19" stroke="#8D4925" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function RiceDishIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FAF7F2" />
      <path d="M12 26C12 31.5 17.37 36 24 36C30.63 36 36 31.5 36 26H12Z" fill="#F4A261" opacity="0.3" stroke="#3D2314" strokeWidth="2.2" />
      <path d="M15 26C15 21 19 18 24 18C29 18 33 21 33 26H15Z" fill="#E89D31" opacity="0.6" stroke="#3D2314" strokeWidth="1.8" />
      <circle cx="24" cy="20" r="1.5" fill="#4E9F76" />
      <circle cx="21" cy="22" r="1.5" fill="#D9534F" />
      <circle cx="27" cy="22" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

/* ── Beverages Icons ── */
export function CoffeeCupIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FDF8F5" />
      <rect x="14" y="20" width="18" height="15" rx="3" fill="#8D4925" opacity="0.25" stroke="#3D2314" strokeWidth="2.2" />
      <path d="M32 23H35C36.6569 23 38 24.3431 38 26V27C38 28.6569 36.6569 30 35 30H32" stroke="#3D2314" strokeWidth="2" />
      <line x1="12" y1="37" x2="34" y2="37" stroke="#3D2314" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 12C20 12 21 14 20 16" stroke="#8D4925" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M26 11C26 11 27 13 26 15" stroke="#8D4925" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function TeaCupIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F6FAF6" />
      <path d="M15 22H31V30C31 33.3137 28.3137 36 25 36H21C17.6863 36 15 33.3137 15 30V22Z" fill="#4E9F76" opacity="0.2" stroke="#3D2314" strokeWidth="2.2" />
      <path d="M31 24H34C35.6569 24 37 25.3431 37 27V27C37 28.6569 35.6569 30 34 30H31" stroke="#3D2314" strokeWidth="2" />
      <line x1="12" y1="38" x2="34" y2="38" stroke="#3D2314" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 14C22 12 24 13 25 15" stroke="#4E9F76" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DrinkGlassIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F2FAFD" />
      <path d="M16 16L18 36H30L32 16H16Z" fill="#5BC0DE" opacity="0.3" stroke="#3D2314" strokeWidth="2.2" strokeLinejoin="round" />
      <line x1="28" y1="10" x2="22" y2="32" stroke="#3D2314" strokeWidth="2" strokeLinecap="round" />
      <rect x="20" y="22" width="4" height="4" rx="1" fill="#FFFFFF" stroke="#3D2314" strokeWidth="1.2" />
    </svg>
  );
}

/* ── Bakery Icons ── */
export function BreadIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFFDF8" />
      <path d="M14 25C14 20 18 17 24 17C30 17 34 20 34 25V32H14V25Z" fill="#F4A261" opacity="0.4" stroke="#3D2314" strokeWidth="2.2" strokeLinejoin="round" />
      <line x1="20" y1="20" x2="18" y2="28" stroke="#3D2314" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="25" y1="20" x2="23" y2="28" stroke="#3D2314" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="30" y1="20" x2="28" y2="28" stroke="#3D2314" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CroissantIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FFF9F2" />
      <path d="M12 30C14 20 22 16 30 20C34 22 36 28 34 32C32 30 28 29 24 30C18 31 14 33 12 30Z" fill="#E89D31" opacity="0.5" stroke="#3D2314" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M21 18C23 23 23 28 22 30" stroke="#3D2314" strokeWidth="1.8" />
      <path d="M28 20C29 24 28 28 27 30" stroke="#3D2314" strokeWidth="1.8" />
    </svg>
  );
}

/* ── Salads Icons ── */
export function SaladBowlIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F4FAF5" />
      <path d="M12 24C12 30.6274 17.3726 36 24 36C30.6274 36 36 30.6274 36 24H12Z" fill="#4E9F76" opacity="0.3" stroke="#3D2314" strokeWidth="2.2" />
      <circle cx="19" cy="21" r="3.5" fill="#4E9F76" stroke="#3D2314" strokeWidth="1.5" />
      <circle cx="28" cy="20" r="3.5" fill="#D9534F" stroke="#3D2314" strokeWidth="1.5" />
      <circle cx="24" cy="23" r="3" fill="#E89D31" stroke="#3D2314" strokeWidth="1.2" />
    </svg>
  );
}

export function GreenSaladIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F2FAF4" />
      <path d="M14 26C14 31 18.5 35 24 35C29.5 35 34 31 34 26H14Z" fill="#4E9F76" opacity="0.25" stroke="#3D2314" strokeWidth="2.2" />
      <path d="M16 23C16 19 20 18 23 21C26 18 31 19 31 23H16Z" fill="#4E9F76" opacity="0.6" stroke="#3D2314" strokeWidth="1.8" />
    </svg>
  );
}

/* ── Default Icons ── */
export function UtensilsIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F6F5F3" />
      <line x1="18" y1="14" x2="18" y2="34" stroke="#3D2314" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M15 14V22C15 23.5 21 23.5 21 22V14" stroke="#3D2314" strokeWidth="1.8" />
      <line x1="30" y1="14" x2="30" y2="34" stroke="#3D2314" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M27 14C27 14 33 16 31 22H27V14Z" fill="#3D2314" opacity="0.3" stroke="#3D2314" strokeWidth="1.5" />
    </svg>
  );
}

export function ChefHatIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FAF9F6" />
      <path d="M16 28H32V34H16V28Z" fill="#E5E0D8" stroke="#3D2314" strokeWidth="2" />
      <path d="M16 28C14 26 13 23 15 20C17 17 21 17 22 19C23 16 27 16 28 19C30 17 33 18 34 21C35 24 34 27 32 28H16Z" fill="#FFFFFF" stroke="#3D2314" strokeWidth="2" />
    </svg>
  );
}


/** Map iconKey string → SVG React component */
export const CATEGORY_ICON_MAP = {
  // Desserts
  desserts_cake: CakeIcon,
  desserts_cupcake: CupcakeIcon,
  desserts_pastry: PastryIcon,

  // Meals
  meals_plate: MealPlateIcon,
  meals_rice: RiceMealIcon,
  meals_thali: ThaliIcon,

  // Juices
  juices_glass: JuiceGlassIcon,
  juices_smoothie: SmoothieIcon,

  // Breakfast
  breakfast_dosa: DosaIcon,
  breakfast_idli: IdliIcon,
  breakfast_plate: BreakfastPlateIcon,

  // Snacks
  snacks_sandwich: SandwichIcon,
  snacks_fries: FriesIcon,
  snacks_burger: BurgerIcon,

  // Dinner
  dinner_plate: DinnerPlateIcon,
  dinner_curry: CurryIcon,
  dinner_rice: RiceDishIcon,

  // Beverages
  beverages_coffee: CoffeeCupIcon,
  beverages_tea: TeaCupIcon,
  beverages_drink: DrinkGlassIcon,

  // Bakery
  bakery_bread: BreadIcon,
  bakery_croissant: CroissantIcon,
  bakery_pastry: PastryIcon,

  // Salads
  salads_bowl: SaladBowlIcon,
  salads_green: GreenSaladIcon,

  // Legacy mappings
  coffee_tea: CoffeeCupIcon,
  pastries: PastryIcon,
  meals: MealPlateIcon,
  juice: JuiceGlassIcon,
  dinner: DinnerPlateIcon,
  breakfast: BreakfastPlateIcon,
  snacks: SandwichIcon,
  desserts: CakeIcon,

  // Defaults
  default_utensils: UtensilsIcon,
  default_chef: ChefHatIcon,
  default: UtensilsIcon,
};

/**
 * Category Groups & small relevant icon suggestions (2-3 items max per category group).
 */
export const CATEGORY_ICON_GROUPS = [
  {
    groupId: 'desserts',
    groupLabel: 'Desserts',
    keywords: ['dessert', 'cake', 'sweet', 'ice cream', 'cupcake', 'pudding', 'brownie', 'pastry'],
    suggestions: [
      { key: 'desserts_cake', label: 'Cake', component: CakeIcon },
      { key: 'desserts_cupcake', label: 'Cupcake', component: CupcakeIcon },
      { key: 'desserts_pastry', label: 'Pastry', component: PastryIcon },
    ]
  },
  {
    groupId: 'meals',
    groupLabel: 'Meals',
    keywords: ['meal', 'lunch', 'thali', 'combo', 'main', 'rice', 'plate'],
    suggestions: [
      { key: 'meals_plate', label: 'Plate Meal', component: MealPlateIcon },
      { key: 'meals_rice', label: 'Rice Bowl', component: RiceMealIcon },
      { key: 'meals_thali', label: 'Thali', component: ThaliIcon },
    ]
  },
  {
    groupId: 'juices',
    groupLabel: 'Juices & Drinks',
    keywords: ['juice', 'smoothie', 'shake', 'beverage', 'mocktail', 'cooler', 'cold drink'],
    suggestions: [
      { key: 'juices_glass', label: 'Juice Glass', component: JuiceGlassIcon },
      { key: 'juices_smoothie', label: 'Smoothie', component: SmoothieIcon },
    ]
  },
  {
    groupId: 'breakfast',
    groupLabel: 'Breakfast',
    keywords: ['breakfast', 'dosa', 'idli', 'morning', 'egg', 'pancake', 'toast', 'south indian'],
    suggestions: [
      { key: 'breakfast_dosa', label: 'Dosa', component: DosaIcon },
      { key: 'breakfast_idli', label: 'Idli', component: IdliIcon },
      { key: 'breakfast_plate', label: 'Breakfast Plate', component: BreakfastPlateIcon },
    ]
  },
  {
    groupId: 'snacks',
    groupLabel: 'Snacks & Starters',
    keywords: ['snack', 'sandwich', 'fries', 'burger', 'starter', 'finger food', 'bites'],
    suggestions: [
      { key: 'snacks_sandwich', label: 'Sandwich', component: SandwichIcon },
      { key: 'snacks_fries', label: 'French Fries', component: FriesIcon },
      { key: 'snacks_burger', label: 'Burger', component: BurgerIcon },
    ]
  },
  {
    groupId: 'dinner',
    groupLabel: 'Dinner',
    keywords: ['dinner', 'curry', 'biryani', 'gravy', 'roti', 'naan'],
    suggestions: [
      { key: 'dinner_plate', label: 'Dinner Plate', component: DinnerPlateIcon },
      { key: 'dinner_curry', label: 'Curry Bowl', component: CurryIcon },
      { key: 'dinner_rice', label: 'Rice Dish', component: RiceDishIcon },
    ]
  },
  {
    groupId: 'beverages',
    groupLabel: 'Beverages',
    keywords: ['coffee', 'tea', 'chai', 'espresso', 'latte', 'cappuccino', 'bev'],
    suggestions: [
      { key: 'beverages_coffee', label: 'Coffee Cup', component: CoffeeCupIcon },
      { key: 'beverages_tea', label: 'Tea Cup', component: TeaCupIcon },
      { key: 'beverages_drink', label: 'Drink Glass', component: DrinkGlassIcon },
    ]
  },
  {
    groupId: 'bakery',
    groupLabel: 'Bakery',
    keywords: ['bakery', 'bread', 'croissant', 'bake', 'bun', 'cookie', 'donut'],
    suggestions: [
      { key: 'bakery_bread', label: 'Bread Loaf', component: BreadIcon },
      { key: 'bakery_croissant', label: 'Croissant', component: CroissantIcon },
      { key: 'bakery_pastry', label: 'Pastry', component: PastryIcon },
    ]
  },
  {
    groupId: 'salads',
    groupLabel: 'Salads',
    keywords: ['salad', 'healthy', 'greens', 'bowl', 'raw', 'diet'],
    suggestions: [
      { key: 'salads_bowl', label: 'Salad Bowl', component: SaladBowlIcon },
      { key: 'salads_green', label: 'Green Salad', component: GreenSaladIcon },
    ]
  },
];

/**
 * Detect category group from category name
 */
export function detectCategoryGroup(categoryName = '') {
  const nameLower = categoryName.trim().toLowerCase();
  if (!nameLower) return CATEGORY_ICON_GROUPS[6]; // default to beverages

  for (const group of CATEGORY_ICON_GROUPS) {
    if (group.keywords.some(kw => nameLower.includes(kw))) {
      return group;
    }
  }

  // fallback to generic/beverages
  return {
    groupId: 'other',
    groupLabel: 'Other',
    suggestions: [
      { key: 'default_utensils', label: 'Utensils', component: UtensilsIcon },
      { key: 'default_chef', label: 'Chef Hat', component: ChefHatIcon },
      { key: 'beverages_coffee', label: 'Coffee Cup', component: CoffeeCupIcon },
    ]
  };
}

/**
 * Render Category Icon component by iconKey or categoryName
 */
export function renderCategoryIcon(iconKey = 'default', size = 32, categoryName = '') {
  let IconComponent = CATEGORY_ICON_MAP[iconKey];

  if (!IconComponent && categoryName) {
    const group = detectCategoryGroup(categoryName);
    if (group && group.suggestions.length > 0) {
      IconComponent = group.suggestions[0].component;
    }
  }

  if (!IconComponent) {
    IconComponent = UtensilsIcon;
  }

  return <IconComponent size={size} />;
}
