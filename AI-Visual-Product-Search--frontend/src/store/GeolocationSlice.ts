import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GeolocationState {
  countryCode: string;
  currency: string;
}

const initialState: GeolocationState = {
  countryCode: 'US', // Default country code
  currency: 'USD',    // Default currency
};

const geolocationSlice = createSlice({
  name: 'geolocation',
  initialState,
  reducers: {
    setGeolocation: (state, action: PayloadAction<GeolocationState>) => {
      state.countryCode = action.payload.countryCode;
      state.currency = action.payload.currency;
    },
  },
});

export const { setGeolocation } = geolocationSlice.actions;
export default geolocationSlice.reducer;