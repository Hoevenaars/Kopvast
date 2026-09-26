import { render } from "react-email";
import {
  AcquisitionOutreachEmail,
  assertRenderableAcquisitionEmail,
  assertUniqueAcquisitionCopy,
  visibleEmailTextFromHtml,
  type AcquisitionOutreachEmailProps,
} from "@/emails/acquisition-outreach";
import { AcquisitionFollowUpEmail } from "@/emails/acquisition-follow-up";
import { AcquisitionUnreachableEmail } from "@/emails/acquisition-unreachable";
import { followUpPlainText } from "@/lib/acquisition/follow-up-copy";
import { isUnreachableSiteMail } from "@/lib/acquisition/unreachable-site-mail";
import { isStructuredAcquisitionBody } from "@/lib/mail-body";

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

  const body = props.body?.trim() ?? "";
  if (body && !isStructuredAcquisitionBody(body)) {
    const prepared = await prepareFollowUpEmail({
      subject: props.subject,
      body,
      choiceAUrl: props.choiceAUrl,
      choiceBUrl: props.choiceBUrl,
    });
    return {
      emailProps: props,
      html: prepared.html,
      text: prepared.text,
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

export async function prepareFollowUpEmail(input: {
  subject?: string;
  body: string;
  choiceAUrl?: string | null;
  choiceBUrl?: string | null;
}) {
  const text = followUpPlainText(input.body, input.choiceAUrl, input.choiceBUrl);
  assertUniqueAcquisitionCopy(text);
  const html = await render(
    <AcquisitionFollowUpEmail
      subject={input.subject}
      body={input.body}
      choiceAUrl={input.choiceAUrl}
      choiceBUrl={input.choiceBUrl}
    />
  );
  assertUniqueAcquisitionCopy(visibleEmailTextFromHtml(html));
  return { html, text };
}

export async function renderOutreachHtml(props: AcquisitionOutreachEmailProps) {
  const prepared = await prepareAcquisitionEmail(props);
  return prepared.html;
}

export async function renderOutreachText(props: AcquisitionOutreachEmailProps) {
  return (await prepareAcquisitionEmail(props)).text;
}
