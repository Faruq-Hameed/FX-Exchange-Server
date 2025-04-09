import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  Logger,
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
  private supportedCurrencies = ['NGN', 'USD', 'EUR', 'GBP'];
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

  @Cron(CronExpression.EVERY_HOUR)
  async updateExchangeRates() {
    try {
      this.logger.log('Updating exchange rates...');

      // For each supported base currency, fetch rates for all other currencies
      for (const baseCurrency of this.supportedCurrencies) {
        const rates = await this.fetchExternalRates(baseCurrency);

        // Cache rates
        this.cachedRates[baseCurrency] = rates;

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

  private async fetchExternalRates(
    baseCurrency: string,
  ): Promise<Record<string, number>> {
    try {
      // Using My Exchange Rate API key from config
      const apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');
      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`;

      const response = await lastValueFrom(this.httpService.get(url));
      const data = response.data;

      if (data.result === 'success') {
        return data.conversion_rates;
      }

      throw new Error('Failed to fetch exchange rates from external API');
    } catch (error) {
      this.logger.error(`Error fetching external rates: ${error.message}`);

      // Fallback to database rates if available
      const fallbackRates: Record<string, number> = {};

      for (const currency of this.supportedCurrencies) {
        if (currency !== baseCurrency) {
          const savedRate = await this.exchangeRateRepository.findOne({
            where: { baseCurrency, targetCurrency: currency },
          });

          if (savedRate) {
            fallbackRates[currency] = Number(savedRate.rate);
          }
        }
      }

      if (Object.keys(fallbackRates).length > 0) {
        this.logger.log('Using fallback rates from database');
        return fallbackRates;
      }

      // If no fallback rates available, use some default values (just for demonstration)
      const defaultRates: Record<string, Record<string, number>> = {
        USD: { NGN: 750, EUR: 0.85, GBP: 0.75 },
        EUR: { NGN: 880, USD: 1.18, GBP: 0.88 },
        GBP: { NGN: 1000, USD: 1.33, EUR: 1.14 },
        NGN: { USD: 0.00133, EUR: 0.00114, GBP: 0.001 },
      };

      this.logger.warn('Using default rates as fallback');
      return defaultRates[baseCurrency] || {};
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
      throw new BadRequestException('Unsupported currency');
    }

    // If same currency, rate is 1
    if (fromCurrency === toCurrency) {
      return 1;
    }
    console.log({ cachedRates: this.cachedRates[fromCurrency]?.[toCurrency] });
    // Try to get rate from cache first
    if (this.cachedRates[fromCurrency]?.[toCurrency]) {
      return this.cachedRates[fromCurrency][toCurrency];
    }

    // If not in cache, get from database
    const exchangeRate = await this.exchangeRateRepository.findOne({
      where: { baseCurrency: fromCurrency, targetCurrency: toCurrency },
    });

    if (exchangeRate) {
      return Number(exchangeRate.rate);
    }

    // Try reverse rate and invert
    const reverseRate = await this.exchangeRateRepository.findOne({
      where: { baseCurrency: toCurrency, targetCurrency: fromCurrency },
    });

    if (reverseRate) {
      return 1 / Number(reverseRate.rate);
    }

    // If still not found, try to calculate via USD
    if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
      const fromToUSD = await this.getExchangeRate(fromCurrency, 'USD');
      const usdToTarget = await this.getExchangeRate('USD', toCurrency);

      return fromToUSD * usdToTarget;
    }

    // If all fails, fetch fresh rates
    await this.updateExchangeRates();

    // Try again after update
    if (this.cachedRates[fromCurrency]?.[toCurrency]) {
      return this.cachedRates[fromCurrency][toCurrency];
    }

    throw new BadRequestException(
      `Could not determine exchange rate from ${fromCurrency} to ${toCurrency}`,
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
}
