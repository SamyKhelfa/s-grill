import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderingApp from "@/components/OrderingApp";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return <OrderingApp userId={user.id} displayName={profile?.display_name ?? "Toi"} />;
}
