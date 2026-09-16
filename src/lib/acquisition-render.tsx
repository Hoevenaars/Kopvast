import { render } from "react-email";
import {
  AcquisitionOutreachEmail,
  assertRenderableAcquisitionEmail,
  assertUniqueAcquisitionCopy,
  visibleEmailTextFromHtml,
  type AcquisitionOutreachEmailProps,
} from "@/emails/acquisition-outreach";

export async function prepareAcquisitionEmail(props: AcquisitionOutreachEmailProps) {
  const prepared = assertRenderableAcquisitionEmail(props);
  const html = await render(<AcquisitionOutreachEmail {...prepared.emailProps} />);
  assertUniqueAcquisitionCopy(visibleEmailTextFromHtml(html));
  return {
    emailProps: prepared.emailProps,
    html,
    text: prepared.plainText,
  };
}

export async function renderOutreachHtml(props: AcquisitionOutreachEmailProps) {
  const prepared = await prepareAcquisitionEmail(props);
  return prepared.html;
}

export async function renderOutreachText(props: AcquisitionOutreachEmailProps) {
  return (await prepareAcquisitionEmail(props)).text;
}
