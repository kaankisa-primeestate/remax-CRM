export declare enum PropertyType {
    APARTMENT = "apartment",
    LAND = "land",
    FIELD = "field",
    COMMERCIAL = "commercial",
    TIMESHARE = "timeshare",
    VILLA = "villa",
    OFFICE = "office",
    BUILDING = "building",
    PROJECT = "project",
    HOTEL = "hotel"
}
export declare enum ListingType {
    SALE = "sale",
    RENT = "rent"
}
export declare enum PropertyStatus {
    PENDING_APPROVAL = "pending_approval",
    NEEDS_REVISION = "needs_revision",
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
    contractEndDate: string | null;
    revisionNote: string | null;
    ownerName: string | null;
    ownerPhone: string | null;
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
