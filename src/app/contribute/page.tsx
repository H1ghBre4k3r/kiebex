import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { locationTypeLabel } from "@/lib/display";
import {
  getBeerStyles,
  getContributableBeerBrands,
  getContributableBeerVariants,
  getContributableLocations,
} from "@/lib/query";
import { BrandForm } from "./brand-form";
import { LocationForm } from "./location-form";
import { OfferForm } from "./offer-form";
import { VariantForm } from "./variant-form";
import { ContributionTabs } from "./contribution-tabs";
import styles from "./contribute.module.css";

export default async function ContributePage() {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const [locations, brands, variants, stylesList] = await Promise.all([
    getContributableLocations(authUser.id),
    getContributableBeerBrands(authUser.id),
    getContributableBeerVariants(authUser.id),
    getBeerStyles(),
  ]);

  const locationOptions = locations.map((location) => ({
    id: location.id,
    name: `${location.name} - ${locationTypeLabel(location.locationType)}`,
    status: location.status,
  }));

  const brandOptions = brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    status: brand.status,
  }));

  const variantOptions = variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    brandId: variant.brandId,
    styleName: variant.style?.name ?? "Unknown style",
    status: variant.status,
  }));

  const tabs = [
    {
      id: "offer",
      label: "Submit Offer",
      content: (
        <>
          <h2 className={styles.tabHeading}>Submit Offer or Price Update</h2>
          {locationOptions.length === 0 ||
          brandOptions.length === 0 ||
          variantOptions.length === 0 ? (
            <p className={styles.notice}>
              You need at least one location, brand, and variant to submit an offer.
            </p>
          ) : (
            <OfferForm
              locations={locationOptions}
              brands={brandOptions}
              variants={variantOptions}
            />
          )}
        </>
      ),
    },
    {
      id: "location",
      label: "New Location",
      content: (
        <>
          <h2 className={styles.tabHeading}>Submit Location</h2>
          <LocationForm />
        </>
      ),
    },
    {
      id: "brand",
      label: "New Brand",
      content: (
        <>
          <h2 className={styles.tabHeading}>Submit Brand</h2>
          <BrandForm />
        </>
      ),
    },
    {
      id: "variant",
      label: "New Variant",
      content: (
        <>
          <h2 className={styles.tabHeading}>Submit Variant</h2>
          {brandOptions.length === 0 || stylesList.length === 0 ? (
            <p className={styles.notice}>
              You need at least one contributable brand and one available style to submit a variant.
            </p>
          ) : (
            <VariantForm brands={brandOptions} styleOptions={stylesList} />
          )}
        </>
      ),
    },
  ];

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

      <section className={styles.panel}>
        <h1>Contribute</h1>
        <p>
          Submit locations, brands, variants, and offers. New submissions and price updates are
          reviewed through moderation before they become public.
        </p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong>.
        </p>
      </section>

      <ContributionTabs tabs={tabs} />
    </main>
  );
}
