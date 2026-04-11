import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

const locationSeed = [
  // Pubs
  {
    id: "pogue-mahone",
    name: "Pogue Mahone Irish Pub",
    locationType: "pub",
    district: "Altstadt",
    address: "Bergstrasse 19, 24103 Kiel",
  },
  {
    id: "flensburger-hof-pub",
    name: "Flensburger Hof",
    locationType: "pub",
    district: "Vorstadt",
    address: "Muhliusstrasse 33, 24103 Kiel",
  },
  {
    id: "celtic-corner",
    name: "Celtic Corner",
    locationType: "pub",
    district: "Gaarden",
    address: "Elisabethstrasse 42, 24143 Kiel",
  },
  {
    id: "zum-anker",
    name: "Zum Anker",
    locationType: "pub",
    district: "Wik",
    address: "Danziger Strasse 12, 24143 Kiel",
  },
  {
    id: "alte-mole",
    name: "Alte Mole",
    locationType: "pub",
    district: "Altstadt",
    address: "Knooper Weg 5, 24103 Kiel",
  },
  {
    id: "kieler-braustube",
    name: "Kieler Braustube",
    locationType: "pub",
    district: "Ravensberg",
    address: "Ravensberg Allee 9, 24118 Kiel",
  },
  {
    id: "nordlicht-pub",
    name: "Nordlicht Pub",
    locationType: "pub",
    district: "Neumühlen-Dietrichsdorf",
    address: "Werftstrasse 21, 24143 Kiel",
  },
  {
    id: "schwarzer-kater",
    name: "Schwarzer Kater",
    locationType: "pub",
    district: "Brunswik",
    address: "Niemannsweg 7, 24105 Kiel",
  },

  // Bars
  {
    id: "hafenkante-bar",
    name: "Hafenkante Bar",
    locationType: "bar",
    district: "Duesternbrook",
    address: "Kiellinie 99, 24105 Kiel",
  },
  {
    id: "strandbar-schilksee",
    name: "Strandbar Schilksee",
    locationType: "bar",
    district: "Schilksee",
    address: "Strandweg 1, 24159 Kiel",
  },
  {
    id: "foerde-lounge",
    name: "Förde Lounge",
    locationType: "bar",
    district: "Altstadt",
    address: "Holstenstrasse 60, 24103 Kiel",
  },
  {
    id: "bierbar-gaarden",
    name: "Bierbar Gaarden",
    locationType: "bar",
    district: "Gaarden",
    address: "Gaardener Strasse 14, 24143 Kiel",
  },
  {
    id: "sky-deck-bar",
    name: "Sky Deck Bar",
    locationType: "bar",
    district: "Duesternbrook",
    address: "Kiellinie 1, 24105 Kiel",
  },
  {
    id: "tap-room-kiel",
    name: "Tap Room Kiel",
    locationType: "bar",
    district: "Schrevenpark",
    address: "Schrevenstrasse 8, 24118 Kiel",
  },
  {
    id: "hafenblick-bar",
    name: "Hafenblick Bar",
    locationType: "bar",
    district: "Wik",
    address: "Kaistrasse 4, 24114 Kiel",
  },
  {
    id: "studentenkeller",
    name: "Studentenkeller",
    locationType: "bar",
    district: "Ravensberg",
    address: "Universitaetsstrasse 2, 24118 Kiel",
  },

  // Restaurants
  {
    id: "foerde-brauhaus",
    name: "Foerde Brauhaus",
    locationType: "restaurant",
    district: "Vorstadt",
    address: "Kehdenstrasse 12, 24103 Kiel",
  },
  {
    id: "seehof-restaurant",
    name: "Seehof Restaurant",
    locationType: "restaurant",
    district: "Duesternbrook",
    address: "Düsternbrooker Weg 14, 24105 Kiel",
  },
  {
    id: "kieler-yacht-club-restaurant",
    name: "Kieler Yacht Club Restaurant",
    locationType: "restaurant",
    district: "Schilksee",
    address: "Olympiaweg 4, 24159 Kiel",
  },
  {
    id: "zum-goldenen-anker",
    name: "Zum Goldenen Anker",
    locationType: "restaurant",
    district: "Altstadt",
    address: "Nikolaistrasse 4, 24103 Kiel",
  },
  {
    id: "brauhaus-am-schloss",
    name: "Brauhaus am Schloss",
    locationType: "restaurant",
    district: "Altstadt",
    address: "Wall 65, 24103 Kiel",
  },
  {
    id: "nordkueche",
    name: "Nordküche",
    locationType: "restaurant",
    district: "Gaarden",
    address: "Vinetaplatz 6, 24143 Kiel",
  },
  {
    id: "bootshaus-restaurant",
    name: "Bootshaus Restaurant",
    locationType: "restaurant",
    district: "Wik",
    address: "Reventloubrücke 1, 24105 Kiel",
  },

  // Supermarkets
  {
    id: "marktfrisch-kiel",
    name: "Marktfrisch Kiel",
    locationType: "supermarket",
    district: "Gaarden",
    address: "Schoenberger Strasse 4, 24148 Kiel",
  },
  {
    id: "rewe-altstadt",
    name: "REWE Altstadt",
    locationType: "supermarket",
    district: "Altstadt",
    address: "Gutenbergstrasse 76, 24103 Kiel",
  },
  {
    id: "edeka-ravensberg",
    name: "EDEKA Ravensberg",
    locationType: "supermarket",
    district: "Ravensberg",
    address: "Holtenauer Strasse 110, 24118 Kiel",
  },
  {
    id: "netto-gaarden",
    name: "Netto Gaarden",
    locationType: "supermarket",
    district: "Gaarden",
    address: "Elisabethstrasse 15, 24143 Kiel",
  },
  {
    id: "lidl-mettenhof",
    name: "Lidl Mettenhof",
    locationType: "supermarket",
    district: "Mettenhof",
    address: "Eckernfoerder Strasse 99, 24119 Kiel",
  },
  {
    id: "aldi-nord-wik",
    name: "ALDI Nord Wik",
    locationType: "supermarket",
    district: "Wik",
    address: "Legienstrasse 40, 24114 Kiel",
  },
  {
    id: "kaufland-hassee",
    name: "Kaufland Hassee",
    locationType: "supermarket",
    district: "Hassee",
    address: "Hamburger Chaussee 12, 24113 Kiel",
  },
] as const;

// ---------------------------------------------------------------------------
// Beer Styles
// ---------------------------------------------------------------------------

const beerStyleSeed = [
  { id: "style-stout", name: "Stout" },
  { id: "style-red-ale", name: "Red Ale" },
  { id: "style-pils", name: "Pils" },
  { id: "style-hefeweizen", name: "Hefeweizen" },
  { id: "style-lager", name: "Lager" },
  { id: "style-ipa", name: "IPA" },
  { id: "style-porter", name: "Porter" },
  { id: "style-weizen", name: "Weizen" },
  { id: "style-dunkel", name: "Dunkel" },
  { id: "style-maerzen", name: "Märzen" },
  { id: "style-koelsch", name: "Kölsch" },
  { id: "style-altbier", name: "Altbier" },
] as const;

// ---------------------------------------------------------------------------
// Beer Brands
// ---------------------------------------------------------------------------

const beerBrandSeed = [
  // German — North
  { id: "brand-becks", name: "Becks" },
  { id: "brand-astra", name: "Astra" },
  { id: "brand-flensburger", name: "Flensburger" },
  { id: "brand-holsten", name: "Holsten" },
  { id: "brand-jever", name: "Jever" },
  // German — South/National
  { id: "brand-erdinger", name: "Erdinger" },
  { id: "brand-paulaner", name: "Paulaner" },
  { id: "brand-weihenstephaner", name: "Weihenstephaner" },
  { id: "brand-warsteiner", name: "Warsteiner" },
  { id: "brand-bitburger", name: "Bitburger" },
  { id: "brand-krombacher", name: "Krombacher" },
  { id: "brand-veltins", name: "Veltins" },
  { id: "brand-radeberger", name: "Radeberger" },
  { id: "brand-augustiner", name: "Augustiner" },
  { id: "brand-spaten", name: "Spaten" },
  { id: "brand-hacker-pschorr", name: "Hacker-Pschorr" },
  { id: "brand-oettinger", name: "Oettinger" },
  { id: "brand-koenigsbacher", name: "Königsbacher" },
  { id: "brand-kölsch-reissdorf", name: "Reissdorf" },
  // Irish / British
  { id: "brand-guinness", name: "Guinness" },
  { id: "brand-kilkenny", name: "Kilkenny" },
  { id: "brand-murphys", name: "Murphys" },
  // International
  { id: "brand-heineken", name: "Heineken" },
  { id: "brand-stella", name: "Stella Artois" },
  { id: "brand-corona", name: "Corona" },
] as const;

// ---------------------------------------------------------------------------
// Beer Variants
// ---------------------------------------------------------------------------

const beerVariantSeed = [
  // Becks
  { id: "variant-becks-pils", brandId: "brand-becks", styleId: "style-pils", name: "Pils" },
  { id: "variant-becks-gold", brandId: "brand-becks", styleId: "style-lager", name: "Gold" },
  // Astra
  { id: "variant-astra-pils", brandId: "brand-astra", styleId: "style-pils", name: "Pils" },
  { id: "variant-astra-urtyp", brandId: "brand-astra", styleId: "style-lager", name: "Urtyp" },
  // Flensburger
  {
    id: "variant-flensburger-pils",
    brandId: "brand-flensburger",
    styleId: "style-pils",
    name: "Pils",
  },
  {
    id: "variant-flensburger-weizen",
    brandId: "brand-flensburger",
    styleId: "style-weizen",
    name: "Weizen",
  },
  // Holsten
  { id: "variant-holsten-pils", brandId: "brand-holsten", styleId: "style-pils", name: "Pils" },
  {
    id: "variant-holsten-export",
    brandId: "brand-holsten",
    styleId: "style-lager",
    name: "Export",
  },
  // Jever
  { id: "variant-jever-pils", brandId: "brand-jever", styleId: "style-pils", name: "Pils" },
  {
    id: "variant-jever-fun",
    brandId: "brand-jever",
    styleId: "style-pils",
    name: "Fun (Alkoholfrei)",
  },
  // Erdinger
  {
    id: "variant-erdinger-hefeweizen",
    brandId: "brand-erdinger",
    styleId: "style-hefeweizen",
    name: "Hefeweizen",
  },
  {
    id: "variant-erdinger-dunkel",
    brandId: "brand-erdinger",
    styleId: "style-dunkel",
    name: "Dunkel",
  },
  // Paulaner
  {
    id: "variant-paulaner-hefeweizen",
    brandId: "brand-paulaner",
    styleId: "style-hefeweizen",
    name: "Hefeweizen",
  },
  {
    id: "variant-paulaner-maerzen",
    brandId: "brand-paulaner",
    styleId: "style-maerzen",
    name: "Märzen",
  },
  {
    id: "variant-paulaner-dunkel",
    brandId: "brand-paulaner",
    styleId: "style-dunkel",
    name: "Dunkel",
  },
  // Weihenstephaner
  {
    id: "variant-weihenstephaner-hefeweizen",
    brandId: "brand-weihenstephaner",
    styleId: "style-hefeweizen",
    name: "Hefeweizen",
  },
  {
    id: "variant-weihenstephaner-pils",
    brandId: "brand-weihenstephaner",
    styleId: "style-pils",
    name: "Pils",
  },
  // Warsteiner
  {
    id: "variant-warsteiner-pils",
    brandId: "brand-warsteiner",
    styleId: "style-pils",
    name: "Premium Verum",
  },
  // Bitburger
  {
    id: "variant-bitburger-pils",
    brandId: "brand-bitburger",
    styleId: "style-pils",
    name: "Premium Pils",
  },
  // Krombacher
  {
    id: "variant-krombacher-pils",
    brandId: "brand-krombacher",
    styleId: "style-pils",
    name: "Pils",
  },
  {
    id: "variant-krombacher-weizen",
    brandId: "brand-krombacher",
    styleId: "style-weizen",
    name: "Weizen",
  },
  // Veltins
  {
    id: "variant-veltins-pils",
    brandId: "brand-veltins",
    styleId: "style-pils",
    name: "Pilsener",
  },
  // Radeberger
  {
    id: "variant-radeberger-pils",
    brandId: "brand-radeberger",
    styleId: "style-pils",
    name: "Pilsner",
  },
  // Augustiner
  {
    id: "variant-augustiner-lager",
    brandId: "brand-augustiner",
    styleId: "style-lager",
    name: "Lagerbier Hell",
  },
  {
    id: "variant-augustiner-hefeweizen",
    brandId: "brand-augustiner",
    styleId: "style-hefeweizen",
    name: "Weissbier",
  },
  // Spaten
  {
    id: "variant-spaten-maerzen",
    brandId: "brand-spaten",
    styleId: "style-maerzen",
    name: "Märzen",
  },
  {
    id: "variant-spaten-lager",
    brandId: "brand-spaten",
    styleId: "style-lager",
    name: "Münchner Hell",
  },
  // Hacker-Pschorr
  {
    id: "variant-hacker-pschorr-hefeweizen",
    brandId: "brand-hacker-pschorr",
    styleId: "style-hefeweizen",
    name: "Weisse",
  },
  {
    id: "variant-hacker-pschorr-dunkel",
    brandId: "brand-hacker-pschorr",
    styleId: "style-dunkel",
    name: "Dunkel",
  },
  // Oettinger
  {
    id: "variant-oettinger-pils",
    brandId: "brand-oettinger",
    styleId: "style-pils",
    name: "Pils",
  },
  {
    id: "variant-oettinger-weizen",
    brandId: "brand-oettinger",
    styleId: "style-weizen",
    name: "Weizen",
  },
  // Königsbacher
  {
    id: "variant-koenigsbacher-pils",
    brandId: "brand-koenigsbacher",
    styleId: "style-pils",
    name: "Pils",
  },
  // Reissdorf
  {
    id: "variant-reissdorf-koelsch",
    brandId: "brand-kölsch-reissdorf",
    styleId: "style-koelsch",
    name: "Kölsch",
  },
  // Guinness
  {
    id: "variant-guinness-stout",
    brandId: "brand-guinness",
    styleId: "style-stout",
    name: "Stout",
  },
  // Kilkenny
  {
    id: "variant-kilkenny-red-ale",
    brandId: "brand-kilkenny",
    styleId: "style-red-ale",
    name: "Red Ale",
  },
  // Murphys
  {
    id: "variant-murphys-stout",
    brandId: "brand-murphys",
    styleId: "style-stout",
    name: "Irish Stout",
  },
  {
    id: "variant-murphys-red",
    brandId: "brand-murphys",
    styleId: "style-red-ale",
    name: "Irish Red",
  },
  // Heineken
  {
    id: "variant-heineken-lager",
    brandId: "brand-heineken",
    styleId: "style-lager",
    name: "Lager",
  },
  // Stella Artois
  {
    id: "variant-stella-lager",
    brandId: "brand-stella",
    styleId: "style-lager",
    name: "Lager",
  },
  // Corona
  {
    id: "variant-corona-extra",
    brandId: "brand-corona",
    styleId: "style-lager",
    name: "Extra",
  },
] as const;

// ---------------------------------------------------------------------------
// Offer generation helpers
// ---------------------------------------------------------------------------

type Serving = "tap" | "bottle" | "can";

interface OfferSpec {
  id: string;
  variantId: string;
  sizeMl: number;
  serving: Serving;
  priceCents: number;
  locationId: string;
}

// Base prices per variant (in cents) for reference — actual price varies by location type and serving
const basePriceCentsMap: Record<string, number> = {
  "variant-becks-pils": 390,
  "variant-becks-gold": 370,
  "variant-astra-pils": 360,
  "variant-astra-urtyp": 350,
  "variant-flensburger-pils": 400,
  "variant-flensburger-weizen": 430,
  "variant-holsten-pils": 350,
  "variant-holsten-export": 360,
  "variant-jever-pils": 420,
  "variant-jever-fun": 380,
  "variant-erdinger-hefeweizen": 480,
  "variant-erdinger-dunkel": 490,
  "variant-paulaner-hefeweizen": 490,
  "variant-paulaner-maerzen": 500,
  "variant-paulaner-dunkel": 510,
  "variant-weihenstephaner-hefeweizen": 520,
  "variant-weihenstephaner-pils": 490,
  "variant-warsteiner-pils": 380,
  "variant-bitburger-pils": 390,
  "variant-krombacher-pils": 385,
  "variant-krombacher-weizen": 410,
  "variant-veltins-pils": 395,
  "variant-radeberger-pils": 400,
  "variant-augustiner-lager": 460,
  "variant-augustiner-hefeweizen": 470,
  "variant-spaten-maerzen": 480,
  "variant-spaten-lager": 460,
  "variant-hacker-pschorr-hefeweizen": 510,
  "variant-hacker-pschorr-dunkel": 520,
  "variant-oettinger-pils": 280,
  "variant-oettinger-weizen": 290,
  "variant-koenigsbacher-pils": 370,
  "variant-reissdorf-koelsch": 440,
  "variant-guinness-stout": 620,
  "variant-kilkenny-red-ale": 600,
  "variant-murphys-stout": 590,
  "variant-murphys-red": 580,
  "variant-heineken-lager": 410,
  "variant-stella-lager": 420,
  "variant-corona-extra": 430,
};

// Multipliers by location type (pubs/bars/restaurants mark up more)
const locationTypeMultiplier: Record<string, number> = {
  pub: 1.65,
  bar: 1.55,
  restaurant: 1.7,
  supermarket: 1.0,
};

// Sizes available per serving type
const tapSizes = [300, 400, 500];
const bottleSizes = [330, 500];
const canSizes = [330, 500];

// Which serving types each location type typically offers
const locationServingMatrix: Record<string, Serving[]> = {
  pub: ["tap", "bottle"],
  bar: ["tap", "bottle", "can"],
  restaurant: ["tap", "bottle"],
  supermarket: ["bottle", "can"],
};

function sizesForServing(serving: Serving): number[] {
  if (serving === "tap") return tapSizes;
  if (serving === "bottle") return bottleSizes;
  return canSizes;
}

// Variant lists per location — defines what each location stocks
// Pubs lean Irish + local German; bars lean trendy international + local;
// restaurants lean Bavarian + premium; supermarkets carry almost everything.

const pubVariants = [
  "variant-guinness-stout",
  "variant-kilkenny-red-ale",
  "variant-murphys-stout",
  "variant-murphys-red",
  "variant-flensburger-pils",
  "variant-holsten-pils",
  "variant-holsten-export",
  "variant-astra-pils",
  "variant-astra-urtyp",
  "variant-becks-pils",
  "variant-jever-pils",
  "variant-reissdorf-koelsch",
  "variant-heineken-lager",
];

const barVariants = [
  "variant-heineken-lager",
  "variant-stella-lager",
  "variant-corona-extra",
  "variant-becks-pils",
  "variant-becks-gold",
  "variant-astra-pils",
  "variant-flensburger-pils",
  "variant-flensburger-weizen",
  "variant-holsten-pils",
  "variant-jever-pils",
  "variant-veltins-pils",
  "variant-warsteiner-pils",
  "variant-bitburger-pils",
  "variant-krombacher-pils",
  "variant-guinness-stout",
];

const restaurantVariants = [
  "variant-paulaner-hefeweizen",
  "variant-paulaner-maerzen",
  "variant-paulaner-dunkel",
  "variant-erdinger-hefeweizen",
  "variant-erdinger-dunkel",
  "variant-weihenstephaner-hefeweizen",
  "variant-weihenstephaner-pils",
  "variant-augustiner-lager",
  "variant-augustiner-hefeweizen",
  "variant-spaten-maerzen",
  "variant-spaten-lager",
  "variant-hacker-pschorr-hefeweizen",
  "variant-hacker-pschorr-dunkel",
  "variant-bitburger-pils",
  "variant-flensburger-pils",
  "variant-radeberger-pils",
];

const supermarketVariants = [
  "variant-becks-pils",
  "variant-becks-gold",
  "variant-astra-pils",
  "variant-astra-urtyp",
  "variant-flensburger-pils",
  "variant-flensburger-weizen",
  "variant-holsten-pils",
  "variant-holsten-export",
  "variant-jever-pils",
  "variant-jever-fun",
  "variant-erdinger-hefeweizen",
  "variant-erdinger-dunkel",
  "variant-paulaner-hefeweizen",
  "variant-paulaner-maerzen",
  "variant-weihenstephaner-hefeweizen",
  "variant-warsteiner-pils",
  "variant-bitburger-pils",
  "variant-krombacher-pils",
  "variant-krombacher-weizen",
  "variant-veltins-pils",
  "variant-radeberger-pils",
  "variant-oettinger-pils",
  "variant-oettinger-weizen",
  "variant-koenigsbacher-pils",
  "variant-heineken-lager",
  "variant-stella-lager",
  "variant-corona-extra",
  "variant-guinness-stout",
];

const variantsByLocationType: Record<string, string[]> = {
  pub: pubVariants,
  bar: barVariants,
  restaurant: restaurantVariants,
  supermarket: supermarketVariants,
};

// Per-location overrides: additional variants or size/price tweaks can be added here.
// Keys are locationIds; values are extra variantIds stocked at that location.
const extraVariants: Record<string, string[]> = {
  "pogue-mahone": ["variant-reissdorf-koelsch"],
  "tap-room-kiel": ["variant-reissdorf-koelsch", "variant-augustiner-lager"],
  "foerde-brauhaus": ["variant-reissdorf-koelsch"],
  "brauhaus-am-schloss": ["variant-reissdorf-koelsch"],
  "kaufland-hassee": ["variant-augustiner-lager", "variant-augustiner-hefeweizen"],
};

function roundToNearest5(cents: number): number {
  return Math.round(cents / 5) * 5;
}

function computePrice(
  variantId: string,
  serving: Serving,
  sizeMl: number,
  locationType: string,
): number {
  const base = basePriceCentsMap[variantId] ?? 400;
  const mult = locationTypeMultiplier[locationType] ?? 1.0;

  // Normalize to 500 ml equivalent, then scale to actual size
  const sizeRatio = sizeMl / 500;

  // Tap carries a premium over bottle/can
  const servingFactor = serving === "tap" ? 1.15 : serving === "can" ? 0.92 : 1.0;

  const raw = base * mult * sizeRatio * servingFactor;
  return roundToNearest5(raw);
}

function buildOffers(): OfferSpec[] {
  const offers: OfferSpec[] = [];
  const seen = new Set<string>();

  for (const location of locationSeed) {
    const locType = location.locationType as string;
    const servings = locationServingMatrix[locType] ?? ["bottle"];
    const baseVariants = variantsByLocationType[locType] ?? [];
    const extras = extraVariants[location.id] ?? [];
    const variants = [...new Set([...baseVariants, ...extras])];

    for (const variantId of variants) {
      for (const serving of servings) {
        // Each location stocks one canonical size per serving type per variant
        const sizes = sizesForServing(serving);
        // Pick a single canonical size per variant+serving for on-premise; supermarkets get all sizes
        const selectedSizes = locType === "supermarket" ? sizes : [sizes[sizes.length - 1]];

        for (const sizeMl of selectedSizes) {
          const uniqueKey = `${location.id}|${variantId}|${sizeMl}|${serving}`;
          if (seen.has(uniqueKey)) continue;
          seen.add(uniqueKey);

          const offerIndex = offers.length + 1;
          const priceCents = computePrice(variantId, serving, sizeMl, locType);

          offers.push({
            id: `offer-${String(offerIndex).padStart(4, "0")}`,
            variantId,
            sizeMl,
            serving,
            priceCents,
            locationId: location.id,
          });
        }
      }
    }
  }

  return offers;
}

const reviewSeed = [
  {
    locationId: "pogue-mahone",
    authorEmail: "anna@example.com",
    rating: 5,
    title: "Consistently great pint",
    body: "Guinness is poured well and the service is friendly.",
  },
  {
    locationId: "pogue-mahone",
    authorEmail: "lars@example.com",
    rating: 4,
    title: "Good atmosphere",
    body: "Slightly pricey, but a solid pub with fresh tap options.",
  },
  {
    locationId: "foerde-brauhaus",
    authorEmail: "anna@example.com",
    rating: 4,
    title: "Good food pairing",
    body: "Beer menu fits the kitchen well and serving sizes are fair.",
  },
  {
    locationId: "marktfrisch-kiel",
    authorEmail: "lars@example.com",
    rating: 3,
    title: "Cheap and practical",
    body: "Great prices, but the selection rotates a lot.",
  },
  {
    locationId: "hafenkante-bar",
    authorEmail: "anna@example.com",
    rating: 5,
    title: "Best view in Kiel",
    body: "The harbour views alone are worth it. Good tap selection too.",
  },
  {
    locationId: "strandbar-schilksee",
    authorEmail: "lars@example.com",
    rating: 4,
    title: "Summery and relaxed",
    body: "Great spot for a cold one after sailing. Can gets warm though.",
  },
  {
    locationId: "tap-room-kiel",
    authorEmail: "anna@example.com",
    rating: 5,
    title: "Best tap range in the city",
    body: "They rotate the taps regularly and always have something interesting.",
  },
  {
    locationId: "rewe-altstadt",
    authorEmail: "lars@example.com",
    rating: 3,
    title: "Convenient location",
    body: "Good everyday range, prices are fair for a city-centre supermarket.",
  },
] as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running the seed script.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Clear all domain data in dependency order
    await prisma.review.deleteMany();
    await prisma.offerPriceHistory.deleteMany();
    await prisma.priceUpdateProposal.deleteMany();
    await prisma.beerOffer.deleteMany();
    await prisma.beerVariant.deleteMany();
    await prisma.beerBrand.deleteMany();
    await prisma.beerStyle.deleteMany();
    await prisma.location.deleteMany();

    // Seed users for reviews
    const anna = await prisma.user.upsert({
      where: { email: "anna@example.com" },
      update: { displayName: "Anna" },
      create: { email: "anna@example.com", displayName: "Anna" },
    });

    const lars = await prisma.user.upsert({
      where: { email: "lars@example.com" },
      update: { displayName: "Lars" },
      create: { email: "lars@example.com", displayName: "Lars" },
    });

    const reviewUserIdByEmail = new Map<string, string>([
      [anna.email, anna.id],
      [lars.email, lars.id],
    ]);

    // Locations
    for (const location of locationSeed) {
      await prisma.location.create({
        data: {
          id: location.id,
          name: location.name,
          locationType: location.locationType,
          district: location.district,
          address: location.address,
          status: "approved",
        },
      });
    }

    // Beer styles
    for (const style of beerStyleSeed) {
      await prisma.beerStyle.create({ data: { id: style.id, name: style.name } });
    }

    // Beer brands
    for (const brand of beerBrandSeed) {
      await prisma.beerBrand.create({
        data: { id: brand.id, name: brand.name, status: "approved" },
      });
    }

    // Beer variants
    for (const variant of beerVariantSeed) {
      await prisma.beerVariant.create({
        data: {
          id: variant.id,
          name: variant.name,
          brandId: variant.brandId,
          styleId: variant.styleId,
          status: "approved",
        },
      });
    }

    // Build and insert offers
    const offers = buildOffers();

    console.log(`Generating ${offers.length} beer offers…`);

    for (const offer of offers) {
      const variant = beerVariantSeed.find((v) => v.id === offer.variantId);
      if (!variant) {
        throw new Error(`Missing variant '${offer.variantId}' for offer '${offer.id}'.`);
      }

      const brand = beerBrandSeed.find((b) => b.id === variant.brandId);
      if (!brand) {
        throw new Error(`Missing brand '${variant.brandId}' for variant '${variant.id}'.`);
      }

      await prisma.beerOffer.create({
        data: {
          id: offer.id,
          brand: brand.name,
          variant: variant.name,
          variantId: offer.variantId,
          sizeMl: offer.sizeMl,
          serving: offer.serving,
          priceCents: offer.priceCents,
          locationId: offer.locationId,
          status: "approved",
        },
      });

      await prisma.offerPriceHistory.create({
        data: {
          id: `history-${offer.id}`,
          beerOfferId: offer.id,
          priceCents: offer.priceCents,
        },
      });
    }

    // Reviews
    for (const review of reviewSeed) {
      const userId = reviewUserIdByEmail.get(review.authorEmail);
      if (!userId) {
        throw new Error(`Missing seed user for email '${review.authorEmail}'.`);
      }

      await prisma.review.create({
        data: {
          locationId: review.locationId,
          userId,
          rating: review.rating,
          title: review.title,
          body: review.body,
          status: "approved",
        },
      });
    }

    console.log(
      `Seed complete: ${locationSeed.length} locations, ${beerBrandSeed.length} brands, ` +
        `${beerVariantSeed.length} variants, ${offers.length} offers.`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to seed database", error);
  process.exit(1);
});
