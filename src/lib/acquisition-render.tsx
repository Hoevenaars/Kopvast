import { render } from "react-email";
import {
  AcquisitionOutreachEmail,
  buildAcquisitionPlainText,
  type AcquisitionOutreachEmailProps,
} from "@/emails/acquisition-outreach";

export async function renderOutreachHtml(props: AcquisitionOutreachEmailProps) {
  return render(<AcquisitionOutreachEmail {...props} />);
}

export async function renderOutreachText(props: AcquisitionOutreachEmailProps) {
  if (props.body?.trim() && !props.openingObservation) {
    return props.body.trim();
  }
  return buildAcquisitionPlainText(props);
}
