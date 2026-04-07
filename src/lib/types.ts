export type ServingType = "tap" | "bottle" | "can";

export type LocationType = "pub" | "bar" | "restaurant" | "supermarket";

export type BeerOffer = {
  id: string;
  brand: string;
  variant: string;
  sizeMl: number;
  serving: ServingType;
  priceEur: number;
  locationId: string;
};

export type Location = {
  id: string;
  name: string;
  locationType: LocationType;
  district: string;
  address: string;
};

export type BeerOfferWithLocation = BeerOffer & {
  location: Location;
};

export type BeerQuery = {
  brand?: string;
  variant?: string;
  sizeMl?: number;
  serving?: ServingType;
  locationType?: LocationType;
  locationId?: string;
};
