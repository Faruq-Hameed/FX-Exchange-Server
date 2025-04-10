import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class FxService implements OnModuleInit {
  private readonly logger = new Logger(FxService.name);
  private supportedCurrencies = ['NGN', 'USD', 'EUR', 'GBP']; //updatable by admin
  private cachedRates: Record<string, Record<string, number>> = {};

  constructor(
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Initialize rates on startup
    await this.updateExchangeRates();
  }

  /**  Schedule to update exchange rates every hour this can also be called if needed */
  @Cron(CronExpression.EVERY_HOUR)
  async updateExchangeRates(currencies?: {fromCurrency: string, toCurrency: string}) {
    //  Validate currencies
    const { fromCurrency, toCurrency } = currencies || {};

    try {
      if (currencies) {
        const rate = await this.fetchExternalRates(fromCurrency, toCurrency) as number;
        if (rate) { //update the single rate
      this.logger.log(`Updating exchange rates... for ${fromCurrency} to ${toCurrency}`);

          await this.saveExchangeRate(fromCurrency, toCurrency, rate);
        this.cachedRates[fromCurrency][toCurrency] = rate as number 
        return;
        }
      }
      this.logger.log('Updating exchange rates...');

      // For each supported base currency, fetch rates for all other currencies
      for (const baseCurrency of this.supportedCurrencies) {
        const rates = await this.fetchExternalRates(baseCurrency);

        // Cache rates
        this.cachedRates[baseCurrency] = rates as Record<string, number>;

        // Save to database
        for (const targetCurrency of this.supportedCurrencies) {
          if (baseCurrency !== targetCurrency) {
            const rate = rates[targetCurrency];

            if (rate) {
              await this.saveExchangeRate(baseCurrency, targetCurrency, rate);
            }
          }
        }
      }

      this.logger.log('Exchange rates updated successfully');
    } catch (error) {
      this.logger.error(`Failed to update exchange rates: ${error.message}`);
    }
  }

  // Fetch exchange rates from external API
  private async fetchExternalRates(
    baseCurrency: string,
    toCurrency?: string, //if provided then pair api url will be used 
  ): Promise<Record<string, number> | number> {
    try {
      // Using My Exchange Rate API key from config
      const apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');
      const baseUrl = `https://v6.exchangerate-api.com/v6/${apiKey}`;
      const url = `${baseUrl}${toCurrency ? `/pair/${baseCurrency}/${toCurrency}` : `/latest/${baseCurrency}`}`;

      this.logger.log(`Fetching rates from ${url}...`);

      const response = await lastValueFrom(this.httpService.get(url));
      const data = response.data;

      // Check if the API response is valid
      if (!data) {
        throw new Error('Unable to fetch rates from external API');
      }

      if (data.result === 'success') {
        if(data.conversion_rate){ //for pairing
          return data.conversion_rate;
        }
        else return data.conversion_rates;
      }
      throw new Error(`Error fetching external rates: ${data['error-type']}`);
    } catch (error) {
      this.logger.error(error);
      throw error;
      //  the following lines can be uncommented to implement a fallback mechanism

      // // Fallback to database rates if available
      // const fallbackRates: Record<string, number> = {};

      // for (const currency of this.supportedCurrencies) {
      //   if (currency !== baseCurrency) {
      //     const savedRate = await this.exchangeRateRepository.findOne({
      //       where: { baseCurrency, targetCurrency: currency },
      //     });

      //     if (savedRate) {
      //       fallbackRates[currency] = Number(savedRate.rate);
      //     }
      //   }
      // }

      // if (Object.keys(fallbackRates).length > 0) {
      //   this.logger.log('Using fallback rates from database');
      //   return fallbackRates;
      // }

      // // If no fallback rates available, use my default values //NORMALLY THIS WILL BE FALLBACK SET BY ADMIN
      // //AT SOME INTERVAL TOO BUT MOSTLY NEVER USED AND ALSO ADDED FOR DEMO PURPOSES
      // // This is a simple static fallback, in a real-world scenario, we might want to fetch these from a reliable source
      // const defaultRates: Record<string, Record<string, number>> = {
      //   USD: { NGN: 750, EUR: 0.85, GBP: 0.75 },
      //   EUR: { NGN: 880, USD: 1.18, GBP: 0.88 },
      //   GBP: { NGN: 1000, USD: 1.33, EUR: 1.14 },
      //   NGN: { USD: 0.00133, EUR: 0.00114, GBP: 0.001 },
      // };

      // this.logger.warn('Using default rates as fallback');
      // return defaultRates[baseCurrency] || {};
    }
  }

  private async saveExchangeRate(
    baseCurrency: string,
    targetCurrency: string,
    rate: number,
  ): Promise<void> {
    let exchangeRate = await this.exchangeRateRepository.findOne({
      where: { baseCurrency, targetCurrency },
    });

    if (exchangeRate) {
      // Update existing rate
      exchangeRate.rate = rate;
    } else {
      // Create new rate
      exchangeRate = this.exchangeRateRepository.create({
        baseCurrency,
        targetCurrency,
        rate,
      });
    }

    await this.exchangeRateRepository.save(exchangeRate);
  }

  /** Get exchange rate between two currencies */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    console.log({ fromCurrency, toCurrency });
    // Validate currencies
    if (
      !this.supportedCurrencies.includes(fromCurrency) ||
      !this.supportedCurrencies.includes(toCurrency)
    ) {
      // throw new BadRequestException('Unsupported currency');
    }

    // If same currency, rate is 1
    if (fromCurrency === toCurrency) {
      return 1;
    }
    // Try to get rate from cache first
    if (this.cachedRates[fromCurrency]?.[toCurrency]) {
      return this.cachedRates[fromCurrency][toCurrency];
    }

    // If not in cache, get from database
    const exchangeRate = await this.exchangeRateRepository.findOne({
      where: { baseCurrency: fromCurrency, targetCurrency: toCurrency },
    });

    if (exchangeRate) {
      return Number(exchangeRate.rate); //though it should be number already
    }

    //if not found try reverse rate and invert
    const reverseRate = await this.exchangeRateRepository.findOne({
      where: { baseCurrency: toCurrency, targetCurrency: fromCurrency },
    });

    if (reverseRate) {
      return 1 / Number(reverseRate.rate);
    }

    // If still not found, try to calculate via USD manually(final internal fallback)
    if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
      const fromToUSD = await this.getExchangeRate(fromCurrency, 'USD'); //calling this function again to get the rate from the base currency to USD
      const usdToTarget = await this.getExchangeRate('USD', toCurrency);

      return fromToUSD * usdToTarget;
    }
    // If all fails, fetch fresh rates which will update the cache and database ensuring the next call will have the latest rates
    await this.updateExchangeRates({ fromCurrency, toCurrency });

    // Try again after update as we always fetched from cache
    if (this.cachedRates[fromCurrency]?.[toCurrency]) {
      return this.cachedRates[fromCurrency][toCurrency];
    }

    throw new NotFoundException(
      `Could not determine exchange rate from ${fromCurrency} to ${toCurrency} at the moment`,
    );
  }

  async getSupportedCurrencies(): Promise<string[]> {
    return this.supportedCurrencies;
  }

  async getAllRates(): Promise<Record<string, Record<string, number>>> {
    const allRates: Record<string, Record<string, number>> = {};

    for (const baseCurrency of this.supportedCurrencies) {
      allRates[baseCurrency] = {};

      for (const targetCurrency of this.supportedCurrencies) {
        if (baseCurrency !== targetCurrency) {
          allRates[baseCurrency][targetCurrency] = await this.getExchangeRate(
            baseCurrency,
            targetCurrency,
          );
        }
      }
    }

    return allRates;
  }

  //function that can be used to add new supported currency
  async addSupportedCurrency(newCurrency: string): Promise<string[]> {
  //check if the currency has not been added
  const existingCurrencies = this.supportedCurrencies;
  if(existingCurrencies.includes(newCurrency)){
    throw new ConflictException(`currency ${newCurrency} already exist`)
  }
  
  //add the new currency
  this.supportedCurrencies.push(newCurrency);
    return this.supportedCurrencies
  }
}
