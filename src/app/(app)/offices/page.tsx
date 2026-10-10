import { redirect } from "next/navigation";

/** Offices live on the home page. This route only keeps old links from landing on a second list. */
export default function OfficesPage() {
  redirect("/");
}
