export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SCR", name: "Seychellois Rupee", symbol: "₨" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" }
];

export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find(c => c.code === code);
}

export function getCurrencySymbol(code: string): string {
  return getCurrency(code)?.symbol || code;
}

export function formatCurrency(amount: number | string | null | undefined, currencyCode: string = "USD"): string {
  if (amount === null || amount === undefined) return "-";
  
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "-";

  const currency = getCurrency(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  
  const decimalPlaces = ["JPY", "KRW", "IDR"].includes(currencyCode) ? 0 : 2;
  
  const formatted = numAmount.toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });

  return `${symbol}${formatted}`;
}

export function formatCurrencyCompact(amount: number | string | null | undefined, currencyCode: string = "USD"): string {
  if (amount === null || amount === undefined) return "-";
  
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "-";

  const currency = getCurrency(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  
  if (numAmount >= 1000000) {
    return `${symbol}${(numAmount / 1000000).toFixed(1)}M`;
  } else if (numAmount >= 1000) {
    return `${symbol}${(numAmount / 1000).toFixed(1)}K`;
  }

  return formatCurrency(numAmount, currencyCode);
}

export interface DualAmount {
  nativeAmount: number;
  nativeCurrency: string;
  baseAmount?: number;
  baseCurrency?: string;
  exchangeRate?: number;
}

export function formatDualAmount(dual: DualAmount): { native: string; base?: string } {
  const native = formatCurrency(dual.nativeAmount, dual.nativeCurrency);
  
  if (dual.baseAmount !== undefined && dual.baseCurrency && dual.nativeCurrency !== dual.baseCurrency) {
    const base = formatCurrency(dual.baseAmount, dual.baseCurrency);
    return { native, base };
  }
  
  return { native };
}

export type CurrencyCode = typeof CURRENCIES[number]["code"];
