/**
 * Mini.png → 48x48 WebP 변환 스크립트
 * 122x160 PNG (~50KB) → 48x48 WebP (~2KB)
 *
 * Usage: node scripts/generate-mini-webp.mjs
 */
import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");
const OUT_DIR = join(PUBLIC_DIR, "characters/mini");

// characterMap.ts의 CHARACTER_MINI_IMAGES와 동일한 매핑
const CHARACTERS = {
  1: "001. Jackie", 2: "002. Aya", 3: "005. Fiora", 4: "004. Magnus",
  5: "007. Zahir", 6: "006. Nadine", 7: "003. Hyunwoo", 8: "008. Hart",
  9: "009. Isol", 10: "010. Li Dailin", 11: "011. Yuki", 12: "012. Hyejin",
  13: "013. Xiukai", 14: "015. Chiara", 15: "014. Sissela", 16: "018. Silvia",
  17: "016. Adriana", 18: "017. Shoichi", 19: "019. Emma", 20: "020. Lenox",
  21: "021. Rozzi", 22: "022. Luke", 23: "023. Cathy", 24: "024. Adela",
  25: "025. bERnice", 26: "026. Barbara", 27: "027. Alex", 28: "028. Sua",
  29: "029. Leon", 30: "030. Eleven", 31: "031. Rio", 32: "032. William",
  33: "033. Nicky", 34: "034. Nathapon", 35: "035. Jan", 36: "036. Eva",
  37: "037. Daniel", 38: "038. Jenny", 39: "039. Camilo", 40: "040. Chloe",
  41: "041. Johann", 42: "042. Bianca", 43: "043. Celine", 44: "044. Echion",
  45: "045. Mai", 46: "046. Aiden", 47: "047. Laura", 48: "048. Tia",
  49: "049. Felix", 50: "050. Elena", 51: "051. Priya", 52: "052. Adina",
  53: "053. Markus", 54: "054. Karla", 55: "055. Estelle", 56: "056. Piolo",
  57: "057. Martina", 58: "058. Haze", 59: "059. Isaac", 60: "060. Tazia",
  61: "061. Irem", 62: "062. Theodore", 63: "063. Ly anh", 64: "064. Vanya",
  65: "065. Debi & Marlene", 66: "066. Arda", 67: "067. Abigail", 68: "068. Alonso",
  69: "069. Leni", 70: "070. Tsubame", 71: "071. Kenneth", 72: "072. Katja",
  73: "073. Charlotte", 74: "074. Darko", 75: "075. Lenore", 76: "076. Garnet",
  77: "077. Yumin", 78: "078. Hisui", 79: "079. Justyna", 80: "080. István",
  81: "081. NiaH", 82: "082. Xuelin", 83: "083. Henry", 84: "084. Blair",
  85: "085. Mirka", 86: "086. Fenrir",
};

// 일부 캐릭터는 "Default - 기본" 폴더명 사용
const KOREAN_DEFAULT = [24, 25, 26, 27, 31, 32, 33, 34, 36, 47, 48, 49, 54, 55, 56];

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  let success = 0;
  let fail = 0;
  let totalOriginal = 0;
  let totalWebp = 0;

  for (const [codeStr, folderName] of Object.entries(CHARACTERS)) {
    const code = parseInt(codeStr);
    const defaultFolder = KOREAN_DEFAULT.includes(code) ? "02. Default - 기본" : "02. Default";
    const srcPath = join(PUBLIC_DIR, "CharactER", folderName, defaultFolder, "Mini.png");

    if (!existsSync(srcPath)) {
      console.warn(`  SKIP: ${folderName} (Mini.png not found at ${defaultFolder})`);
      fail++;
      continue;
    }

    const outPath = join(OUT_DIR, `${code}.webp`);
    try {
      const originalSize = readFileSync(srcPath).length;
      const webpBuffer = await sharp(srcPath)
        .resize(48, 48, { fit: "cover", position: "top" })
        .webp({ quality: 80 })
        .toBuffer();

      await sharp(srcPath)
        .resize(48, 48, { fit: "cover", position: "top" })
        .webp({ quality: 80 })
        .toFile(outPath);

      totalOriginal += originalSize;
      totalWebp += webpBuffer.length;
      success++;
    } catch (err) {
      console.warn(`  FAIL: ${folderName}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${success} converted, ${fail} failed`);
  console.log(`Original total: ${(totalOriginal / 1024).toFixed(0)} KB`);
  console.log(`WebP total: ${(totalWebp / 1024).toFixed(0)} KB`);
  console.log(`Savings: ${((1 - totalWebp / totalOriginal) * 100).toFixed(1)}%`);
}

main().catch(console.error);
