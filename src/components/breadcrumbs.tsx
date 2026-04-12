import Link from "next/link";

type Crumb = {
  label: string;
  href: string;
};

type Props = {
  crumbs: Crumb[];
};

export function Breadcrumbs({ crumbs }: Props) {
  return (
    <p>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href}>
          {i > 0 && " | "}
          <Link href={crumb.href}>{crumb.label}</Link>
        </span>
      ))}
    </p>
  );
}
