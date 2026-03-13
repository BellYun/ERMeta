require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const { data: patches } = await supabase
    .from("PatchVersion")
    .select("version")
    .eq("isActive", true)
    .order("startDate", { ascending: false })
    .limit(1);

  const patch = patches && patches[0] ? patches[0].version : null;
  console.log("패치:", patch);

  const { data } = await supabase
    .from("CharacterStats")
    .select("totalGames,tier")
    .eq("patchVersion", patch);

  if (!data) { console.log("데이터 없음"); return; }

  const tiers = {};
  let total = 0;
  for (const r of data) {
    tiers[r.tier] = (tiers[r.tier] || 0) + r.totalGames;
    total += r.totalGames;
  }
  console.log("티어별:", tiers);
  console.log("전체 합계:", total.toLocaleString(), "판");
})();
