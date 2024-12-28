import { useEffect, useState } from 'react';

export function useGeolocation() {
  const [countryCode, setCountryCode] = useState<string>('US');
  const [currency, setCurrency] = useState<string>('USD');

  useEffect(() => {
    const fetchGeolocation = async () => {
      try {
        const response = await fetch(`https://ipgeolocation.abstractapi.com/v1/?api_key=${import.meta.env.VITE_IPGEOLATION_API_KEY}`);
        if (!response.ok) {
          throw new Error('Failed to fetch geolocation data');
        }
        const data = await response.json();
        setCountryCode(data.country_code || 'US');
        setCurrency(getCurrencyFromCountryCode(data.country_code));
      } catch (error) {
        console.error('Geolocation error:', error);
        // Fallback to default values
        setCountryCode('US');
        setCurrency('USD');
      }
    };

    fetchGeolocation();
  }, []);

  const getCurrencyFromCountryCode = (code: string): string => {
    const mapping: { [key: string]: string } = {
      'US': 'USD',
      'IN': 'INR',
      'GB': 'GBP',
      'CA': 'CAD',
      'AU': 'AUD',
      'DE': 'EUR',
      // Add more mappings as needed
    };
    return mapping[code] || 'USD';
  };

  return { countryCode, currency };
}
