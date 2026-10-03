This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Invitation Email

Invitation emails are sent server-side through Resend. Set these values in `.env.local` for local development and in your deployment's server environment:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=MindLab <invites@your-verified-domain.com>
```

Verify the sender domain in Resend before sending from it. Keep `RESEND_API_KEY` server-only; do not prefix it with `NEXT_PUBLIC_` or commit it. The invitation email links to the existing `/invite/[token]` acceptance page.

## Paystack Billing

Paid tiers use monthly USD subscriptions. Create two monthly plans in the Paystack dashboard for the live integration: Student at USD 12 and Research at USD 29. Use Paystack test keys and test plan codes in `.env.local`; configure the matching live plan codes and live secret key only in your production deployment:

```env
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_STUDENT_PLAN_CODE=PLN_...
PAYSTACK_RESEARCH_PLAN_CODE=PLN_...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Set `PAYSTACK_SECRET_KEY` to the `sk_live_...` key and `NEXT_PUBLIC_SITE_URL` to your HTTPS production URL in the deployment environment. Use live plan codes with that live key; test plan codes cannot be used for live payments. Local development rejects live Paystack keys to prevent accidental charges. The service-role key and Paystack secret must never use the `NEXT_PUBLIC_` prefix or be committed. Checkout checks each Paystack plan is monthly and matches its advertised USD amount before sending the customer to Paystack.

Apply `supabase/migrations/20261002000000_paywall_mvp.sql` and then `supabase/migrations/20261003000000_paystack_live_billing.sql` to the Supabase project. Configure the Paystack webhook URL as `https://your-domain.example/api/payments/webhook` and subscribe it to `charge.success`, `subscription.create`, `subscription.update`, `subscription.not_renew`, and `subscription.disable` events. Use HTTPS and the same live Paystack integration for the plans, secret key, and webhook.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# MindLab
