import { MercadoPagoConfig, PreApproval, PreApprovalPlan } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000,
  },
});

const getFrontendUrl = () =>
  process.env.FRONTEND_API_URL || "http://localhost:3000";

const preApproval = new PreApproval(client);
const preApprovalPlan = new PreApprovalPlan(client);

export const createPlan = async ({
  title,
  price = 29.9,
  currency = "BRL",
  frequency = 1,
  frequency_type = "months",
}) => {
  try {
    const response = await preApprovalPlan.create({
      body: {
        reason: title,
        auto_recurring: {
          frequency,
          frequency_type,
          transaction_amount: Number(price),
          currency_id: currency,
        },
        back_url: `${getFrontendUrl()}/subscription/return`,
      },
    });
    return response;
  } catch (err) {
    throw new Error(`Falha ao criar plano no MercadoPago: ${err.message}`);
  }
};

export const createSubscription = async ({
  plan,
  userEmail,
  cardTokenId,
  reason,
  status = "pending",
  externalReference,
}) => {
  try {
    const body = {
      payer_email: userEmail,
      status,
      reason: reason || plan?.title,
      external_reference: externalReference,
      back_url: `${getFrontendUrl()}/subscription/return`,
    };

    if (plan?.mpPlanId) {
      body.preapproval_plan_id = plan.mpPlanId;
    }

    if (cardTokenId) {
      body.card_token_id = cardTokenId;
    }

    if (!plan?.mpPlanId) {
      body.auto_recurring = {
        frequency: plan?.frequency || 1,
        frequency_type: plan?.frequency_type || "months",
        transaction_amount: Number(plan?.price) || 0,
        currency_id: plan?.currency || "BRL",
        start_date: new Date().toISOString(),
      };
    }

    const response = await preApproval.create({ body });
    return response;
  } catch (err) {
    throw new Error(`Falha ao criar assinatura no MercadoPago: ${err.message}`);
  }
};

export const getSubscription = async (id) => {
  try {
    const response = await preApproval.get({ id });
    return response;
  } catch (err) {
    throw new Error(
      `Falha ao buscar assinatura no MercadoPago: ${err.message}`
    );
  }
};
