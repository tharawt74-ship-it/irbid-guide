export function getWhatsAppUrl(phone: string, messageText: string): string {
  if (!phone) return '#';
  // Remove all non-numeric characters
  const clean = phone.replace(/[^0-9]/g, '');
  let formatted = clean;
  
  if (formatted.startsWith('07')) {
    formatted = '962' + formatted.slice(1);
  } else if (!formatted.startsWith('962') && formatted.length === 9) {
    formatted = '962' + formatted;
  }

  return `https://wa.me/${formatted}?text=${encodeURIComponent(messageText)}`;
}

export function formatBusinessWhatsAppMessage(businessName: string): string {
  return `السلام عليكم، متواصل معكم عبر منصة "شو في بإربد"، أود الاستفسار عن محلكُم (${businessName}).`;
}

export function formatMenuItemWhatsAppMessage(businessName: string, itemName: string, price: string): string {
  return `السلام عليكم، أود الطلب من المنيو الرقمي لـ (${businessName}) عبر منصة "شو في بإربد":\n- ${itemName} (السعر: ${price})\nالرجاء تأكيد الطلب والتوصيل.`;
}

export function formatJobWhatsAppMessage(jobTitle: string, companyName: string): string {
  return `السلام عليكم، أود التقديم على شاغر (${jobTitle}) لدى (${companyName}) المعلن عنه عبر منصة "شو في بإربد".`;
}

export function formatOfferWhatsAppMessage(offerTitle: string, businessName?: string): string {
  const storeText = businessName ? ` لدى (${businessName})` : '';
  return `السلام عليكم، أود الاستفسار عن عرض (${offerTitle})${storeText} المعلن عنه في منصة "شو في بإربد".`;
}
