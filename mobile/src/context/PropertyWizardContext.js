import { createContext, useContext, useState } from 'react';

const PropertyWizardContext = createContext(null);

const emptyDraft = {
  propertyType: null,
  listingType: null,
  title: '',
  areaM2: '',
  province: 'İstanbul',
  district: '',
  neighborhood: '',
  price: '',
  priceCurrency: 'TRY',
  deedStatus: '',
  mortgageEligible: false,
  contractEndDate: '',
  rooms: '',
  bathrooms: '',
  floor: '',
  heatingType: '',
  dues: '',
  buildingAge: '',
  hasPool: false,
  hasGym: false,
  hasSecurity: false,
  hasParking: false,
  nearMetro: false,
  view: '',
  facade: '',
  notes: '',
  photoUrls: [],
  extraAttributes: {},
};

export function PropertyWizardProvider({ children }) {
  const [draft, setDraft] = useState(emptyDraft);

  function updateDraft(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function updateExtra(patch) {
    setDraft((d) => ({ ...d, extraAttributes: { ...d.extraAttributes, ...patch } }));
  }

  function resetDraft() {
    setDraft(emptyDraft);
  }

  return (
    <PropertyWizardContext.Provider value={{ draft, updateDraft, updateExtra, resetDraft }}>
      {children}
    </PropertyWizardContext.Provider>
  );
}

export function usePropertyWizard() {
  const ctx = useContext(PropertyWizardContext);
  if (!ctx) {
    throw new Error('usePropertyWizard, PropertyWizardProvider icinde kullanilmali');
  }
  return ctx;
}
