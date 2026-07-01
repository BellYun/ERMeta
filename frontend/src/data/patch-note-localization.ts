import type { RouteLocale } from "@/i18n/routing";
import type { CharacterPatchNote, PatchChange } from "./10.1";

type LocalizedPatchChange = Pick<PatchChange, "target" | "description" | "valueSummary">;

const LENI_DESCRIPTION =
  "レニは高いスキル回転率を活かし、継続的に優秀な性能を見せています。ピコピコハンマー！(W)のクールダウンを延長し、移動速度増加量を下げることで、スキル回転率と機動力を抑えます。また、エアーホーンガン！(E)のシールド量のレベル係数を下げ、スキル増幅アイテムを十分に備えていなくても発揮できていたサポート能力を下方修正します。";
const MAI_DESCRIPTION =
  "マイは上位アイテムを十分に揃えていない状態でも高い耐久力を見せています。そのため、ショール・ベール(W)の受けるダメージ減少量を下方修正し、マイの安定性を抑えます。加えて、前回のパッチで上方修正されたエクスクルーシブ(R)の体力回復量がやや過剰であると判断し、該当数値の一部をロールバックします。";
const BERNICE_DESCRIPTION =
  "バニスはほとんどの指標で平均以下の統計を記録しています。レベルごとの攻撃力を上げ、基本性能を補います。加えて、狩り罠(W)のスキルレベルによる最大設置数の差により、ゲーム序盤にスキルポイントを投資しなければならなかった不便さを改善します。";
const JOHANN_DESCRIPTION = [
  "ヨハンは優れたサポート能力をもとに、最上位圏のゲームで高い成績を収めています。特に上位アイテムを揃えていない状態でも十分な性能を見せているため、武器熟練度効果と燦爛たる光輝(Q)強化時の体力回復量を下げ、過度な基本性能を抑えます。",
  "神性の香炉(W)は、スキルレベルごとの使用感が変わらないようクールダウンを統一します。ただし、序盤の効率が過度に高くならないよう、移動速度減少効果を段階的に調整し、後半の使用頻度は従来より低くなるよう下方修正します。",
];
const ELEVEN_DESCRIPTION =
  "Elevenは平均ダメージ量と体力回復量の指標でやや物足りない統計を記録しています。カロリーシールド(R)の威力を上方修正し、不足しているダメージ能力を補うとともに、長時間交戦能力を強化します。";
const KENNETH_DESCRIPTION =
  "ケネスは上位アイテムが揃っていない時、過度に弱い性能を見せています。レベルごとの攻撃力を上方修正して基本性能を補い、憤怒の一撃(Q)のダメージ量を上げることで全体的な威力を高めます。";

const EN_LENI_DESCRIPTION =
  "Leni has consistently maintained a high performance due to the frequency she can use her skills. We are increasing the cooldown and reducing the movement speed increase effect on W - Whack-a-mole! to keep her skill combos and mobility in check. Additionally, we are cutting the base level scaling on her E - Air Horn Gun! shield to tone down her ally support utility when she isn't actively building skill amplification items.";
const EN_MAI_DESCRIPTION =
  "Mai currently records an incredibly high level of durability even before securing her build. We are reducing the damage taken reduction effect on W - Shawl Veil to challenge her a bit. Furthermore, we are partially rolling back the health recovery on R - Exclusive as its previous buff made it a bit too much.";
const EN_BERNICE_DESCRIPTION =
  "Bernice is currently recording below-average stats across most brackets. We are increasing his attack power per level to keep his performance in check. We are also giving W - Foothold Trap a flat maximum installation cap during early game so players no longer feel forced to invest early skill points into it just to hold traps.";
const EN_JOHANN_DESCRIPTION = [
  "Johann's outstanding ally support has allowed him to excel at the highest tiers, even when lacking high rarity item builds. To target this base power, we are scaling back his weapon mastery effect and reducing the enhanced healing on Q - Radiant Brilliance.",
  "Additionally, we are standardizing the cooldown of W - Transcendent Censer to 10 seconds across all skill levels to keep the skill's flow consistent, while adjusting its early slow effect to prevent it from being overly powerful from the start.",
];
const EN_ELEVEN_DESCRIPTION =
  "Eleven's been recording underwhelming average damage and HP recovery metrics. We are increasing the power on R - Calorie Cyclone to help her deal better damage and increase her combat sustain.";
const EN_KENNETH_DESCRIPTION =
  "Kenneth can feel exceptionally weak when he hasn't secured his high rarity items. We are increasing his attack power per level to improve his base performance and the damage of Q - Fury Strike to boost his overall power.";

const JA_PATCH_11_5_CHANGES: Record<number, LocalizedPatchChange[]> = {
  2: [
    {
      target: "アヤの正義(P) - シールド吸収量",
      description: [
        "アヤは耐久力がやや不足している状況です。アヤの正義(P)のシールド吸収量を上方修正し、耐久力を強化します。",
      ],
      valueSummary:
        "50/75/100(+攻撃力の50%)(+スキル増幅の35%) → 50/85/120(+攻撃力の50%)(+スキル増幅の35%)",
    },
  ],
  6: [
    {
      target: "石弓 武器熟練度レベル比例基本攻撃増幅",
      description: [
        "石弓ナディンは高い勝率とRP獲得量を記録しています。武器熟練度効果を下げ、ゲーム後半の威力を適正水準に下方修正します。",
      ],
      valueSummary: "1.4% → 1.3%",
    },
  ],
  9: [
    {
      target: "セムテックス爆弾(Q) - 爆発ダメージ増加量",
      description: [
        "セムテックス爆弾(Q)の攻撃時のダメージ増加量を上方修正し、攻撃的にプレイした際のメリットを高めます。",
      ],
      valueSummary:
        "10/15/20/25/30(+攻撃力の7%)(+スキル増幅の4%) → 10/15/20/25/30(+攻撃力の9%)(+スキル増幅の5%)",
    },
  ],
  17: [
    {
      target: "カクテルパーティー(R) - ダメージ量",
      description: [
        "アドリアナは序盤の交戦における威力がやや不足している状態です。カクテルパーティー(R)の序盤レベル区間におけるダメージ量を上方修正し、アドリアナの序盤交戦能力を補います。",
      ],
      valueSummary: "110/155/200(+スキル増幅の40%) → 140/170/200(+スキル増幅の40%)",
    },
  ],
  20: [
    {
      target: "蛇の動き(E) - ダメージ量",
      description: [
        "レノックスはスキル係数の改編後も、ダメージ量の指標で十分な上昇幅が見られていない状況です。蛇の動き(E)の対象の体力に比例するダメージ量を上方修正し、より有意義なダメージを与えられるよう調整します。",
      ],
      valueSummary:
        "60/100/140/180/220(+スキル増幅の50%)(+対象の最大体力の5%) → 60/100/140/180/220(+スキル増幅の50%)(+対象の最大体力の7%)",
    },
  ],
  25: [
    {
      target: "レベル比例攻撃力",
      description: [BERNICE_DESCRIPTION],
      valueSummary: "4.3 → 4.6",
    },
    {
      target: "狩り罠(W) - 最大設置数",
      description: [BERNICE_DESCRIPTION],
      valueSummary: "1/2/2/3/3個 → 2/2/2/3/3個",
    },
  ],
  27: [
    {
      target: "潜入(P) - 近接武器装備時 防御力増加",
      description: [
        "アレックスは優れた補助能力をもとに、継続的に強力な姿を見せています。高い熟練度を基準に見た場合、安定性においても高い指標を示しているため、潜入(P)の防御力増加量を下方修正し、性能を一部抑えます。",
      ],
      valueSummary: "5/10/15 → 4/8/12",
    },
  ],
  30: [
    {
      target: "カロリーシールド(R) - ダメージ量",
      description: [ELEVEN_DESCRIPTION],
      valueSummary: "10/15/20(+攻撃力の3%)(+追加体力の3%) → 10/15/20(+攻撃力の8%)(+追加体力の3%)",
    },
    {
      target: "カロリーシールド(R) - 体力回復量",
      description: [ELEVEN_DESCRIPTION],
      valueSummary: "最大体力の25/40/55% → 30/45/60%",
    },
  ],
  31: [
    {
      target: "弓 武器熟練度レベル比例基本攻撃増幅",
      description: [
        "現在、莉央は十分に成長した後も威力がやや不足しています。武器熟練度の基本攻撃増幅効果を上方修正し、ゲーム後半のポテンシャルをさらに高めます。",
      ],
      valueSummary: "1.2% → 1.3%",
    },
  ],
  35: [
    {
      target: "ウィービング(E) - ダメージ量",
      description: [
        "トンファーヤンは長期間にわたり弱勢が続いています。ウィービング(E)のスキル増幅係数を上方修正し、全体的な性能を強化します。",
      ],
      valueSummary:
        "15/25/35/45/55(+追加攻撃力の100%)(+スキル増幅の45%)(+敵の最大体力の5%) → 20/30/40/50/60(+追加攻撃力の100%)(+スキル増幅の50%)(+敵の最大体力の5%)",
    },
  ],
  38: [
    {
      target: "ペルソナ(E) - ダメージ量",
      description: [
        "ジェニーはゲーム序盤の交戦でダメージ量がやや不足している様子を見せています。ペルソナ(E)の基本ダメージ量を上方修正し、ジェニーが序盤の交戦でも一定水準の威力を発揮できるよう強化します。",
      ],
      valueSummary: "60/90/120/150/180(+スキル増幅の58%) → 60/95/130/165/200(+スキル増幅の58%)",
    },
  ],
  39: [
    {
      target: "ブエルタ(Q) - ダメージ量",
      description: [
        "カミロは非常に高い平均ダメージ量の指標を記録しています。ブエルタ(Q)のダメージ量を下方修正し、過度な威力を抑えます。",
      ],
      valueSummary:
        "10/30/50/70/90(+攻撃力の75%)*(基本攻撃増幅) → 10/30/50/70/90(+攻撃力の70%)*(基本攻撃増幅)",
    },
  ],
  41: [
    {
      target: "アルカナ 武器熟練度レベル比例スキル増幅",
      description: JOHANN_DESCRIPTION,
      valueSummary: "4.4% → 4.3%",
    },
    {
      target: "燦爛たる光輝(Q) - 強化時 体力回復量",
      description: JOHANN_DESCRIPTION,
      valueSummary: "20/35/50/65/80(+スキル増幅の15%) → 25/35/45/55/65(+スキル増幅の15%)",
    },
    {
      target: "神性の香炉(W) - 移動速度減少",
      description: JOHANN_DESCRIPTION,
      valueSummary: "30% → 20/22.5/25/27.5/30%",
    },
    {
      target: "神性の香炉(W) - クールダウン",
      description: JOHANN_DESCRIPTION,
      valueSummary: "11/10.5/10/9.5/9秒 → 10秒",
    },
  ],
  44: [
    {
      target: "VF暴走(R) - エンベノミゼーション[ブラックマンバ] ダメージ量",
      description: [
        "ブラックマンバ・エキオンは、他の武器種に比べて明確な強みを見せられていません。エンベノミゼーション(R)のダメージ量を上方修正し、武器種間の性能差を縮めます。",
      ],
      valueSummary:
        "50/120/175/220(+攻撃力の80%)(+追加体力の12%) → 50/120/175/220(+攻撃力の80%)(+追加体力の14%)",
    },
  ],
  45: [
    {
      target: "ショール・ベール(W) - 受けるダメージ減少",
      description: [MAI_DESCRIPTION],
      valueSummary: "31/32/33/34/35% → 25/27/29/31/33%",
    },
    {
      target: "エクスクルーシブ(R) - 体力回復量",
      description: [MAI_DESCRIPTION],
      valueSummary:
        "50/100/150(+スキル増幅の35%)(+対象の失った体力の15%) → 50/100/150(+スキル増幅の35%)(+対象の失った体力の12%)",
    },
  ],
  48: [
    {
      target: "ブラシストローク(Q) - ダメージ量",
      description: [
        "ティアは最上位圏を除くほとんどの区間で、継続的に平均以下の指標を記録しています。ブラシストローク(Q)の威力を上方修正し、ダメージ能力の低点を補います。",
      ],
      valueSummary: "60/90/120/150/180(+スキル増幅の50%) → 60/90/120/150/180(+スキル増幅の55%)",
    },
  ],
  50: [
    {
      target: "ダブルアクセル(W) - ダメージ量",
      description: [
        "エレナは交戦状況で期待ほどの火力を発揮できていない状況です。ダブルアクセル(W)のダメージ量を上方修正し、相手に与えるプレッシャーを高めます。",
      ],
      valueSummary:
        "50/70/90/110/130(+スキル増幅の50%)(+追加体力の10%) → 50/70/90/110/130(+スキル増幅の55%)(+追加体力の12%)",
    },
  ],
  54: [
    {
      target: "石弓 武器熟練度レベル比例スキル増幅",
      description: [
        "カーラは長期間にわたり、性能を発揮できていない状況です。武器熟練度効果を強化し、全体的な性能を向上させます。",
      ],
      valueSummary: "4.1% → 4.2%",
    },
  ],
  58: [
    {
      target: "40mmグレネード(Q) - 加速ロケット(RQ) ダメージ量",
      description: [
        "ヘイズは低い勝率とRP獲得量を記録しています。加速ロケット(RQ)のダメージ量を上方修正し、ヘイズの強みがより発揮されるよう調整します。",
      ],
      valueSummary: "80/105/130/155/180(+スキル増幅の40%) → 80/110/140/170/200(+スキル増幅の40%)",
    },
  ],
  61: [
    {
      target: "怒ったニャ！(ネコ W) - ダメージ量",
      description: [
        "イレムは現在、ほとんどのティア帯で平均以下の指標を見せています。怒ったニャ！(ネコ W)のダメージ量を上方修正し、威力を補強します。",
      ],
      valueSummary: "40/80/120/160/200(+スキル増幅の75%) → 40/80/120/160/200(+スキル増幅の80%)",
    },
  ],
  68: [
    {
      target: "バウンシングシールド(W) - 受けるダメージ減少",
      description: [
        "アロンソはバウンシングシールド(W)により、交戦で過度な耐久力を見せています。該当スキルの受けるダメージ減少量を下方修正し、性能を抑えます。",
      ],
      valueSummary: "70% → 60%",
    },
  ],
  69: [
    {
      target: "ピコピコハンマー！(W) - 移動速度増加",
      description: [LENI_DESCRIPTION],
      valueSummary: "11/12/13/14/15%(+レニのレベル * 1)% → 8/9/10/11/12%(+レニのレベル * 1)%",
    },
    {
      target: "ピコピコハンマー！(W) - クールダウン",
      description: [LENI_DESCRIPTION],
      valueSummary: "15/14/13/12/11秒 → 16/15/14/13/12秒",
    },
    {
      target: "エアーホーンガン！(E) - シールド量",
      description: [LENI_DESCRIPTION],
      valueSummary:
        "50/65/80/95/110(+レニのレベル * 5)(+スキル増幅の20%) → 50/65/80/95/110(+レニのレベル * 3)(+スキル増幅の20%)",
    },
  ],
  71: [
    {
      target: "レベル比例攻撃力",
      description: [KENNETH_DESCRIPTION],
      valueSummary: "3.9 → 4.2",
    },
    {
      target: "憤怒の一撃(Q) - ダメージ量",
      description: [KENNETH_DESCRIPTION],
      valueSummary:
        "30/40/50/60/70(+攻撃力の165/170/175/180/185%) → 30/40/50/60/70(+攻撃力の170/175/180/185/190%)",
    },
  ],
  78: [
    {
      target: "物干し竿(R) - 追加ダメージ量",
      description: [
        "ヒスイはすべてのティア帯で非常に高いピック率を記録し、強力な姿を維持しています。特に物干し竿(R)発動時の威力が過度に強力であると判断し、追加ダメージ量を下方修正して過度な威力を抑えます。",
      ],
      valueSummary: "20(+追加攻撃力の20/35/50%) → 20(+追加攻撃力の15/30/45%)",
    },
  ],
  79: [
    {
      target: "アストラバースト(R) - ダメージ量",
      description: [
        "ユスティナのアストラバースト(R)は主に生存用途で活用されており、敵に与えるダメージ量はやや物足りない状態です。該当スキルのダメージ量を上方修正し、生存面だけでなく威力面でも十分な性能を発揮できるよう補います。",
      ],
      valueSummary: "30/50/70(+スキル増幅の20%) → 30/50/70(+スキル増幅の22%)",
    },
  ],
  81: [
    {
      target: "シンクロポイント(W) - ダメージ量",
      description: [
        "ニアは平均ダメージ量の指標でやや不足した様子を見せています。シンクロポイント(W)の威力を上方修正し、スキル的中時により確実なダメージを与えられるよう調整します。",
      ],
      valueSummary: "60/100/140/180/220(+スキル増幅の65%) → 60/100/140/180/220(+スキル増幅の70%)",
    },
  ],
  82: [
    {
      target: "剣心一如(P) - 体力回復量",
      description: [
        "シュリンは耐久力と交戦維持力がやや不足しています。剣心一如(P)の体力回復量を上方修正し、シュリンの長時間交戦能力を補強します。",
      ],
      valueSummary: "10/25/40(+攻撃力の35%) → 20/35/50(+攻撃力の40%)",
    },
  ],
  88: [
    {
      target: "基本防御力",
      description: [
        "ビヒョンは継続的に高いピック率と優れた耐久力指標を記録しています。特にゲーム序盤に強い威力を発揮しているため、基本防御力を小幅に下方修正します。",
      ],
      valueSummary: "52 → 50",
    },
  ],
};

const EN_PATCH_11_5_CHANGES: Record<number, LocalizedPatchChange[]> = {
  2: [
    {
      target: "Aya's Justice(P) - Shield Absorption",
      description: [
        "Aya has been finding herself a bit too weak. We are increasing the base shield values on P - Aya's Justice to boost her overall durability.",
      ],
      valueSummary:
        "50/75/100(+Attack Power 50%)(+Skill Amplification 35%) → 50/85/120(+Attack Power 50%)(+Skill Amplification 35%)",
    },
  ],
  6: [
    {
      target: "Basic Attack Amplification per Crossbow Weapon Mastery level",
      description: [
        "We are cutting Nadine's late-game scaling by reducing her weapon mastery effect, as Crossbow Nadine has been maintaining an exceptionally high win rate and score gain.",
      ],
      valueSummary: "1.4% → 1.3%",
    },
  ],
  9: [
    {
      target: "Semtex Bomb(Q) - Explosion Damage Increase",
      description: [
        "We are increasing the damage scaling on Q - Semtex Bomb to award a much higher offensive ceiling when pulling off aggressive plays.",
      ],
      valueSummary:
        "10/15/20/25/30(+Attack Power 7%)(+Skill Amplification 4%) → 10/15/20/25/30(+Attack Power 9%)(+Skill Amplification 5%)",
    },
  ],
  17: [
    {
      target: "Cocktail Party(R) - Damage",
      description: [
        "Adriana's presence in early combat has felt a bit weak. We are increasing the lower level base damage of R - Cocktail Party to give her a much-needed boost during early combat.",
      ],
      valueSummary: "110/155/200(+Skill Amplification 40%) → 140/170/200(+Skill Amplification 40%)",
    },
  ],
  20: [
    {
      target: "Whiplash(E) - Damage",
      description: [
        "Lenox's overall damage output has failed to see a meaningful spike even after her previous skill coefficient adjustments. We are increasing the max HP scaling on E - Whiplash to help her deal more significant damage.",
      ],
      valueSummary:
        "60/100/140/180/220(+Skill Amplification 50%)(+Target's Max HP 5%) → 60/100/140/180/220(+Skill Amplification 50%)(+Target's Max HP 7%)",
    },
  ],
  25: [
    {
      target: "Attack Power per level",
      description: [EN_BERNICE_DESCRIPTION],
      valueSummary: "4.3 → 4.6",
    },
    {
      target: "Foothold Trap(W) - Max Installations",
      description: [EN_BERNICE_DESCRIPTION],
      valueSummary: "1/2/2/3/3 → 2/2/2/3/3",
    },
  ],
  27: [
    {
      target: "Infiltration(P) - Melee Weapon Defense Increase",
      description: [
        "Alex continues to show a strong performance due to his exceptional utility, showing remarkably safe stats at high masteries. We are reducing the melee weapon defense bonus on P - Infiltration to keep his defensive power in check.",
      ],
      valueSummary: "5/10/15 → 4/8/12",
    },
  ],
  30: [
    {
      target: "Calorie Cyclone(R) - Damage",
      description: [EN_ELEVEN_DESCRIPTION],
      valueSummary:
        "10/15/20(+Attack Power 3%)(+Additional HP 3%) → 10/15/20(+Attack Power 8%)(+Additional HP 3%)",
    },
    {
      target: "Calorie Cyclone(R) - HP Recovery",
      description: [EN_ELEVEN_DESCRIPTION],
      valueSummary: "Max HP 25/40/55% → 30/45/60%",
    },
  ],
  31: [
    {
      target: "Basic Attack Amplification per Bow Weapon Mastery level",
      description: [
        "Rio has been showing a weak performance even after completing her builds. We are buffing the basic attack amplification on her Weapon Mastery to increase her late-game power ceiling.",
      ],
      valueSummary: "1.2% → 1.3%",
    },
  ],
  35: [
    {
      target: "Bob and Weave(E) - Damage",
      description: [
        "Tonfa Jan has been trapped in a weak spot for quite some time. We are increasing the skill amplification coefficient on E - Bob and Weave to boost his overall performance.",
      ],
      valueSummary:
        "15/25/35/45/55(+Extra Attack Power 100%)(+Skill Amplification 45%)(+Target's Max HP 5%) → 20/30/40/50/60(+Extra Attack Power 100%)(+Skill Amplification 50%)(+Target's Max HP 5%)",
    },
  ],
  38: [
    {
      target: "Persona(E) - Damage",
      description: [
        "Jenny has been recording underwhelming damage during early-game combat. We are increasing the base damage of E - Persona to ensure she can exert power even during early combat.",
      ],
      valueSummary:
        "60/90/120/150/180(+Skill Amplification 58%) → 60/95/130/165/200(+Skill Amplification 58%)",
    },
  ],
  39: [
    {
      target: "Vuelta(Q) - Damage",
      description: [
        "Camilo has been recording excessively high average damage metrics. We are reducing his power on Q - Vuelta to keep his offensive output in check.",
      ],
      valueSummary:
        "10/30/50/70/90(+Attack Power 75%)*(Basic Attack Amplification) → 10/30/50/70/90(+Attack Power 70%)*(Basic Attack Amplification)",
    },
  ],
  41: [
    {
      target: "Skill Amp per Arcana Mastery Level",
      description: EN_JOHANN_DESCRIPTION,
      valueSummary: "4.4% → 4.3%",
    },
    {
      target: "Radiant Brilliance(Q) - Enhanced HP Recovery",
      description: EN_JOHANN_DESCRIPTION,
      valueSummary:
        "20/35/50/65/80(+Skill Amplification 15%) → 25/35/45/55/65(+Skill Amplification 15%)",
    },
    {
      target: "Transcendent Censer(W) - Slowed",
      description: EN_JOHANN_DESCRIPTION,
      valueSummary: "30% → 20/22.5/25/27.5/30%",
    },
    {
      target: "Transcendent Censer(W) - Cooldown",
      description: EN_JOHANN_DESCRIPTION,
      valueSummary: "11/10.5/10/9.5/9s → 10s",
    },
  ],
  44: [
    {
      target: "VF Overflow(R) - Envenomization[Black Mamba] Damage",
      description: [
        "Black Mamba Echion has struggled to showcase a distinct advantage compared to other weapon variations. We are increasing the damage of his R - VF Overflow (Envenomization) to narrow the performance gap between his weapons.",
      ],
      valueSummary:
        "50/120/175/220(+Attack Power 80%)(+Additional HP 12%) → 50/120/175/220(+Attack Power 80%)(+Additional HP 14%)",
    },
  ],
  45: [
    {
      target: "Shawl Veil(W) - Damage Taken Reduction",
      description: [EN_MAI_DESCRIPTION],
      valueSummary: "31/32/33/34/35% → 25/27/29/31/33%",
    },
    {
      target: "Exclusive(R) - HP Recovery",
      description: [EN_MAI_DESCRIPTION],
      valueSummary:
        "50/100/150(+Skill Amplification 35%)(+Target's Lost HP 15%) → 50/100/150(+Skill Amplification 35%)(+Target's Lost HP 12%)",
    },
  ],
  48: [
    {
      target: "Brush Stroke(Q) - Damage",
      description: [
        "Tia continues to underperform across the vast majority of skill brackets, excluding the highest tier. We are increasing the damage of Q - Brush Stroke to help her out.",
      ],
      valueSummary:
        "60/90/120/150/180(+Skill Amplification 50%) → 60/90/120/150/180(+Skill Amplification 55%)",
    },
  ],
  50: [
    {
      target: "Double Axel(W) - Damage",
      description: [
        "Elena has been failing to bring enough offensive threat to fights. We are increasing the damage on W - Double Axel to let her apply more significant pressure to her targets.",
      ],
      valueSummary:
        "50/70/90/110/130(+Skill Amplification 50%)(+Additional HP 10%) → 50/70/90/110/130(+Skill Amplification 55%)(+Additional HP 12%)",
    },
  ],
  54: [
    {
      target: "Skill Amp per Crossbow Mastery Level",
      description: [
        "Karla has been continuously underperforming for an extended period. We are increasing her weapon mastery scaling to give her an overall performance boost.",
      ],
      valueSummary: "4.1% → 4.2%",
    },
  ],
  58: [
    {
      target: "40mm Grenade(Q) - Rocket Acceleration(RQ) Damage",
      description: [
        "Haze has recorded a low win rate and score gains. We are increasing the damage of her RQ - Rocket Acceleration to help her play into her intended strengths more effectively.",
      ],
      valueSummary:
        "80/105/130/155/180(+Skill Amplification 40%) → 80/110/140/170/200(+Skill Amplification 40%)",
    },
  ],
  61: [
    {
      target: "Hissy Fit(Cat W) - Damage",
      description: [
        "Irem has been recording below average stats across most brackets. We are increasing the damage of her cat-form W - Hissy Fit to help her power out.",
      ],
      valueSummary:
        "40/80/120/160/200(+Skill Amplification 75%) → 40/80/120/160/200(+Skill Amplification 80%)",
    },
  ],
  68: [
    {
      target: "Bouncing Shield(W) - Damage Taken Reduction",
      description: [
        "Alonso has been showcasing excessive survivability during combat thanks to his W - Bouncing Shield. We are reducing the damage reduction value on W to keep his performance in check.",
      ],
      valueSummary: "70% → 60%",
    },
  ],
  69: [
    {
      target: "Whack-a-mole!(W) - Movement Speed Increase",
      description: [EN_LENI_DESCRIPTION],
      valueSummary: "11/12/13/14/15%(+Leni Level * 1)% → 8/9/10/11/12%(+Leni Level * 1)%",
    },
    {
      target: "Whack-a-mole!(W) - Cooldown",
      description: [EN_LENI_DESCRIPTION],
      valueSummary: "15/14/13/12/11s → 16/15/14/13/12s",
    },
    {
      target: "Air Horn Gun!(E) - Shield",
      description: [EN_LENI_DESCRIPTION],
      valueSummary:
        "50/65/80/95/110(+Leni Level * 5)(+Skill Amplification 20%) → 50/65/80/95/110(+Leni Level * 3)(+Skill Amplification 20%)",
    },
  ],
  71: [
    {
      target: "Attack Power per level",
      description: [EN_KENNETH_DESCRIPTION],
      valueSummary: "3.9 → 4.2",
    },
    {
      target: "Fury Strike(Q) - Damage",
      description: [EN_KENNETH_DESCRIPTION],
      valueSummary:
        "30/40/50/60/70(+Attack Power 165/170/175/180/185%) → 30/40/50/60/70(+Attack Power 170/175/180/185/190%)",
    },
  ],
  78: [
    {
      target: "Monohoshizao(R) - Additional Damage",
      description: [
        "Hisui continues to be an incredibly dominant force, recording a very high pick rate across all tiers. Since her power level while R - Monohoshizao is active is simply too overwhelming, we are reducing its additional damage to keep his overly strong power in check.",
      ],
      valueSummary:
        "20(+Additional Attack Power 20/35/50%) → 20(+Additional Attack Power 15/30/45%)",
    },
  ],
  79: [
    {
      target: "Astra Burst!(R) - Damage",
      description: [
        "Justyna's R - Astra Burst! is primarily being used as a pure survival tool, leaving her actual damage output to enemies lacking. We are increasing the damage on this ultimate so it can serve as a legitimate offensive threat rather than just a survival option.",
      ],
      valueSummary: "30/50/70(+Skill Amplification 20%) → 30/50/70(+Skill Amplification 22%)",
    },
  ],
  81: [
    {
      target: "Point Sink(W) - Damage",
      description: [
        "NiaH's average damage has been falling behind. We are increasing W - Point Sink's damage to ensure it deals more damage on-hit.",
      ],
      valueSummary:
        "60/100/140/180/220(+Skill Amplification 65%) → 60/100/140/180/220(+Skill Amplification 70%)",
    },
  ],
  82: [
    {
      target: "The Chosen One(P) - HP Recovery",
      description: [
        "Xuelin has been struggling in terms of durability and combat sustain. We are increasing the health recovery on P - The Chosen One to boost her power during extended team fights.",
      ],
      valueSummary: "10/25/40(+Attack Power 35%) → 20/35/50(+Attack Power 40%)",
    },
  ],
  88: [
    {
      target: "Base Defense",
      description: [
        "Bihyung continues to record a high pick rate alongside excellent durability stats. Since her early game is notably strong, we are slightly reducing her base defense to keep her in check.",
      ],
      valueSummary: "52 → 50",
    },
  ],
};

const PATCH_CHANGE_LOCALIZATIONS: Partial<
  Record<RouteLocale, Record<string, Record<number, LocalizedPatchChange[]>>>
> = {
  en: {
    "11.5": EN_PATCH_11_5_CHANGES,
  },
  ja: {
    "11.5": JA_PATCH_11_5_CHANGES,
  },
};

export function localizePatchChanges(note: CharacterPatchNote, locale: RouteLocale): PatchChange[] {
  const localizedChanges = PATCH_CHANGE_LOCALIZATIONS[locale]?.[note.patch]?.[note.characterCode];
  if (!localizedChanges) return note.changes;

  return note.changes.map((change, index) => {
    const localizedChange = localizedChanges[index];
    return localizedChange ? { ...change, ...localizedChange } : change;
  });
}

export function localizePatchNote(
  note: CharacterPatchNote,
  locale: RouteLocale
): CharacterPatchNote {
  const changes = localizePatchChanges(note, locale);
  return changes === note.changes ? note : { ...note, changes };
}

export function localizePatchNotes(
  notes: CharacterPatchNote[],
  locale: RouteLocale
): CharacterPatchNote[] {
  return notes.map((note) => localizePatchNote(note, locale));
}
