export function splitMailParagraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isStructuredAcquisitionBody(body: string) {
  return /Twee dingen vielen direct op/i.test(body) || /Ik kwam .+ tegen en heb de website kort bekeken/i.test(body);
}

export function sanitizeAcquisitionSearch(q: string) {
  return q
    .trim()
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
