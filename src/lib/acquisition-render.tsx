import { render } from "react-email";
import {
  AcquisitionOutreachEmail,
  assertRenderableAcquisitionEmail,
  assertUniqueAcquisitionCopy,
  visibleEmailTextFromHtml,
  type AcquisitionOutreachEmailProps,
} from "@/emails/acquisition-outreach";
import { AcquisitionUnreachableEmail } from "@/emails/acquisition-unreachable";
import { isUnreachableSiteMail } from "@/lib/acquisition/unreachable-site-mail";

export async function prepareAcquisitionEmail(props: AcquisitionOutreachEmailProps) {
  if (isUnreachableSiteMail(props.body)) {
    const body = props.body?.trim() || "";
    const html = await render(
      <AcquisitionUnreachableEmail domain={props.domain} subject={props.subject} body={body} />
    );
    assertUniqueAcquisitionCopy(visibleEmailTextFromHtml(html));
    assertUniqueAcquisitionCopy(body);
    return {
      emailProps: props,
      html,
      text: body,
    };
  }

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
