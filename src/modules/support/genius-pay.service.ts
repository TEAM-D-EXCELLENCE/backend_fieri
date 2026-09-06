import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';

export interface CheckoutSessionParams {
  amount: number;
  donorName: string;
  donorEmail: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  checkoutUrl: string;
  reference: string;
}

/**
 * Client de la passerelle de paiement (Genius Pay — Checkout hosted page).
 *
 * Toute la configuration provient de l'environnement afin de ne jamais
 * committer de secrets :
 *  - GENIUS_PAY_API_URL       : base de l'API du processeur
 *  - GENIUS_PAY_API_KEY       : clé secrète serveur (Bearer)
 *  - GENIUS_PAY_WEBHOOK_SECRET: secret partagé pour signer/valider le webhook
 *  - GENIUS_PAY_CURRENCY      : devise ISO (défaut XOF / FCFA)
 */
@Injectable()
export class GeniusPayService {
  private readonly logger = new Logger(GeniusPayService.name);
  private readonly apiUrl = process.env.GENIUS_PAY_API_URL ?? '';
  private readonly apiKey = process.env.GENIUS_PAY_API_KEY ?? '';
  private readonly webhookSecret = process.env.GENIUS_PAY_WEBHOOK_SECRET ?? '';
  private readonly currency = process.env.GENIUS_PAY_CURRENCY ?? 'XOF';

  /**
   * Crée une session de paiement hébergée et renvoie l'URL de redirection
   * ainsi que la référence de session (utilisée pour rapprocher le webhook).
   */
  async createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<CheckoutSession> {
    // Le mode simulation ne s'active QUE sur demande explicite. Auparavant, une
    // clé API absente y basculait automatiquement : en production, un simple
    // oubli de configuration faisait « réussir » des dons jamais encaissés,
    // sans le moindre signal. On refuse désormais ce glissement silencieux.
    if (process.env.GENIUS_PAY_MOCK === 'true') {
      const reference = `MOCK_GP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const offerId = params.metadata?.supportOfferId ?? '';
      const checkoutUrl = `${params.successUrl}&mock_payment=1&offerId=${offerId}&ref=${reference}`;
      this.logger.log(
        `[MOCK Genius Pay] Session fictive créée pour ${params.amount} FCFA (ref=${reference})`,
      );
      return { checkoutUrl, reference };
    }

    // Hors simulation, une passerelle non configurée est une panne, pas un
    // prétexte à simuler : on échoue bruyamment plutôt que d'encaisser du vide.
    if (!this.apiUrl || !this.apiKey || this.apiKey === 'mock') {
      this.logger.error(
        'Passerelle de paiement non configurée (GENIUS_PAY_API_URL/GENIUS_PAY_API_KEY manquants) ' +
          'et mode simulation désactivé — initiation de paiement refusée.',
      );
      throw new InternalServerErrorException(
        'Le paiement en ligne est momentanément indisponible.',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${this.apiUrl}/v1/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: this.currency,
          customer: { name: params.donorName, email: params.donorEmail },
          metadata: params.metadata,
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
        }),
        // Coupe-circuit réseau (10 s) pour éviter de bloquer la requête HTTP.
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      this.logger.error(
        `Passerelle de paiement injoignable : ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        'Passerelle de paiement injoignable. Réessayez plus tard.',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `Genius Pay a répondu ${response.status} : ${body.slice(0, 500)}`,
      );
      throw new InternalServerErrorException(
        "Échec de l'initialisation du paiement.",
      );
    }

    let data: Record<string, any>;
    try {
      data = (await response.json()) as Record<string, any>;
    } catch {
      throw new InternalServerErrorException(
        'Réponse illisible de la passerelle de paiement.',
      );
    }

    const checkoutUrl: unknown =
      data.checkout_url ?? data.checkoutUrl ?? data.url;
    const reference: unknown = data.reference ?? data.id ?? data.session_id;
    if (typeof checkoutUrl !== 'string' || typeof reference !== 'string') {
      this.logger.error(
        `Réponse Genius Pay incomplète : ${JSON.stringify(data).slice(0, 500)}`,
      );
      throw new InternalServerErrorException(
        'Réponse invalide de la passerelle de paiement.',
      );
    }

    return { checkoutUrl, reference };
  }

  /**
   * Valide la signature HMAC-SHA256 d'un webhook à partir du corps BRUT de la
   * requête et du secret partagé. Comparaison en temps constant.
   */
  verifyWebhookSignature(
    rawBody: Buffer | string,
    signatureHeader?: string,
  ): boolean {
    if (process.env.GENIUS_PAY_MOCK === 'true') {
      return true;
    }
    if (!this.webhookSecret) {
      this.logger.error(
        'GENIUS_PAY_WEBHOOK_SECRET manquant — webhook systématiquement rejeté.',
      );
      return false;
    }
    if (!signatureHeader) {
      return false;
    }

    const payload =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    // Certains processeurs préfixent la signature par "sha256=".
    const provided = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7)
      : signatureHeader;

    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const providedBuf = Buffer.from(provided, 'hex');
      if (expectedBuf.length !== providedBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuf, providedBuf);
    } catch {
      return false;
    }
  }
}
