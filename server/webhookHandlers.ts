// stripe-replit-sync has been removed — webhook processing is handled directly
// in the route handlers in server/routes.ts using stripe.webhooks.constructEvent().
export class WebhookHandlers {
  static async processWebhook(_payload: Buffer, _signature: string): Promise<void> {
    throw new Error('Use the route-level webhook handlers in server/routes.ts instead of WebhookHandlers.processWebhook.');
  }
}
