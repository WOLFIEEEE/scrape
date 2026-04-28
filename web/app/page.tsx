import { redirect } from "next/navigation";

// Root pushes to the marketing landing. The marketing landing is at /home
// (we keep this redirect tiny so the home content lives in the marketing
// route group with its layout).
export default function RootIndex() {
  redirect("/home");
}
