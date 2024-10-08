import { getKeys } from 'svag-utils'
import { z } from 'zod'

const possibleCurrencySymbolMap = {
  usd: '$',
  rub: '₽',
  gbp: '£',
  eur: '€',
  usdt: '₮',
}
const possibleCurrencies = getKeys(possibleCurrencySymbolMap)
type PossibleCurrency = (typeof possibleCurrencies)[number]

export const createMoneyThings = <TCurrency extends PossibleCurrency>({
  currencies,
  defaultAmountType = 'integerWithDecimals',
  defaultCurrency = currencies[0],
  defaultDecimalPoint = ',',
  defaultDecimalPolicy = 'hideIfZero',
  defaultThousandsSeparator = ' ',
  defaultSymbolPosition = 'before',
  defaultSymbolDelimiter = '',
  currencySymbolMap = possibleCurrencySymbolMap,
}: {
  currencies: TCurrency[]
  defaultAmountType?: 'integerWithDecimals' | 'floatNumber'
  defaultCurrency?: TCurrency
  defaultDecimalPoint?: string
  defaultDecimalPolicy?: 'hideIfZero' | 'showAlways' | 'hideAlways'
  defaultThousandsSeparator?: string
  defaultSymbolPosition?: 'before' | 'after'
  defaultSymbolDelimiter?: string
  currencySymbolMap?: Partial<Record<TCurrency, string>>
}) => {
  const zCurrency = z.enum(currencies as [TCurrency, ...TCurrency[]])

  const integerWithDecimalsToAmountString = ({
    amount,
    decimalPoint = defaultDecimalPoint,
    thousandsSeparator = defaultThousandsSeparator,
    decimalPolicy = defaultDecimalPolicy,
  }: {
    amount: number | bigint
    decimalPoint?: string
    thousandsSeparator?: string
    decimalPolicy?: 'hideIfZero' | 'showAlways' | 'hideAlways'
  }) => {
    const amountFloatNumber = integerWithDecimalsToFloatNumber(amount)
    const amountNiceString = amountFloatNumber.toLocaleString('de-DE')
    const amountNiceSuitableString = (() => {
      const [nondecimals, decimals] = amountNiceString.split(',')
      if (decimalPolicy === 'showAlways') {
        if (!decimals) {
          return amountNiceString + ',00'
        }
        if (decimals.length === 1) {
          return amountNiceString + '0'
        }
        return nondecimals + ',' + decimals.slice(0, 2)
      }
      if (decimalPolicy === 'hideAlways') {
        return nondecimals
      }
      // decimalPolicy === hideIfZero
      if (!decimals) {
        return nondecimals
      }
      if (decimals.length === 1) {
        return amountNiceString + '0'
      }
      return nondecimals + ',' + decimals.slice(0, 2)
    })()
    return amountNiceSuitableString.replace(/\./g, thousandsSeparator).replace(/,/g, decimalPoint)
  }

  const amountStringToIntegerWithDecimals = ({
    amountString,
    decimalPoint = defaultDecimalPoint,
    thousandsSeparator = defaultThousandsSeparator,
  }: {
    amountString: string
    decimalPoint?: string
    thousandsSeparator?: string
  }) => {
    const amountStringWithoutThousandsSeparator = amountString.replace(new RegExp(thousandsSeparator, 'g'), '')
    const amountStringWithoutDecimalPoint = amountStringWithoutThousandsSeparator.replace(decimalPoint, '.')
    return Math.round(parseFloat(amountStringWithoutDecimalPoint) * 100)
  }

  const floatNumberToIntegerWithDecimals = (number: number) => Math.round(number * 100)

  const integerWithDecimalsToFloatNumber = (integerWithDecimals: number | bigint) =>
    typeof integerWithDecimals === 'bigint' ? Number(integerWithDecimals) / 100 : integerWithDecimals / 100

  const floatNumberToAmountString = ({
    amount,
    decimalPoint = defaultDecimalPoint,
    thousandsSeparator = defaultThousandsSeparator,
    decimalPolicy = defaultDecimalPolicy,
  }: {
    amount: number
    decimalPoint?: string
    thousandsSeparator?: string
    decimalPolicy?: 'hideIfZero' | 'showAlways' | 'hideAlways'
  }) => {
    const amountWithDecimals = floatNumberToIntegerWithDecimals(amount)
    return integerWithDecimalsToAmountString({
      amount: amountWithDecimals,
      decimalPoint,
      thousandsSeparator,
      decimalPolicy,
    })
  }

  const amountStringToFloatNumber = ({
    amountString,
    decimalPoint = defaultDecimalPoint,
    thousandsSeparator = defaultThousandsSeparator,
  }: {
    amountString: string
    decimalPoint?: string
    thousandsSeparator?: string
  }) => {
    const amountWithDecimals = amountStringToIntegerWithDecimals({ amountString, decimalPoint, thousandsSeparator })
    return integerWithDecimalsToFloatNumber(amountWithDecimals)
  }

  type ToMoneyProps = {
    amount: number | bigint
    amountType?: 'integerWithDecimals' | 'floatNumber'
    currency?: TCurrency
    decimalPoint?: string
    decimalPolicy?: 'hideIfZero' | 'showAlways' | 'hideAlways'
    thousandsSeparator?: string
    symbol?: string
    symbolPosition?: 'before' | 'after'
    symbolDelimiter?: string
    hideSymbol?: boolean
  }
  const toMoney = (...args: [ToMoneyProps] | [number | bigint] | [number | bigint, Omit<ToMoneyProps, 'amount'>]) => {
    const {
      amount,
      amountType = defaultAmountType,
      currency = defaultCurrency,
      decimalPoint = defaultDecimalPoint,
      decimalPolicy = defaultDecimalPolicy,
      thousandsSeparator = defaultThousandsSeparator,
      symbol = currencySymbolMap[currency],
      symbolPosition = defaultSymbolPosition,
      symbolDelimiter = defaultSymbolDelimiter,
      hideSymbol = false,
    } = (() => {
      if (args.length === 1) {
        if (typeof args[0] === 'number') {
          return { amount: args[0] }
        } else {
          return args[0]
        }
      } else {
        const [amount, rest] = args
        return { ...rest, amount }
      }
    })() as ToMoneyProps
    const amountWithDecimals =
      amountType === 'integerWithDecimals'
        ? typeof amount === 'bigint'
          ? amount
          : Math.round(amount)
        : typeof amount === 'bigint'
          ? floatNumberToIntegerWithDecimals(Number(amount))
          : floatNumberToIntegerWithDecimals(amount)
    const amountString = integerWithDecimalsToAmountString({
      amount: amountWithDecimals,
      decimalPoint,
      thousandsSeparator,
      decimalPolicy,
    })
    const amountWithSymbol = (() => {
      if (hideSymbol) {
        return amountString
      }
      if (symbolPosition === 'before') {
        return `${symbol}${symbolDelimiter}${amountString}`
      } else {
        return `${amountString}${symbolDelimiter}${symbol}`
      }
    })()
    return amountWithSymbol
  }

  const safeDefaultDecimalPoint = defaultDecimalPoint.length === 1 ? defaultDecimalPoint : '.'
  const escapedDefaultDecimalPoint = safeDefaultDecimalPoint === '.' ? '\\.' : safeDefaultDecimalPoint
  const amountStringRegex = new RegExp(`^\\s*\\d(\\s*\\d*)*(${escapedDefaultDecimalPoint}\\d{0,2})?$`, 'u')
  const zAmountRaw = z
    .string()
    .regex(amountStringRegex, 'Should be a positive number with optional two decimal places')
    .refine(
      (value) => {
        const number = parseFloat(value.replace(/\s/g, '').replace(defaultThousandsSeparator, ''))
        return !Number.isNaN(number) && number >= 0
      },
      {
        message: 'Should be a positive number with with optional two decimal places',
      }
    )
  const zAmountRawLimited = (min: number, max: number) => {
    const niceMin = integerWithDecimalsToAmountString({
      amount: min,
      decimalPoint: defaultDecimalPoint,
      thousandsSeparator: defaultThousandsSeparator,
      decimalPolicy: 'showAlways',
    })
    const niceMax = integerWithDecimalsToAmountString({
      amount: max,
      decimalPoint: defaultDecimalPoint,
      thousandsSeparator: defaultThousandsSeparator,
      decimalPolicy: 'showAlways',
    })
    return zAmountRaw.refine(
      (value) => {
        const number = parseFloat(value.replace(/\s/g, '').replace(defaultThousandsSeparator, ''))
        return !Number.isNaN(number) && number >= min / 100 && number <= max / 100
      },
      {
        message:
          'Should be a positive number with with optional two decimal places not more than ' +
          niceMax +
          ' and not less than ' +
          niceMin,
      }
    )
  }

  const zAmountIntegerWithDecimals = zAmountRaw.transform((value) =>
    amountStringToIntegerWithDecimals({ amountString: value })
  )
  const zAmountIntegerWithDecimalsLimited = (min: number, max: number) =>
    zAmountRawLimited(min, max).transform((value) => amountStringToIntegerWithDecimals({ amountString: value }))

  const zAmountFloatNumber = zAmountRaw.transform((value) => amountStringToFloatNumber({ amountString: value }))
  const zAmountFloatNumberLimited = (min: number, max: number) =>
    zAmountRawLimited(min, max).transform((value) => amountStringToFloatNumber({ amountString: value }))

  return {
    toMoney,
    zCurrency,
    currencies,
    currencySymbolMap,
    integerWithDecimalsToAmountString,
    amountStringToIntegerWithDecimals,
    floatNumberToIntegerWithDecimals,
    integerWithDecimalsToFloatNumber,
    floatNumberToAmountString,
    amountStringToFloatNumber,
    zAmountIntegerWithDecimals,
    zAmountIntegerWithDecimalsLimited,
    zAmountFloatNumber,
    zAmountFloatNumberLimited,
  }
}
