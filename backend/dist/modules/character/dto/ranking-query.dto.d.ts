export declare enum TierGroup {
    DIAMOND = "DIAMOND",
    METEORITE = "METEORITE",
    MITHRIL = "MITHRIL",
    IN1000 = "IN1000"
}
export declare class RankingQueryDto {
    patchVersion?: string;
    tier?: TierGroup;
}
export declare class CharacterStatsQueryDto {
    patchVersion?: string;
    tier?: TierGroup;
}
