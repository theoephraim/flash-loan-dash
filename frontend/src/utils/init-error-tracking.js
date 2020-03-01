/**
 * ERROR TRACKING (sentry.io)
 * https://docs.sentry.io/error-reporting/quickstart
 */
import Vue from 'vue';
import * as Sentry from '@sentry/browser';
import { Vue as SentryVueIntegration } from '@sentry/integrations';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [new SentryVueIntegration({ Vue, attachProps: true })],
  });
}
