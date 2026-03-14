export declare class EquipmentQueryDto {
    characterCode: string;
    tier?: string;
    patchVersion?: string;
    mainCore?: string;
    bestWeapon?: string;
}
export declare class TraitsMainQueryDto {
    characterCode: string;
    tier?: string;
    patchVersion?: string;
    bestWeapon?: string;
}
export declare class TraitsOptionsQueryDto extends TraitsMainQueryDto {
    mainCore?: string;
}
