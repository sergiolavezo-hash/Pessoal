import { redirect } from "next/navigation";

export default function Home() {
  // Middleware sends authenticated users to /dashboard; everyone else signs in.
  redirect("/login");
}
