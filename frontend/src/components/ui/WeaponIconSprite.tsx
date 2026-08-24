import type { CSSProperties } from "react";
import {
  getWeaponIconSpritePosition,
  WEAPON_ICON_SPRITE_COLUMNS,
  WEAPON_ICON_SPRITE_ROWS,
  WEAPON_ICON_SPRITE_URL,
} from "@/generated/weaponIconSprite";
import { cn } from "@/lib/utils";

interface WeaponIconSpriteProps {
  code: number;
  size?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function WeaponIconSprite({
  code,
  size = 12,
  label,
  className,
  style,
}: WeaponIconSpriteProps) {
  const position = getWeaponIconSpritePosition(code);
  if (!position) return null;

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-weapon-code={code}
      className={cn("inline-block shrink-0 bg-no-repeat", className)}
      style={{
        width: size,
        height: size,
        backgroundImage: `url("${WEAPON_ICON_SPRITE_URL}")`,
        backgroundPosition: `${-position.column * size}px ${-position.row * size}px`,
        backgroundSize: `${WEAPON_ICON_SPRITE_COLUMNS * size}px ${WEAPON_ICON_SPRITE_ROWS * size}px`,
        ...style,
      }}
    />
  );
}
