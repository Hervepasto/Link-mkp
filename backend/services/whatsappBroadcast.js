const GRAPH_API_BASE = 'https://graph.facebook.com';

const normalizePhoneNumber = (raw = '') => {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('00') ? digits.slice(2) : digits;
};

const getPostLabel = (postType = 'product') => {
  if (postType === 'announcement') return 'une annonce';
  if (postType === 'need') return 'un besoin';
  return 'un produit';
};

const buildMessageText = ({ authorName, postType, productName, shareUrl }) => {
  const label = getPostLabel(postType);
  return `${authorName} a poste ${label} sur Link.\n${productName}\n${shareUrl}`;
};

const buildTemplatePayload = ({ to, templateName, templateLanguage, authorName, postType, productName, shareUrl }) => ({
  messaging_product: 'whatsapp',
  to,
  type: 'template',
  template: {
    name: templateName,
    language: { code: templateLanguage },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: authorName },
          { type: 'text', text: getPostLabel(postType) },
          { type: 'text', text: productName },
          { type: 'text', text: shareUrl }
        ]
      }
    ]
  }
});

const buildTextPayload = ({ to, authorName, postType, productName, shareUrl }) => ({
  messaging_product: 'whatsapp',
  to,
  type: 'text',
  text: {
    preview_url: true,
    body: buildMessageText({ authorName, postType, productName, shareUrl })
  }
});

const sendWhatsAppPayload = async ({ token, phoneNumberId, apiVersion, payload }) => {
  const response = await fetch(`${GRAPH_API_BASE}/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`);
  }
};

export const broadcastPostCreated = async ({ recipients, authorName, postType, productName, shareUrl }) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { sent: 0, skipped: recipients.length, reason: 'missing_config' };
  }

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'fr';
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const to = normalizePhoneNumber(recipient);
    if (!to) {
      failed += 1;
      continue;
    }

    try {
      const payload = templateName
        ? buildTemplatePayload({ to, templateName, templateLanguage, authorName, postType, productName, shareUrl })
        : buildTextPayload({ to, authorName, postType, productName, shareUrl });
      await sendWhatsAppPayload({ token, phoneNumberId, apiVersion, payload });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`WhatsApp broadcast failed for ${to}:`, error.message);
    }
  }

  return { sent, failed };
};

