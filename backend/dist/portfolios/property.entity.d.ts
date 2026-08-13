export declare enum PropertyType {
    APARTMENT = "apartment",
    LAND = "land",
    FIELD = "field",
    COMMERCIAL = "commercial",
    TIMESHARE = "timeshare"
}
export declare enum ListingType {
    SALE = "sale",
    RENT = "rent"
}
export declare enum PropertyStatus {
    ACTIVE = "active",
    PASSIVE = "passive",
    SOLD = "sold",
    RENTED = "rented"
}
export declare class Property {
    id: string;
    title: string;
    propertyType: PropertyType;
    listingType: ListingType;
    province: string;
    district: string;
    neighborhood: string;
    areaM2: number;
    price: number;
    priceCurrency: string;
    deedStatus: string;
    mortgageEligible: boolean;
    rooms: string | null;
    bathrooms: number | null;
    floor: string | null;
    heatingType: string | null;
    dues: number | null;
    hasPool: boolean;
    hasGym: boolean;
    hasSecurity: boolean;
    hasParking: boolean;
    nearMetro: boolean;
    view: string | null;
    facade: string | null;
    buildingAge: number | null;
    status: PropertyStatus;
    statusChangedAt: Date | null;
    photoUrls: string[] | null;
    notes: string | null;
    extraAttributes: Record<string, any> | null;
    agentId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
